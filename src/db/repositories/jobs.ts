import { scoring } from "@config/scoring";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  ne,
  not,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { classifyArea } from "@/domain/area";
import { ABROAD, ALL_STATUSES, type JobFilters, PAGE_SIZE } from "@/domain/filters";
import type { MergedJob } from "@/domain/job";
import { inferRegion } from "@/domain/region";
import type { ScoreResult } from "@/scoring/score";
import type { Db } from "../client";
import { events, type JobRow, jobs } from "../schema";

export async function findExistingJob(db: Db, job: MergedJob): Promise<JobRow | undefined> {
  const [row] = await db
    .select()
    .from(jobs)
    .where(
      or(
        eq(jobs.dedupeKey, job.dedupeKey),
        and(eq(jobs.source, job.source), eq(jobs.externalId, job.externalId)),
      ),
    )
    .limit(1);
  return row;
}

/** Grava a vaga nova e o evento "criada" na mesma transação. */
export function insertJob(db: Db, job: MergedJob, result: ScoreResult, now: Date): Promise<JobRow> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(jobs)
      .values({
        source: job.source,
        externalId: job.externalId,
        company: job.company,
        title: job.title,
        url: job.url,
        altUrls: job.altUrls,
        location: job.location,
        remote: job.modality === null ? null : job.modality === "remoto",
        modality: job.modality,
        seniority: job.seniority,
        contract: job.contract,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: job.currency,
        description: job.description,
        postedAt: job.postedAt,
        firstSeenAt: now,
        lastSeenAt: now,
        dedupeKey: job.dedupeKey,
        score: result.score,
        scoreBreakdown: result.breakdown,
        area: classifyArea(job.title),
        region: inferRegion(job.location, job.source),
      })
      .returning();
    if (!row) throw new Error(`Falha ao inserir a vaga ${job.source}:${job.externalId}`);
    await tx.insert(events).values({
      jobId: row.id,
      type: "criada",
      payload: { source: job.source, score: result.score },
      createdAt: now,
    });
    return row;
  });
}

/**
 * Vaga já conhecida: registra que ainda está aberta, acumula URLs de outras fontes e
 * atualiza área e região. Com `rescored`, também troca salário, modalidade e score,
 * para correções de extração e de regra chegarem às vagas antigas.
 */
export async function markJobSeen(
  db: Db,
  existing: JobRow,
  job: MergedJob,
  now: Date,
  rescored: ScoreResult | null = null,
): Promise<void> {
  const urls = [job.url, ...job.altUrls].filter(
    (url) => url !== existing.url && !existing.altUrls.includes(url),
  );
  const refreshed = rescored
    ? {
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: job.currency,
        modality: job.modality,
        remote: job.modality === null ? null : job.modality === "remoto",
        location: job.location,
        score: rescored.score,
        scoreBreakdown: rescored.breakdown,
      }
    : {};
  await db
    .update(jobs)
    .set({
      lastSeenAt: now,
      altUrls: [...existing.altUrls, ...urls],
      area: classifyArea(job.title),
      region: inferRegion(job.location, job.source),
      ...refreshed,
    })
    .where(eq(jobs.id, existing.id));
}

export type JobListItem = Pick<
  JobRow,
  | "id"
  | "source"
  | "company"
  | "title"
  | "location"
  | "modality"
  | "seniority"
  | "contract"
  | "salaryMin"
  | "salaryMax"
  | "currency"
  | "postedAt"
  | "firstSeenAt"
  | "score"
  | "status"
  | "altUrls"
  | "region"
  | "url"
>;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function filterConditions(filters: JobFilters): SQL[] {
  const conditions: SQL[] = [];
  // Vagas fora de tecnologia não aparecem; sem área definida (null), aparecem.
  const inScope = or(isNull(jobs.area), ne(jobs.area, "fora"));
  if (inScope) conditions.push(inScope);
  if (filters.region === ABROAD) {
    const abroad = and(sql`${jobs.region} is not null`, ne(jobs.region, "brasil"));
    if (abroad) conditions.push(abroad);
  } else if (filters.region) conditions.push(eq(jobs.region, filters.region));
  if (filters.minSalary) {
    // Só vagas em reais com salário divulgado podem ser comparadas; as demais continuam.
    conditions.push(
      not(
        sql`coalesce(${jobs.currency} = 'BRL' and coalesce(${jobs.salaryMax}, ${jobs.salaryMin}) < ${filters.minSalary}, false)`,
      ),
    );
  }
  if (filters.minScore > 0) conditions.push(gte(jobs.score, filters.minScore));
  if (!filters.closed) {
    // Relativo à coleta mais recente: se a coleta parar, a lista não esvazia sozinha.
    conditions.push(
      sql`${jobs.lastSeenAt} >= (select max(j.last_seen_at) from jobs j) - make_interval(days => ${scoring.staleAfterDays})`,
    );
  }
  if (filters.source) conditions.push(eq(jobs.source, filters.source));
  if (filters.modality) conditions.push(eq(jobs.modality, filters.modality));
  if (!filters.status) conditions.push(ne(jobs.status, "descartada"));
  else if (filters.status !== ALL_STATUSES) conditions.push(eq(jobs.status, filters.status));
  if (filters.q) {
    const pattern = `%${escapeLike(filters.q)}%`;
    const search = or(
      ilike(jobs.title, pattern),
      ilike(jobs.company, pattern),
      ilike(jobs.description, pattern),
    );
    if (search) conditions.push(search);
  }
  return conditions;
}

const listColumns = {
  id: jobs.id,
  source: jobs.source,
  company: jobs.company,
  title: jobs.title,
  location: jobs.location,
  modality: jobs.modality,
  seniority: jobs.seniority,
  contract: jobs.contract,
  salaryMin: jobs.salaryMin,
  salaryMax: jobs.salaryMax,
  currency: jobs.currency,
  postedAt: jobs.postedAt,
  firstSeenAt: jobs.firstSeenAt,
  score: jobs.score,
  status: jobs.status,
  altUrls: jobs.altUrls,
  region: jobs.region,
  url: jobs.url,
};

export function listJobs(db: Db, filters: JobFilters): Promise<JobListItem[]> {
  return db
    .select(listColumns)
    .from(jobs)
    .where(and(...filterConditions(filters)))
    .orderBy(
      ...(filters.sort === "recentes"
        ? [desc(jobs.firstSeenAt), desc(jobs.score)]
        : [desc(jobs.score), desc(jobs.firstSeenAt)]),
      desc(jobs.id),
    )
    .limit(PAGE_SIZE)
    .offset((filters.page - 1) * PAGE_SIZE);
}

export async function countJobs(db: Db, filters: JobFilters): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(jobs)
    .where(and(...filterConditions(filters)));
  return row?.total ?? 0;
}

/** Melhores vagas coletadas nas últimas 24 h, para o resumo diário. */
export function listDigestJobs(db: Db, now: Date): Promise<JobListItem[]> {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return db
    .select(listColumns)
    .from(jobs)
    .where(
      and(
        or(isNull(jobs.area), ne(jobs.area, "fora")),
        gte(jobs.score, scoring.digest.minScore),
        gte(jobs.firstSeenAt, since),
        eq(jobs.status, "nova"),
      ),
    )
    .orderBy(desc(jobs.score), desc(jobs.firstSeenAt))
    .limit(scoring.digest.limit);
}

/** Melhores matches recentes, para a faixa de destaque da home (respeita os filtros). */
export function listHighlights(db: Db, filters: JobFilters, now: Date): Promise<JobListItem[]> {
  const since = new Date(now.getTime() - scoring.highlight.maxAgeDays * 24 * 60 * 60 * 1000);
  return db
    .select(listColumns)
    .from(jobs)
    .where(
      and(
        ...filterConditions(filters),
        gte(jobs.score, Math.max(filters.minScore, scoring.highlight.minScore)),
        gte(jobs.firstSeenAt, since),
        inArray(jobs.status, ["nova", "interessante"]),
      ),
    )
    .orderBy(desc(jobs.score), desc(jobs.firstSeenAt))
    .limit(scoring.highlight.limit);
}

/**
 * Sugestão de piso: mediana dos salários mensais em reais divulgados nas vagas de
 * tecnologia. Valores abaixo de R$ 1.000 (bolsas, por hora) não entram.
 */
export async function suggestedSalaryFloor(db: Db): Promise<number | null> {
  const [row] = await db
    .select({
      median: sql<
        string | null
      >`percentile_cont(0.5) within group (order by coalesce(${jobs.salaryMax}, ${jobs.salaryMin}))`,
    })
    .from(jobs)
    .where(
      and(
        eq(jobs.currency, "BRL"),
        gte(jobs.salaryMin, 1000),
        // Teto contra anuais e cifras que escaparam do parser ("R$ 500.000").
        sql`coalesce(${jobs.salaryMax}, ${jobs.salaryMin}) <= 60000`,
        or(isNull(jobs.area), ne(jobs.area, "fora")),
        or(isNull(jobs.region), eq(jobs.region, "brasil")),
      ),
    );
  if (!row?.median) return null;
  // Arredonda para centenas: "R$ 6.437" vira "R$ 6.400".
  return Math.round(Number(row.median) / 100) * 100;
}

export async function getJob(db: Db, id: string): Promise<JobRow | undefined> {
  const [row] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return row;
}

export async function saveJobNotes(db: Db, id: string, notes: string): Promise<void> {
  await db.update(jobs).set({ notes }).where(eq(jobs.id, id));
}
