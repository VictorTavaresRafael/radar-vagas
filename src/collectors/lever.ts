import type { LeverSite } from "@config/sources";
import { z } from "zod";
import type { Modality, NormalizedJob } from "@/domain/job";
import { parseDate } from "@/lib/dates";
import { htmlToText } from "@/lib/text";
import {
  inferContract,
  inferModality,
  inferSeniority,
  parseSalary,
  type SalaryRange,
} from "./infer";
import { type Collector, type CollectorDeps, getJson, parseItems } from "./types";

export const leverPostingSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  hostedUrl: z.url(),
  categories: z
    .object({
      location: z.string().nullish(),
      commitment: z.string().nullish(),
      team: z.string().nullish(),
    })
    .default({}),
  workplaceType: z.string().nullish(),
  descriptionPlain: z.string().default(""),
  lists: z.array(z.object({ text: z.string(), content: z.string() })).default([]),
  additionalPlain: z.string().default(""),
  createdAt: z.number(),
  salaryRange: z
    .object({
      min: z.number(),
      max: z.number(),
      currency: z.string(),
      interval: z.string().nullish(),
    })
    .nullish(),
});

export type LeverPosting = z.infer<typeof leverPostingSchema>;

export function leverUrl(slug: string): string {
  return `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
}

const WORKPLACE: Record<string, Modality> = {
  remote: "remoto",
  hybrid: "hibrido",
  onsite: "presencial",
};

/** As listas (requisitos, diferenciais) vêm em HTML separado do texto principal. */
function leverDescription(raw: LeverPosting): string {
  const lists = raw.lists.map((list) => `${list.text}\n${htmlToText(list.content)}`);
  return [raw.descriptionPlain.trim(), ...lists, raw.additionalPlain.trim()]
    .filter(Boolean)
    .join("\n\n");
}

/** Faixa estruturada do Lever em valor mensal; salário por hora não é comparável e é ignorado. */
function leverSalary(range: LeverPosting["salaryRange"]): SalaryRange | null {
  if (!range || (range.currency !== "BRL" && range.currency !== "USD")) return null;
  const interval = range.interval ?? "";
  if (interval.includes("hour")) return null;
  const divisor = interval.includes("year") ? 12 : 1;
  return {
    min: Math.round(range.min / divisor),
    max: Math.round(range.max / divisor),
    currency: range.currency,
  };
}

export function normalizeLeverPosting(raw: LeverPosting, site: LeverSite): NormalizedJob {
  const description = leverDescription(raw);
  const location = raw.categories.location?.trim() || null;
  const salary = leverSalary(raw.salaryRange) ?? parseSalary(description);
  return {
    source: "lever",
    externalId: raw.id,
    company: site.company,
    title: raw.text.trim(),
    url: raw.hostedUrl,
    location,
    modality:
      WORKPLACE[raw.workplaceType ?? ""] ??
      inferModality(`${raw.text} ${location ?? ""}`, description),
    seniority: inferSeniority(raw.text),
    contract: inferContract(raw.categories.commitment ?? "", raw.text, description),
    salaryMin: salary?.min ?? null,
    salaryMax: salary?.max ?? null,
    currency: salary?.currency ?? null,
    description,
    postedAt: parseDate(raw.createdAt),
  };
}

export function createLeverCollector(
  site: LeverSite,
  deps: CollectorDeps,
): Collector<LeverPosting> {
  const id = `lever:${site.slug}`;
  return {
    id,
    source: "lever",
    async fetchJobs() {
      const body = z.array(z.unknown()).parse(await getJson(deps.fetch, leverUrl(site.slug)));
      return parseItems(body, leverPostingSchema, id, deps.warn);
    },
    normalize: (raw) => normalizeLeverPosting(raw, site),
  };
}
