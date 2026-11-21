import type { z } from "zod";
import type { NormalizedJob, SourceId } from "@/domain/job";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface CollectorDeps {
  /** Injetado para que os testes rodem com fixtures, sem rede. */
  readonly fetch: FetchLike;
  readonly warn: (message: string) => void;
}

/**
 * Um coletor busca itens crus de uma API pública e sabe convertê-los em vaga normalizada.
 * `normalize` usa sintaxe de método de propósito: assim `Collector<GreenhouseJob>` cabe
 * numa lista de `Collector<unknown>` sem perder o tipo dentro de cada implementação.
 */
export interface Collector<RawJob> {
  readonly id: string;
  readonly source: SourceId;
  fetchJobs(): Promise<RawJob[]>;
  normalize(raw: RawJob): NormalizedJob;
}

export class HttpError extends Error {
  override readonly name = "HttpError";
  constructor(
    readonly url: string,
    readonly status: number,
  ) {
    super(`HTTP ${status} em ${url}`);
  }
}

export async function getJson(
  fetchFn: FetchLike,
  url: string,
  headers: Record<string, string> = {},
): Promise<unknown> {
  const response = await fetchFn(url, { headers: { Accept: "application/json", ...headers } });
  if (!response.ok) throw new HttpError(url, response.status);
  return response.json();
}

/** Valida item a item: um registro fora do formato não derruba a fonte inteira. */
export function parseItems<T>(
  items: readonly unknown[],
  schema: z.ZodType<T>,
  collectorId: string,
  warn: CollectorDeps["warn"],
): T[] {
  const valid: T[] = [];
  items.forEach((item, index) => {
    const result = schema.safeParse(item);
    if (result.success) valid.push(result.data);
    else
      warn(
        `[${collectorId}] item ${index} ignorado: ${result.error.issues[0]?.message ?? "inválido"}`,
      );
  });
  return valid;
}
