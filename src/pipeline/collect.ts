import { scoring } from "@config/scoring";
import type { Collector } from "@/collectors/types";
import type { Db } from "@/db/client";
import { findExistingJob, insertJob, markJobSeen } from "@/db/repositories/jobs";
import type { MergedJob, NormalizedJob } from "@/domain/job";
import type { LlmClient } from "@/llm/client";
import { scoreJob } from "@/scoring/score";
import type { ScoreContext } from "@/scoring/types";
import { dedupeJobs } from "./dedupe";
import type { AlertJob, Notifier } from "./notify";
import { type TopJob, topJobs } from "./report";

const TOP_LIMIT = 10;

export interface CollectDeps {
  readonly db: Db;
  readonly collectors: readonly Collector<unknown>[];
  readonly scoreContext: ScoreContext;
  readonly llm: LlmClient | null;
  readonly notifier: Notifier | null;
  readonly log: (message: string) => void;
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
    await markJobSeen(db, existing, job, scoreContext.now);
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

async function persistAll(
  deps: CollectDeps,
  jobs: readonly MergedJob[],
): Promise<PersistOutcome[]> {
  const outcomes: PersistOutcome[] = [];
  for (const job of jobs) outcomes.push(await persistJob(deps, job));
  return outcomes;
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
    top: topJobs(insertedJobs, TOP_LIMIT),
  };
}
