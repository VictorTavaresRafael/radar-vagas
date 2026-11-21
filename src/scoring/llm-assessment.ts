import { z } from "zod";
import type { NormalizedJob } from "@/domain/job";
import type { Profile } from "@/domain/profile";
import { truncate } from "@/lib/text";
import type { LlmClient } from "@/llm/client";

export const llmAssessmentSchema = z.object({
  nota: z.number().int().min(0).max(100),
  justificativa: z.string().trim().min(1).max(400),
});

export type LlmAssessmentOutput = z.infer<typeof llmAssessmentSchema>;

const SYSTEM = `Você avalia a aderência de uma vaga de emprego a um candidato.
Use APENAS os fatos do perfil fornecido. Não suponha experiências que não estão listadas.
Rubrica fixa (some os pontos):
- 0–40: a stack exigida coincide com a stack comprovada nos fatos.
- 0–25: o nível e as responsabilidades combinam com o cargo atual do candidato.
- 0–20: os requisitos obrigatórios estão todos cobertos pelos fatos.
- 0–15: modalidade, local e idioma são compatíveis com o perfil.
Responda somente com JSON no formato {"nota": inteiro de 0 a 100, "justificativa": "até 2 frases em português"}.`;

const DESCRIPTION_LIMIT = 6000;

export function buildAssessmentPrompt(job: NormalizedJob, profile: Profile): string {
  const facts = profile.facts.map((fact) => `- ${fact.text}`).join("\n");
  return [
    `PERFIL (${profile.headline}; alvos: ${profile.targets.join("; ")}):`,
    facts,
    `Sem experiência profissional com: ${profile.notExperienced.join(", ")}.`,
    "",
    `VAGA: ${job.title} — ${job.company}`,
    `Local: ${job.location ?? "não informado"}; modalidade: ${job.modality ?? "não informada"}`,
    truncate(job.description, DESCRIPTION_LIMIT),
  ].join("\n");
}

export function assessWithLlm(
  llm: LlmClient,
  job: NormalizedJob,
  profile: Profile,
): Promise<LlmAssessmentOutput> {
  return llm.completeJson({
    system: SYSTEM,
    prompt: buildAssessmentPrompt(job, profile),
    schema: llmAssessmentSchema,
    maxTokens: 300,
  });
}
