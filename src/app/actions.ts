"use server";

import { profile } from "@config/profile";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { changeJobStatus, saveApplicationDetails } from "@/db/repositories/applications";
import { recordDraftGeneration } from "@/db/repositories/drafts";
import { getJob, saveJobNotes } from "@/db/repositories/jobs";
import { JOB_STATUSES } from "@/domain/status";
import { type DraftSet, generateDrafts } from "@/drafts/generate";
import { getEnv } from "@/lib/env";
import { createLlmFromEnv } from "@/runtime";

const jobIdSchema = z.uuid();

function revalidateJob(jobId: string): void {
  revalidatePath("/");
  revalidatePath(`/vagas/${jobId}`);
  revalidatePath("/candidaturas");
}

const statusSchema = z.object({ jobId: jobIdSchema, status: z.enum(JOB_STATUSES) });

export async function updateStatusAction(formData: FormData): Promise<void> {
  const { jobId, status } = statusSchema.parse(Object.fromEntries(formData));
  await changeJobStatus(await getDb(), jobId, status, new Date());
  revalidateJob(jobId);
}

const notesSchema = z.object({ jobId: jobIdSchema, notes: z.string().max(10_000) });

export async function saveNotesAction(formData: FormData): Promise<void> {
  const { jobId, notes } = notesSchema.parse(Object.fromEntries(formData));
  await saveJobNotes(await getDb(), jobId, notes.trim());
  revalidateJob(jobId);
}

const applicationSchema = z.object({
  jobId: jobIdSchema,
  channel: z.string().trim().max(200),
  nextStep: z.string().trim().max(500),
  // <input type="date"> envia "" quando vazio; a data vale meio-dia em Brasília para não "voltar" um dia.
  nextStepAt: z
    .union([z.literal(""), z.iso.date()])
    .transform((value) => (value ? new Date(`${value}T12:00:00-03:00`) : null)),
  notes: z.string().trim().max(10_000),
});

export async function saveApplicationAction(formData: FormData): Promise<void> {
  const { jobId, ...details } = applicationSchema.parse(Object.fromEntries(formData));
  await saveApplicationDetails(await getDb(), jobId, details);
  revalidateJob(jobId);
}

/** Rascunhos com LLM sob demanda: cada clique é uma chamada paga, então nada roda sozinho. */
export async function generateLlmDraftsAction(jobId: string): Promise<DraftSet> {
  const id = jobIdSchema.parse(jobId);
  const llm = createLlmFromEnv(getEnv());
  const db = await getDb();
  const job = await getJob(db, id);
  if (!job) throw new Error("Vaga não encontrada.");
  if (!llm) return { drafts: [], llmError: "ANTHROPIC_API_KEY não configurada." };
  const set = await generateDrafts(job, profile, llm);
  if (await recordDraftGeneration(db, id, set, new Date())) revalidatePath(`/vagas/${id}`);
  return set;
}
