import { and, count, countDistinct, gte, inArray, or, sql } from "drizzle-orm";
import {
  buildFunnel,
  type DayCount,
  type FunnelStep,
  fillDays,
  responseRate,
} from "@/domain/metrics";
import type { JobStatus } from "@/domain/status";
import type { Db } from "../client";
import { applications, events, jobs } from "../schema";

export interface SearchMetrics {
  readonly newJobsPerDay: DayCount[];
  readonly funnel: FunnelStep[];
  readonly applications: number;
  readonly responded: number;
  readonly responseRate: number | null;
}

async function newJobsPerDay(db: Db, now: Date, days: number): Promise<DayCount[]> {
  const since = new Date(now.getTime() - days * 86_400_000);
  const day = sql<string>`to_char(${jobs.firstSeenAt} at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')`;
  const rows = await db
    .select({ day, count: count() })
    .from(jobs)
    .where(gte(jobs.firstSeenAt, since))
    .groupBy(day);
  return fillDays(rows, now, days);
}

/** Vagas que já passaram por algum destes status: o atual ou qualquer evento de troca. */
async function reached(db: Db, statuses: readonly JobStatus[]): Promise<number> {
  const viaEvents = db
    .select({ jobId: events.jobId })
    .from(events)
    .where(
      and(sql`${events.type} = 'status'`, inArray(sql`${events.payload}->>'to'`, [...statuses])),
    );
  const [row] = await db
    .select({ total: countDistinct(jobs.id) })
    .from(jobs)
    .where(or(inArray(jobs.status, [...statuses]), inArray(jobs.id, viaEvents)));
  return row?.total ?? 0;
}

async function total(db: Db): Promise<number> {
  const [row] = await db.select({ total: count() }).from(jobs);
  return row?.total ?? 0;
}

async function applicationCount(db: Db): Promise<number> {
  // A candidatura nasce ao chegar em "candidatado" e nunca é apagada, então ela é o registro do funil.
  const [row] = await db.select({ total: count() }).from(applications);
  return row?.total ?? 0;
}

export async function getSearchMetrics(db: Db, now: Date, days = 30): Promise<SearchMetrics> {
  // Em sequência de propósito: na Vercel há uma conexão só, pelo pooler de transações do
  // Supabase, e consultas simultâneas nela travavam a página até o timeout de 300 s.
  const perDay = await newJobsPerDay(db, now, days);
  const nova = await total(db);
  const candidatado = await applicationCount(db);
  const entrevista = await reached(db, ["entrevista", "oferta"]);
  const oferta = await reached(db, ["oferta"]);
  const responded = await reached(db, ["entrevista", "oferta", "recusado"]);
  return {
    newJobsPerDay: perDay,
    funnel: buildFunnel({ nova, candidatado, entrevista, oferta }),
    applications: candidatado,
    responded,
    responseRate: responseRate(candidatado, responded),
  };
}
