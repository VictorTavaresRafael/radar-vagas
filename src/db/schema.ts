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
import type { Contract, Currency, Modality, Seniority, SourceId } from "@/domain/job";
import type { JobStatus } from "@/domain/status";
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
  },
  (table) => [
    uniqueIndex("jobs_source_external_id_idx").on(table.source, table.externalId),
    index("jobs_score_idx").on(table.score),
    index("jobs_status_idx").on(table.status),
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

export type JobRow = typeof jobs.$inferSelect;
export type ApplicationRow = typeof applications.$inferSelect;
export type EventRow = typeof events.$inferSelect;
