ALTER TABLE "jobs" ADD COLUMN "area" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "region" text;--> statement-breakpoint
CREATE INDEX "jobs_region_idx" ON "jobs" USING btree ("region");