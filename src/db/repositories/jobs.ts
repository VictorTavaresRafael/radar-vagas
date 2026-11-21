import { and, count, desc, eq, gte, ilike, ne, or, type SQL } from "drizzle-orm";
import { ALL_STATUSES, type JobFilters, PAGE_SIZE } from "@/domain/filters";
import type { MergedJob } from "@/domain/job";
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

/** Vaga já conhecida: só registra que ainda está aberta e acumula URLs de outras fontes. */
export async function markJobSeen(
  db: Db,
  existing: JobRow,
  job: MergedJob,
  now: Date,
): Promise<void> {
  const urls = [job.url, ...job.altUrls].filter(
    (url) => url !== existing.url && !existing.altUrls.includes(url),
  );
  await db
    .update(jobs)
    .set({ lastSeenAt: now, altUrls: [...existing.altUrls, ...urls] })
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
>;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function filterConditions(filters: JobFilters): SQL[] {
  const conditions: SQL[] = [];
  if (filters.minScore > 0) conditions.push(gte(jobs.score, filters.minScore));
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

export function listJobs(db: Db, filters: JobFilters): Promise<JobListItem[]> {
  return db
    .select({
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
    })
    .from(jobs)
    .where(and(...filterConditions(filters)))
    .orderBy(desc(jobs.score), desc(jobs.firstSeenAt), desc(jobs.id))
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

export async function getJob(db: Db, id: string): Promise<JobRow | undefined> {
  const [row] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return row;
}

export async function saveJobNotes(db: Db, id: string, notes: string): Promise<void> {
  await db.update(jobs).set({ notes }).where(eq(jobs.id, id));
}
