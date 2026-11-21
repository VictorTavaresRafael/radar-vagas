import { z } from "zod";
import { MODALITIES, SOURCES } from "./job";
import { REGIONS } from "./region";
import { JOB_STATUSES } from "./status";

export const ALL_STATUSES = "todas";
/** Tudo menos Brasil: o "mundo" do filtro de região. */
export const ABROAD = "exterior";

const firstValue = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);
const emptyToUndefined = (value: unknown): unknown => {
  const first = firstValue(value);
  return first === "" ? undefined : first;
};

/**
 * Filtros da listagem vindos da query string. Valores inválidos viram "sem filtro"
 * em vez de erro, porque a URL é editável à mão.
 */
export const jobFiltersSchema = z.object({
  minScore: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(0).max(100).catch(0).default(0),
  ),
  source: z.preprocess(emptyToUndefined, z.enum(SOURCES).optional().catch(undefined)),
  modality: z.preprocess(emptyToUndefined, z.enum(MODALITIES).optional().catch(undefined)),
  status: z.preprocess(
    emptyToUndefined,
    z
      .enum([...JOB_STATUSES, ALL_STATUSES])
      .optional()
      .catch(undefined),
  ),
  q: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional().catch(undefined)),
  region: z.preprocess(
    emptyToUndefined,
    z
      .enum([...REGIONS, ABROAD])
      .optional()
      .catch(undefined),
  ),
  /** Salário mínimo mensal em reais definido por você; vagas em reais abaixo dele saem. */
  minSalary: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(0).max(1_000_000).optional().catch(undefined),
  ),
  page: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(1000).catch(1).default(1),
  ),
});

/** Vagas por página na listagem. */
export const PAGE_SIZE = 50;

/** Query string dos filtros ativos, para links de paginação que preservam a busca. */
export function filtersToQuery(filters: JobFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.minScore > 0) params.set("minScore", String(filters.minScore));
  if (filters.source) params.set("source", filters.source);
  if (filters.modality) params.set("modality", filters.modality);
  if (filters.status) params.set("status", filters.status);
  if (filters.region) params.set("region", filters.region);
  if (filters.minSalary) params.set("minSalary", String(filters.minSalary));
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export type JobFilters = z.infer<typeof jobFiltersSchema>;

export function parseJobFilters(params: Record<string, string | string[] | undefined>): JobFilters {
  return jobFiltersSchema.parse(params);
}
