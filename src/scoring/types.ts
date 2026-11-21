import type { Profile } from "@/domain/profile";
import type { TechName } from "@/domain/tech-catalog";

export type EliminationRule =
  | "linguagem"
  | "senioridade"
  | "ingles"
  | "presencial"
  | "salario"
  | "area";

export interface Elimination {
  readonly rule: EliminationRule;
  readonly reason: string;
}

export type ComponentKey = "stack" | "senioridade" | "modalidade" | "salario" | "recencia";

export interface ScoreComponent {
  readonly key: ComponentKey;
  readonly label: string;
  readonly points: number;
  readonly max: number;
  readonly reason: string;
}

export interface LlmAssessment {
  readonly score: number;
  readonly justification: string;
  readonly model: string;
  readonly weight: number;
}

export interface KeywordReport {
  /** Já aparecem no currículo: nada a fazer. */
  readonly inResume: readonly TechName[];
  /** Constam em `profile.facts`, mas não no currículo: vale escrever. */
  readonly hasNotWritten: readonly TechName[];
  /** Não constam no perfil: não escreva, estude ou ignore. */
  readonly missing: readonly TechName[];
}

/** Gravado em `jobs.score_breakdown` para o painel mostrar o porquê de cada ponto. */
export interface ScoreBreakdown {
  readonly version: 1;
  readonly eliminations: readonly Elimination[];
  readonly components: readonly ScoreComponent[];
  readonly deterministic: number;
  readonly llm: LlmAssessment | null;
  readonly llmError: string | null;
  readonly final: number;
  readonly keywords: KeywordReport;
  readonly scoredAt: string;
}

export interface ScoreContext {
  readonly profile: Profile;
  /** Piso mensal em BRL; null desliga o filtro de salário. */
  readonly salaryFloorBrl: number | null;
  /** Peso do LLM (0–1) na média com o determinístico. */
  readonly llmWeight: number;
  readonly now: Date;
}
