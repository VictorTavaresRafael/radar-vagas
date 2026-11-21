import type { RemotiveQuery } from "@config/sources";
import { z } from "zod";
import type { Contract, NormalizedJob } from "@/domain/job";
import { parseDate } from "@/lib/dates";
import { htmlToText } from "@/lib/text";
import { inferSeniority, parseSalary } from "./infer";
import { type Collector, type CollectorDeps, getJson, parseItems } from "./types";

export const remotiveJobSchema = z.object({
  id: z.number(),
  url: z.url(),
  title: z.string().min(1),
  company_name: z.string().min(1),
  job_type: z.string().default(""),
  publication_date: z.string(),
  candidate_required_location: z.string().default(""),
  salary: z.string().default(""),
  description: z.string().default(""),
});

export type RemotiveJob = z.infer<typeof remotiveJobSchema>;

const envelopeSchema = z.object({ jobs: z.array(z.unknown()) });

export function remotiveUrl(query: RemotiveQuery): string {
  const params = new URLSearchParams({ category: query.category, search: query.search });
  return `https://remotive.com/api/remote-jobs?${params.toString()}`;
}

const JOB_TYPE_CONTRACT: Record<string, Contract> = {
  contract: "contractor",
  freelance: "contractor",
};

/** A Remotive publica datas sem fuso ("2026-11-19T10:21:43"); a documentação usa UTC. */
function parseRemotiveDate(value: string): Date | null {
  return parseDate(/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`);
}

export function normalizeRemotiveJob(raw: RemotiveJob): NormalizedJob {
  const salary = parseSalary(raw.salary);
  return {
    source: "remotive",
    externalId: String(raw.id),
    company: raw.company_name.trim(),
    title: raw.title.trim(),
    // Termo de uso da Remotive: sempre apontar para a página original da vaga.
    url: raw.url,
    location: raw.candidate_required_location.trim() || null,
    modality: "remoto",
    seniority: inferSeniority(raw.title),
    contract: JOB_TYPE_CONTRACT[raw.job_type] ?? null,
    salaryMin: salary?.min ?? null,
    salaryMax: salary?.max ?? null,
    currency: salary?.currency ?? null,
    description: htmlToText(raw.description),
    postedAt: parseRemotiveDate(raw.publication_date),
  };
}

export function createRemotiveCollector(
  query: RemotiveQuery,
  deps: CollectorDeps,
): Collector<RemotiveJob> {
  const id = `remotive:${query.category}:${query.search}`;
  return {
    id,
    source: "remotive",
    async fetchJobs() {
      const body = envelopeSchema.parse(await getJson(deps.fetch, remotiveUrl(query)));
      return parseItems(body.jobs, remotiveJobSchema, id, deps.warn);
    },
    normalize: normalizeRemotiveJob,
  };
}
