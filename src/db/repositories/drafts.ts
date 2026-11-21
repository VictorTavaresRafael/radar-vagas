import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import type { Draft, DraftSet } from "@/drafts/generate";
import { DRAFT_KINDS } from "@/drafts/kinds";
import type { Db } from "../client";
import { type DraftRow, drafts } from "../schema";

export interface DraftGeneration {
  readonly generationId: string;
  readonly createdAt: Date;
  readonly drafts: readonly DraftRow[];
}

/**
 * Grava uma geração da IA (os três tipos com o mesmo `generation_id`). Falha do LLM
 * não é gravada: o que veio foi só o template, que é recalculado a qualquer momento.
 */
export async function recordDraftGeneration(
  db: Db,
  jobId: string,
  set: DraftSet,
  now: Date,
): Promise<string | null> {
  if (set.llmError !== null || set.drafts.length === 0) return null;
  const generationId = randomUUID();
  await db.insert(drafts).values(
    set.drafts.map((draft: Draft) => ({
      jobId,
      generationId,
      kind: draft.kind,
      origin: draft.origin,
      text: draft.text,
      rejected: [...draft.rejected],
      createdAt: now,
    })),
  );
  return generationId;
}

/** Gerações da vaga, da mais recente para a mais antiga. */
export async function listDraftGenerations(db: Db, jobId: string): Promise<DraftGeneration[]> {
  const rows = await db
    .select()
    .from(drafts)
    .where(eq(drafts.jobId, jobId))
    .orderBy(desc(drafts.createdAt));
  const byGeneration = new Map<string, DraftRow[]>();
  for (const row of rows) {
    byGeneration.set(row.generationId, [...(byGeneration.get(row.generationId) ?? []), row]);
  }
  return [...byGeneration.entries()].map(([generationId, list]) => ({
    generationId,
    createdAt: list[0]?.createdAt ?? new Date(0),
    drafts: list.toSorted((a, b) => DRAFT_KINDS.indexOf(a.kind) - DRAFT_KINDS.indexOf(b.kind)),
  }));
}
