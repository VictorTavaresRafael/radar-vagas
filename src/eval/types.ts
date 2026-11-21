import type { NormalizedJob } from "@/domain/job";
import type { EliminationRule } from "@/scoring/types";

/**
 * Caso rotulado à mão. O rótulo diz o que uma pessoa com o perfil de `config/profile.ts`
 * decidiria lendo a vaga, não o que o score calcula hoje.
 */
export interface EvalCase {
  readonly id: string;
  /** Por que o caso existe: qual armadilha da heurística ele cobre. */
  readonly note: string;
  readonly job: Partial<NormalizedJob>;
  readonly expected: {
    readonly eliminations: readonly EliminationRule[];
    /** Vale abrir e considerar a candidatura. */
    readonly relevant: boolean;
  };
}

export interface Counts {
  readonly tp: number;
  readonly fp: number;
  readonly fn: number;
}

export interface Metrics extends Counts {
  /** null quando não houve nenhuma previsão positiva. */
  readonly precision: number | null;
  /** null quando não havia nenhum positivo esperado. */
  readonly recall: number | null;
  readonly f1: number | null;
}

export interface CaseResult {
  readonly id: string;
  readonly note: string;
  readonly score: number;
  readonly expectedEliminations: readonly EliminationRule[];
  readonly actualEliminations: readonly EliminationRule[];
  readonly expectedRelevant: boolean;
  readonly actualRelevant: boolean;
}

export interface EvalReport {
  readonly total: number;
  readonly relevantMinScore: number;
  readonly eliminationsByRule: Readonly<Record<EliminationRule, Metrics>>;
  readonly eliminations: Metrics;
  readonly relevance: Metrics;
  readonly failures: readonly CaseResult[];
}
