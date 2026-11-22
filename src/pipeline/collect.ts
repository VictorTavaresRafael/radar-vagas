import { scoring } from "@config/scoring";
import type { IssueState } from "@/collectors/github-issues";
import type { Collector } from "@/collectors/types";
import type { Db } from "@/db/client";
import {
  closeMissingJobs,
  findExistingJob,
  insertJob,
  listUnseenGithubJobs,
  markJobClosed,
  markJobSeen,
} from "@/db/repositories/jobs";
import type { MergedJob, NormalizedJob } from "@/domain/job";
import { mapWithConcurrency } from "@/lib/concurrency";
import type { LlmClient } from "@/llm/client";
import { scoreJob } from "@/scoring/score";
import type { ScoreContext } from "@/scoring/types";
import { dedupeJobs } from "./dedupe";
import type { AlertJob, Notifier } from "./notify";
import { type TopJob, topJobs } from "./report";

// Igual ao número de conexões do cliente Postgres: mais que isso só enfileiraria no pool.
const PERSIST_CONCURRENCY = 5;
const TOP_LIMIT = 10;
// Uma chamada à API por vaga; o limite mantém a coleta dentro da cota do GitHub.
const GITHUB_STATE_CHECKS = 40;

export interface CollectDeps {
  readonly db: Db;
  readonly collectors: readonly Collector<unknown>[];
  readonly scoreContext: ScoreContext;
  readonly llm: LlmClient | null;
  readonly notifier: Notifier | null;
  readonly log: (message: string) => void;
  /** Consulta o estado de uma issue do GitHub; sem ela, vagas do GitHub só caducam pelo prazo. */
  readonly issueState?: (url: string) => Promise<IssueState | null>;
}

export interface CollectorResult {
  readonly id: string;
  readonly fetched: number;
  readonly error: string | null;
}

export interface CollectReport {
  readonly collectors: readonly CollectorResult[];
  readonly normalized: number;
  readonly unique: number;
  readonly inserted: number;
  readonly updated: number;
  readonly alerts: readonly AlertJob[];
  /** Vagas marcadas como encerradas nesta coleta. */
  readonly closed: number;
  /** Vagas novas de maior score nesta coleta, para o log. */
  readonly top: readonly TopJob[];
}

/** `fetch failed` sozinho não diz nada; a causa (DNS, TLS, recusa) vem em `error.cause`. */
function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return error.cause instanceof Error ? `${error.message} (${error.cause.message})` : error.message;
}

/** Uma fonte fora do ar não pode impedir as outras de serem gravadas. */
async function runCollector(
  collector: Collector<unknown>,
): Promise<{ result: CollectorResult; jobs: NormalizedJob[] }> {
  try {
    const raws = await collector.fetchJobs();
    const jobs = raws.map((raw) => collector.normalize(raw));
    return { result: { id: collector.id, fetched: jobs.length, error: null }, jobs };
  } catch (error) {
    return { result: { id: collector.id, fetched: 0, error: errorMessage(error) }, jobs: [] };
  }
}

interface PersistOutcome {
  readonly inserted: TopJob | null;
  readonly alert: AlertJob | null;
}

async function persistJob(deps: CollectDeps, job: MergedJob): Promise<PersistOutcome> {
  const { db, scoreContext } = deps;
  const existing = await findExistingJob(db, job);
  if (existing) {
    // Sem avaliação de LLM gravada, recalcular é barato e leva correções às vagas antigas.
    // Com LLM, o score fica como está para não repetir a chamada.
    const rescored = existing.scoreBreakdown.llm ? null : await scoreJob(job, scoreContext, null);
    await markJobSeen(db, existing, job, scoreContext.now, rescored);
    return { inserted: null, alert: null };
  }
  // O score é calculado só na primeira vez que a vaga aparece, para não repetir chamadas de LLM.
  const result = await scoreJob(job, scoreContext, deps.llm);
  const row = await insertJob(db, job, result, scoreContext.now);
  const alert =
    result.score >= scoring.alertMinScore
      ? { title: row.title, company: row.company, score: row.score, url: row.url }
      : null;
  const inserted = {
    score: row.score,
    title: row.title,
    company: row.company,
    url: row.url,
    breakdown: result.breakdown,
  };
  return { inserted, alert };
}

/**
 * Grava em paralelo, exceto vagas que repetem fonte + id externo: essas vão depois,
 * em sequência, para a segunda encontrar a primeira já gravada em vez de violar o índice único.
 */
async function persistAll(
  deps: CollectDeps,
  jobs: readonly MergedJob[],
): Promise<PersistOutcome[]> {
  const seen = new Set<string>();
  const first: MergedJob[] = [];
  const repeated: MergedJob[] = [];
  for (const job of jobs) {
    const key = `${job.source}:${job.externalId}`;
    (seen.has(key) ? repeated : first).push(job);
    seen.add(key);
  }
  const outcomes = await mapWithConcurrency(first, PERSIST_CONCURRENCY, (job) =>
    persistJob(deps, job),
  );
  for (const job of repeated) outcomes.push(await persistJob(deps, job));
  return outcomes;
}

/**
 * Vaga que saiu da fonte deixa a lista na hora. Só com todas as fontes OK: uma fonte fora do
 * ar faria as vagas dela parecerem encerradas. No GitHub, vale o estado real da issue.
 */
async function closeMissing(
  deps: CollectDeps,
  results: readonly CollectorResult[],
): Promise<number> {
  const { db, scoreContext } = deps;
  const allOk = results.every((result) => result.error === null);
  let closed = allOk ? await closeMissingJobs(db, scoreContext.now) : 0;
  if (deps.issueState) {
    const unseen = await listUnseenGithubJobs(db, scoreContext.now, GITHUB_STATE_CHECKS);
    for (const job of unseen) {
      if ((await deps.issueState(job.url)) === "closed") {
        await markJobClosed(db, job.id, scoreContext.now);
        closed += 1;
      }
    }
  }
  return closed;
}

export async function runCollect(deps: CollectDeps): Promise<CollectReport> {
  const outcomes = await Promise.all(deps.collectors.map(runCollector));
  for (const { result } of outcomes) {
    deps.log(
      result.error ? `✗ ${result.id}: ${result.error}` : `✓ ${result.id}: ${result.fetched} vagas`,
    );
  }
  const normalized = outcomes.flatMap((outcome) => outcome.jobs);
  const unique = dedupeJobs(normalized);

  const persisted = await persistAll(deps, unique);
  const insertedJobs = persisted.flatMap((outcome) => (outcome.inserted ? [outcome.inserted] : []));
  const alerts = persisted.flatMap((outcome) => (outcome.alert ? [outcome.alert] : []));
  const closed = await closeMissing(
    deps,
    outcomes.map((outcome) => outcome.result),
  );

  if (deps.notifier && alerts.length > 0) {
    try {
      await deps.notifier.notify(alerts);
    } catch (error) {
      deps.log(`Alerta não enviado: ${errorMessage(error)}`);
    }
  }

  return {
    collectors: outcomes.map((outcome) => outcome.result),
    normalized: normalized.length,
    unique: unique.length,
    inserted: insertedJobs.length,
    updated: unique.length - insertedJobs.length,
    alerts,
    closed,
    top: topJobs(insertedJobs, TOP_LIMIT),
  };
}
