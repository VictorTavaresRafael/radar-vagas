import type { NormalizedJob } from "@/domain/job";
import type { LlmClient } from "@/llm/client";
import { deterministicComponents, sumComponents } from "./deterministic";
import { findEliminations } from "./filters";
import { analyzeKeywords } from "./keywords";
import { assessWithLlm } from "./llm-assessment";
import type { LlmAssessment, ScoreBreakdown, ScoreContext } from "./types";

export interface ScoreResult {
  readonly score: number;
  readonly breakdown: ScoreBreakdown;
}

interface LlmOutcome {
  readonly assessment: LlmAssessment | null;
  readonly error: string | null;
}

async function runLlm(
  llm: LlmClient | null,
  job: NormalizedJob,
  context: ScoreContext,
): Promise<LlmOutcome> {
  if (!llm) return { assessment: null, error: null };
  try {
    const output = await assessWithLlm(llm, job, context.profile);
    return {
      assessment: {
        score: output.nota,
        justification: output.justificativa,
        model: llm.model,
        weight: context.llmWeight,
      },
      error: null,
    };
  } catch (error) {
    // Falha do LLM nunca derruba a coleta: o score determinístico continua valendo.
    return { assessment: null, error: error instanceof Error ? error.message : String(error) };
  }
}

export function combineScores(deterministic: number, llm: LlmAssessment | null): number {
  if (!llm) return deterministic;
  return Math.round(deterministic * (1 - llm.weight) + llm.score * llm.weight);
}

/** Score 0–100 com explicação. Vagas eliminadas não consomem chamada de LLM. */
export async function scoreJob(
  job: NormalizedJob,
  context: ScoreContext,
  llm: LlmClient | null,
): Promise<ScoreResult> {
  const eliminations = findEliminations(job, context);
  const components = deterministicComponents(job, context);
  const deterministic = sumComponents(components);
  const { assessment, error } =
    eliminations.length > 0 ? { assessment: null, error: null } : await runLlm(llm, job, context);
  const final = eliminations.length > 0 ? 0 : combineScores(deterministic, assessment);
  const breakdown: ScoreBreakdown = {
    version: 1,
    eliminations,
    components,
    deterministic,
    llm: assessment,
    llmError: error,
    final,
    keywords: analyzeKeywords(`${job.title}\n${job.description}`, context.profile),
    scoredAt: context.now.toISOString(),
  };
  return { score: final, breakdown };
}
