CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"channel" text DEFAULT '' NOT NULL,
	"status" text NOT NULL,
	"next_step" text DEFAULT '' NOT NULL,
	"next_step_at" timestamp with time zone,
	"notes" text DEFAULT '' NOT NULL,
	CONSTRAINT "applications_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"company" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"alt_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"location" text,
	"remote" boolean,
	"modality" text,
	"seniority" text,
	"contract" text,
	"salary_min" integer,
	"salary_max" integer,
	"currency" text,
	"description" text NOT NULL,
	"posted_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dedupe_key" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"score_breakdown" jsonb NOT NULL,
	"status" text DEFAULT 'nova' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	CONSTRAINT "jobs_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_job_id_idx" ON "events" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_source_external_id_idx" ON "jobs" USING btree ("source","external_id");--> statement-breakpoint
CREATE INDEX "jobs_score_idx" ON "jobs" USING btree ("score");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");