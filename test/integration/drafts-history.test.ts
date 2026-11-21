import { profile } from "@config/profile";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPgliteDb, type DbHandle } from "@/db/client";
import { listDraftGenerations, recordDraftGeneration } from "@/db/repositories/drafts";
import { drafts, jobs } from "@/db/schema";
import { generateDrafts } from "@/drafts/generate";
import { FIXTURE_NOW } from "../support/fixtures";
import { insertTestJob } from "../support/jobs";
import { failingLlm, fakeLlm } from "../support/llm";

let handle: DbHandle;

beforeEach(async () => {
  handle = createPgliteDb();
  await handle.migrate();
});

afterEach(async () => {
  await handle.close();
});

const approved = {
  resumo: "Sou Desenvolvedor de Software Pleno na Domus Control, com Next.js, React e TypeScript.",
  mensagem: "Olá! Trabalho com Next.js, React e TypeScript na Domus Control.",
  sobre: "Sou Desenvolvedor de Software Pleno na Domus Control.",
};

const later = (minutes: number) => new Date(FIXTURE_NOW.getTime() + minutes * 60_000);

describe("histórico de rascunhos", () => {
  it("grava cada geração da IA e lista da mais recente para a mais antiga", async () => {
    const job = await insertTestJob(handle.db);
    const first = await generateDrafts(job, profile, fakeLlm(approved));
    const second = await generateDrafts(
      job,
      profile,
      fakeLlm({ ...approved, mensagem: "Tenho experiência com Kubernetes." }),
    );

    const firstId = await recordDraftGeneration(handle.db, job.id, first, later(1));
    const secondId = await recordDraftGeneration(handle.db, job.id, second, later(2));

    const history = await listDraftGenerations(handle.db, job.id);
    expect(history.map((generation) => generation.generationId)).toEqual([secondId, firstId]);
    expect(history[0]?.drafts.map((draft) => draft.kind)).toEqual(["resumo", "mensagem", "sobre"]);

    const rejected = history[0]?.drafts.find((draft) => draft.kind === "mensagem");
    expect(rejected?.origin).toBe("template");
    expect(rejected?.rejected).toEqual([{ kind: "tecnologia", term: "Kubernetes" }]);
    expect(history[1]?.drafts.every((draft) => draft.origin === "llm")).toBe(true);
  });

  it("não grava quando o LLM falha", async () => {
    const job = await insertTestJob(handle.db);
    const set = await generateDrafts(job, profile, failingLlm("timeout"));

    expect(await recordDraftGeneration(handle.db, job.id, set, later(1))).toBeNull();
    expect(await listDraftGenerations(handle.db, job.id)).toEqual([]);
  });

  it("apaga o histórico junto com a vaga", async () => {
    const job = await insertTestJob(handle.db);
    await recordDraftGeneration(
      handle.db,
      job.id,
      await generateDrafts(job, profile, fakeLlm(approved)),
      later(1),
    );

    await handle.db.delete(jobs).where(eq(jobs.id, job.id));
    expect(await handle.db.select().from(drafts)).toEqual([]);
  });
});
