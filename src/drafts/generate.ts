import { z } from "zod";
import type { Profile } from "@/domain/profile";
import { truncate } from "@/lib/text";
import type { LlmClient } from "@/llm/client";
import { DRAFT_KINDS, type DraftKind, MESSAGE_MAX_LENGTH } from "./kinds";
import { type DraftJob, type DraftTexts, templateDrafts } from "./templates";
import { type Violation, verifyDraft } from "./verify";

export interface Draft {
  readonly kind: DraftKind;
  readonly text: string;
  readonly origin: "llm" | "template";
  /** Preenchido quando o texto do LLM foi reprovado e o template entrou no lugar. */
  readonly rejected: readonly Violation[];
}

export interface DraftSet {
  readonly drafts: readonly Draft[];
  readonly llmError: string | null;
}

export const llmDraftsSchema = z.object({
  resumo: z.string().trim().min(1).max(800),
  mensagem: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
  sobre: z.string().trim().min(1).max(1500),
});

const SYSTEM = `Você escreve rascunhos de candidatura em português do Brasil, em primeira pessoa.
REGRAS INVIOLÁVEIS:
1. Use somente os FATOS listados. Não acrescente tecnologias, empresas, cargos, números, prazos, métricas ou certificações que não estejam escritos neles.
2. Não diga que tem experiência com tecnologias da vaga que não aparecem nos fatos.
3. Pode citar o título da vaga e o nome da empresa contratante.
4. "mensagem" tem no máximo ${MESSAGE_MAX_LENGTH} caracteres.
Responda somente com JSON: {"resumo": "...", "mensagem": "...", "sobre": "..."}.`;

const DESCRIPTION_LIMIT = 4000;

export function buildDraftPrompt(job: DraftJob, profile: Profile): string {
  return [
    "FATOS:",
    ...profile.facts.map((fact) => `- ${fact.text}`),
    `Objetivos de carreira: ${profile.targets.join("; ")}.`,
    "",
    `VAGA: ${job.title} — ${job.company}`,
    truncate(job.description, DESCRIPTION_LIMIT),
    "",
    'Escreva: resumo (topo do CV, até 4 frases), mensagem (recrutador) e sobre (resposta a "fale sobre você", até 6 frases).',
  ].join("\n");
}

function fromTemplates(texts: DraftTexts): Draft[] {
  return DRAFT_KINDS.map((kind) => ({ kind, text: texts[kind], origin: "template", rejected: [] }));
}

/** Cada rascunho do LLM passa pela verificação; o reprovado é trocado pelo template. */
function mergeVerified(
  llmTexts: DraftTexts,
  templates: DraftTexts,
  profile: Profile,
  job: DraftJob,
): Draft[] {
  return DRAFT_KINDS.map((kind) => {
    const violations = verifyDraft(llmTexts[kind], profile, job);
    return violations.length === 0
      ? { kind, text: llmTexts[kind], origin: "llm", rejected: [] }
      : { kind, text: templates[kind], origin: "template", rejected: violations };
  });
}

export async function generateDrafts(
  job: DraftJob,
  profile: Profile,
  llm: LlmClient | null,
): Promise<DraftSet> {
  const templates = templateDrafts(profile, job);
  if (!llm) return { drafts: fromTemplates(templates), llmError: null };
  try {
    const llmTexts = await llm.completeJson({
      system: SYSTEM,
      prompt: buildDraftPrompt(job, profile),
      schema: llmDraftsSchema,
      maxTokens: 1200,
    });
    return { drafts: mergeVerified(llmTexts, templates, profile, job), llmError: null };
  } catch (error) {
    return {
      drafts: fromTemplates(templates),
      llmError: error instanceof Error ? error.message : String(error),
    };
  }
}
