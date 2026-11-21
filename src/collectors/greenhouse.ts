import type { GreenhouseBoard } from "@config/sources";
import { z } from "zod";
import type { NormalizedJob } from "@/domain/job";
import { parseDate } from "@/lib/dates";
import { htmlToText } from "@/lib/text";
import { inferContract, inferModality, inferSeniority, parseSalary } from "./infer";
import { type Collector, type CollectorDeps, getJson, parseItems } from "./types";

export const greenhouseJobSchema = z.object({
  id: z.number(),
  title: z.string().min(1),
  absolute_url: z.url(),
  location: z.object({ name: z.string() }).nullish(),
  updated_at: z.string(),
  first_published: z.string().nullish(),
  content: z.string().default(""),
});

export type GreenhouseJob = z.infer<typeof greenhouseJobSchema>;

const envelopeSchema = z.object({ jobs: z.array(z.unknown()) });

export function greenhouseUrl(token: string): string {
  return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`;
}

export function normalizeGreenhouseJob(raw: GreenhouseJob, board: GreenhouseBoard): NormalizedJob {
  const description = htmlToText(raw.content);
  const location = raw.location?.name.trim() || null;
  const salary = parseSalary(description);
  return {
    source: "greenhouse",
    externalId: String(raw.id),
    company: board.company,
    title: raw.title.trim(),
    url: raw.absolute_url,
    location,
    modality: inferModality(`${raw.title} ${location ?? ""}`, description),
    seniority: inferSeniority(raw.title),
    contract: inferContract(raw.title, description),
    salaryMin: salary?.min ?? null,
    salaryMax: salary?.max ?? null,
    currency: salary?.currency ?? null,
    description,
    postedAt: parseDate(raw.first_published ?? raw.updated_at),
  };
}

export function createGreenhouseCollector(
  board: GreenhouseBoard,
  deps: CollectorDeps,
): Collector<GreenhouseJob> {
  const id = `greenhouse:${board.token}`;
  return {
    id,
    source: "greenhouse",
    async fetchJobs() {
      const body = envelopeSchema.parse(await getJson(deps.fetch, greenhouseUrl(board.token)));
      return parseItems(body.jobs, greenhouseJobSchema, id, deps.warn);
    },
    normalize: (raw) => normalizeGreenhouseJob(raw, board),
  };
}
