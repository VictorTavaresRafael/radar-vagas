import { asc, desc, eq, inArray } from "drizzle-orm";
import { isApplicationStatus, type JobStatus } from "@/domain/status";
import type { Db } from "../client";
import { type ApplicationRow, applications, type EventRow, events, jobs } from "../schema";

export class JobNotFoundError extends Error {
  override readonly name = "JobNotFoundError";
}

/**
 * Troca o status da vaga, registra o evento e mantém a candidatura em sincronia:
 * ao chegar em "candidatado" (ou além) a candidatura é criada com a data de hoje.
 */
export async function changeJobStatus(
  db: Db,
  jobId: string,
  status: JobStatus,
  now: Date,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: jobs.status })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);
    if (!current) throw new JobNotFoundError(`Vaga ${jobId} não encontrada.`);
    if (current.status === status) return;

    await tx.update(jobs).set({ status }).where(eq(jobs.id, jobId));
    await tx.insert(events).values({
      jobId,
      type: "status",
      payload: { from: current.status, to: status },
      createdAt: now,
    });

    if (isApplicationStatus(status)) {
      await tx
        .insert(applications)
        .values({ jobId, status, appliedAt: now })
        .onConflictDoUpdate({ target: applications.jobId, set: { status } });
    } else {
      await tx.update(applications).set({ status }).where(eq(applications.jobId, jobId));
    }
  });
}

export interface ApplicationDetails {
  readonly channel: string;
  readonly nextStep: string;
  readonly nextStepAt: Date | null;
  readonly notes: string;
}

export async function saveApplicationDetails(
  db: Db,
  jobId: string,
  details: ApplicationDetails,
): Promise<void> {
  await db.update(applications).set(details).where(eq(applications.jobId, jobId));
}

export async function getApplication(db: Db, jobId: string): Promise<ApplicationRow | undefined> {
  const [row] = await db.select().from(applications).where(eq(applications.jobId, jobId)).limit(1);
  return row;
}

export function listJobEvents(db: Db, jobId: string): Promise<EventRow[]> {
  return db.select().from(events).where(eq(events.jobId, jobId)).orderBy(desc(events.createdAt));
}

export interface KanbanCard {
  readonly jobId: string;
  readonly title: string;
  readonly company: string;
  readonly score: number;
  readonly status: JobStatus;
  readonly appliedAt: Date | null;
  readonly channel: string | null;
  readonly nextStep: string | null;
  readonly nextStepAt: Date | null;
}

export function listKanbanCards(db: Db, statuses: readonly JobStatus[]): Promise<KanbanCard[]> {
  return db
    .select({
      jobId: jobs.id,
      title: jobs.title,
      company: jobs.company,
      score: jobs.score,
      status: jobs.status,
      appliedAt: applications.appliedAt,
      channel: applications.channel,
      nextStep: applications.nextStep,
      nextStepAt: applications.nextStepAt,
    })
    .from(jobs)
    .leftJoin(applications, eq(applications.jobId, jobs.id))
    .where(inArray(jobs.status, [...statuses]))
    .orderBy(asc(applications.nextStepAt), desc(jobs.score));
}
