import { profile } from "@config/profile";
import { describe, expect, it } from "vitest";
import { buildCollectors } from "@/collectors";
import { generateDrafts } from "@/drafts/generate";
import { DRAFT_KINDS, MESSAGE_MAX_LENGTH } from "@/drafts/kinds";
import { templateDrafts } from "@/drafts/templates";
import { verifyDraft } from "@/drafts/verify";
import { createFixtureFetch, FIXTURE_SOURCES } from "../support/fixtures";
import { failingLlm, fakeLlm } from "../support/llm";

const job = {
  title: "Desenvolvedor(a) Front-end React/Vue (Pleno)",
  company: "ília",
  description: "Requisitos\n- React, Next.js e TypeScript\n- Vue é um diferencial",
};

async function allFixtureJobs() {
  const collectors = buildCollectors(FIXTURE_SOURCES, {
    fetch: createFixtureFetch(),
    warn: () => {},
  });
  const lists = await Promise.all(
    collectors.map(async (collector) =>
      (await collector.fetchJobs()).map((raw) => collector.normalize(raw)),
    ),
  );
  return lists.flat();
}

describe("verificação anti-invenção", () => {
  it("aprova texto montado só com fatos do perfil", () => {
    const text =
      "Sou Desenvolvedor de Software Pleno na Domus Control, com Next.js, React e TypeScript. Fui Scrum Master por 4 sprints na Compass UOL.";
    expect(verifyDraft(text, profile, job)).toEqual([]);
  });

  it("reprova tecnologia fora do perfil", () => {
    expect(verifyDraft("Tenho experiência com Vue e Kubernetes.", profile, job)).toEqual([
      { kind: "tecnologia", term: "Kubernetes" },
      { kind: "tecnologia", term: "Vue" },
    ]);
  });

  it("reprova empresa inventada", () => {
    expect(verifyDraft("Trabalhei três anos na Nubank com React.", profile, job)).toEqual([
      { kind: "nome", term: "Nubank" },
    ]);
  });

  it("reprova número que não está nos fatos", () => {
    expect(
      verifyDraft("Tenho 5 anos de experiência e reduzi o tempo de build em 40%.", profile, job),
    ).toEqual([
      { kind: "numero", term: "5" },
      { kind: "numero", term: "40" },
    ]);
  });

  it("permite citar o título e a empresa da vaga, mesmo com tecnologia que o perfil não tem", () => {
    expect(verifyDraft(`Vi a vaga de ${job.title} na ${job.company}.`, profile, job)).toEqual([]);
  });
});

describe("templates", () => {
  it("todo rascunho gerado para as vagas das fixtures passa na verificação", async () => {
    const jobs = await allFixtureJobs();
    expect(jobs.length).toBeGreaterThan(10);
    for (const fixtureJob of jobs) {
      const drafts = templateDrafts(profile, fixtureJob);
      for (const kind of DRAFT_KINDS) {
        expect(
          verifyDraft(drafts[kind], profile, fixtureJob),
          `${fixtureJob.title} / ${kind}`,
        ).toEqual([]);
      }
      expect(drafts.mensagem.length).toBeLessThanOrEqual(MESSAGE_MAX_LENGTH);
    }
  });

  it("prioriza a experiência mais aderente à vaga", () => {
    const drafts = templateDrafts(profile, job);
    expect(drafts.resumo).toContain("plataforma PWA multi-tenant");
    expect(drafts.mensagem).toContain("Tenho experiência com React, Next.js e TypeScript.");
    expect(drafts.mensagem).not.toContain("Vue.");
  });

  it("cabe em 300 caracteres mesmo com título longo", () => {
    const longTitle = { ...job, title: "Pessoa Desenvolvedora ".repeat(20) };
    expect(templateDrafts(profile, longTitle).mensagem.length).toBeLessThanOrEqual(
      MESSAGE_MAX_LENGTH,
    );
  });
});

describe("generateDrafts", () => {
  it("sem LLM usa templates", async () => {
    const result = await generateDrafts(job, profile, null);
    expect(result.drafts.map((draft) => draft.origin)).toEqual([
      "template",
      "template",
      "template",
    ]);
  });

  it("aceita rascunho do LLM aprovado e troca o reprovado pelo template", async () => {
    const llm = fakeLlm({
      resumo: "Sou Desenvolvedor de Software Pleno na Domus Control, com React e TypeScript.",
      mensagem: "Olá! Tenho 6 anos de experiência com Vue na Globo. Podemos conversar?",
      sobre: "Sou Desenvolvedor de Software Pleno na Domus Control.",
    });
    const result = await generateDrafts(job, profile, llm);
    const [resumo, mensagem, sobre] = result.drafts;
    expect(resumo).toMatchObject({ origin: "llm", rejected: [] });
    expect(sobre?.origin).toBe("llm");
    expect(mensagem?.origin).toBe("template");
    expect(mensagem?.rejected).toEqual([
      { kind: "tecnologia", term: "Vue" },
      { kind: "numero", term: "6" },
      { kind: "nome", term: "Globo" },
    ]);
    expect(llm.requests[0]?.system).toContain("Use somente os FATOS listados");
  });

  it("falha do LLM vira templates com o erro registrado", async () => {
    const result = await generateDrafts(job, profile, failingLlm("timeout"));
    expect(result.llmError).toBe("timeout");
    expect(result.drafts.every((draft) => draft.origin === "template")).toBe(true);
  });
});
