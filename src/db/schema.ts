import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { JobArea } from "@/domain/area";
import type { Contract, Currency, Modality, Seniority, SourceId } from "@/domain/job";
import type { Region } from "@/domain/region";
import type { JobStatus } from "@/domain/status";
import type { DraftKind } from "@/drafts/kinds";
import type { Violation } from "@/drafts/verify";
import type { ScoreBreakdown } from "@/scoring/types";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").$type<SourceId>().notNull(),
    externalId: text("external_id").notNull(),
    company: text("company").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    altUrls: jsonb("alt_urls").$type<string[]>().notNull().default([]),
    location: text("location"),
    remote: boolean("remote"),
    // `remote` sozinho não distingue híbrido de presencial, e o score precisa dessa diferença.
    modality: text("modality").$type<Modality>(),
    seniority: text("seniority").$type<Seniority>(),
    contract: text("contract").$type<Contract>(),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    currency: text("currency").$type<Currency>(),
    description: text("description").notNull(),
    postedAt: timestamptz("posted_at"),
    firstSeenAt: timestamptz("first_seen_at").notNull().defaultNow(),
    lastSeenAt: timestamptz("last_seen_at").notNull().defaultNow(),
    dedupeKey: text("dedupe_key").notNull().unique(),
    score: integer("score").notNull().default(0),
    scoreBreakdown: jsonb("score_breakdown").$type<ScoreBreakdown>().notNull(),
    status: text("status").$type<JobStatus>().notNull().default("nova"),
    notes: text("notes").notNull().default(""),
    // Derivados do título e do local na coleta; vagas antigas são preenchidas na coleta seguinte.
    area: text("area").$type<JobArea>(),
    region: text("region").$type<Region>(),
    // Preenchido quando a coleta confirma que a vaga saiu da fonte; volta a null se reaparecer.
    closedAt: timestamptz("closed_at"),
  },
  (table) => [
    uniqueIndex("jobs_source_external_id_idx").on(table.source, table.externalId),
    index("jobs_score_idx").on(table.score),
    index("jobs_status_idx").on(table.status),
    index("jobs_region_idx").on(table.region),
  ],
);

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .unique()
    .references(() => jobs.id, { onDelete: "cascade" }),
  appliedAt: timestamptz("applied_at").notNull().defaultNow(),
  channel: text("channel").notNull().default(""),
  status: text("status").$type<JobStatus>().notNull(),
  nextStep: text("next_step").notNull().default(""),
  nextStepAt: timestamptz("next_step_at"),
  notes: text("notes").notNull().default(""),
});

export type EventType = "criada" | "status";

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    type: text("type").$type<EventType>().notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [index("events_job_id_idx").on(table.jobId)],
);

/** Histórico dos rascunhos gerados com IA. Cada clique em "Gerar com IA" é uma geração com os três tipos. */
export const drafts = pgTable(
  "drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    generationId: uuid("generation_id").notNull(),
    kind: text("kind").$type<DraftKind>().notNull(),
    // "template" aparece quando o texto da IA foi reprovado e o template entrou no lugar.
    origin: text("origin").$type<"llm" | "template">().notNull(),
    text: text("text").notNull(),
    rejected: jsonb("rejected").$type<Violation[]>().notNull().default([]),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [index("drafts_job_id_created_at_idx").on(table.jobId, table.createdAt)],
);

export type JobRow = typeof jobs.$inferSelect;
export type ApplicationRow = typeof applications.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type DraftRow = typeof drafts.$inferSelect;
