import { z } from "zod";
import { MODALITIES, SOURCES } from "./job";
import { JOB_STATUSES } from "./status";

export const ALL_STATUSES = "todas";

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
});

export type JobFilters = z.infer<typeof jobFiltersSchema>;

export function parseJobFilters(params: Record<string, string | string[] | undefined>): JobFilters {
  return jobFiltersSchema.parse(params);
}
