import { describe, expect, it } from "vitest";
import { combineScores, scoreJob } from "@/scoring/score";
import { makeContext, makeJob } from "../support/jobs";
import { failingLlm, fakeLlm } from "../support/llm";

const DAY_MS = 86_400_000;
const context = makeContext();

const idealJob = makeJob({
  title: "Desenvolvedor Full Stack Pleno",
  description:
    "Requisitos\n- React, Next.js e TypeScript\n- Node.js e NestJS\n- Tailwind CSS\n- Testes automatizados\n- AWS",
  salaryMin: 9000,
  salaryMax: 12000,
  currency: "BRL",
});

function component(result: Awaited<ReturnType<typeof scoreJob>>, key: string) {
  return result.breakdown.components.find((item) => item.key === key);
}

describe("score determinístico", () => {
  it("vaga ideal recente chega a 100 e explica cada componente", async () => {
    const result = await scoreJob(idealJob, context, null);
    expect(result.score).toBe(100);
    expect(result.breakdown.components.map((item) => [item.key, item.points, item.max])).toEqual([
      ["stack", 40, 40],
      ["senioridade", 20, 20],
      ["modalidade", 20, 20],
      ["salario", 10, 10],
      ["recencia", 10, 10],
    ]);
    expect(component(result, "stack")?.reason).toBe(
      "Encontrado: React (+10), Next.js (+8), TypeScript (+8), Node/NestJS (+5), Tailwind (+3), Testes (+3), AWS (+3).",
    );
    expect(result.breakdown.llm).toBeNull();
  });

  it("ordena senioridade: pleno > júnior/pleno > sênior", async () => {
    const points = async (overrides: Parameters<typeof makeJob>[0]) =>
      component(await scoreJob(makeJob(overrides), context, null), "senioridade")?.points;
    expect(await points({ seniority: "pleno" })).toBe(20);
    expect(await points({ title: "Dev Front-end Júnior/Pleno", seniority: "pleno" })).toBe(15);
    expect(await points({ seniority: "senior" })).toBe(5);
  });

  it("ordena modalidade: remoto BR > híbrido na cidade > presencial na cidade > remoto internacional", async () => {
    const points = async (overrides: Parameters<typeof makeJob>[0]) =>
      component(await scoreJob(makeJob(overrides), context, null), "modalidade")?.points;
    expect(await points({ modality: "remoto", location: "Brasil" })).toBe(20);
    expect(await points({ modality: "hibrido", location: "Londrina, PR" })).toBe(15);
    expect(await points({ modality: "presencial", location: "Bauru" })).toBe(12);
    expect(await points({ modality: "remoto", location: "Latin America" })).toBe(10);
    expect(await points({ modality: "hibrido", location: "Curitiba" })).toBe(0);
  });

  it("reduz a recência com a idade da vaga", async () => {
    const points = async (days: number) =>
      component(
        await scoreJob(
          makeJob({ postedAt: new Date(context.now.getTime() - days * DAY_MS) }),
          context,
          null,
        ),
        "recencia",
      )?.points;
    expect(await points(0)).toBe(10);
    expect(await points(2)).toBe(8);
    expect(await points(10)).toBe(4);
    expect(await points(45)).toBe(0);
  });

  it("zera a stack quando o framework exigido está fora do perfil e não há React", async () => {
    const stack = async (description: string) =>
      component(await scoreJob(makeJob({ description }), context, null), "stack");
    const vue = await stack("Requisitos\n- Vue.js 3 e TypeScript");
    expect(vue?.points).toBe(0);
    expect(vue?.reason).toBe("Framework principal fora do perfil: Vue, sem React/Next.js.");
    expect((await stack("Requisitos\n- React e TypeScript\nDiferenciais\n- Vue.js"))?.points).toBe(
      18,
    );
    // Angular está nos fatos do perfil (TCC), então não conta como fora do perfil.
    expect((await stack("Requisitos\n- Angular e TypeScript"))?.points).toBe(8);
  });

  it("vaga eliminada tem score 0, mas mantém o breakdown para o painel", async () => {
    const result = await scoreJob(makeJob({ title: "Desenvolvedor Java Pleno" }), context, null);
    expect(result.score).toBe(0);
    expect(result.breakdown.eliminations).toHaveLength(1);
    expect(result.breakdown.deterministic).toBeGreaterThan(0);
  });
});

describe("avaliação LLM opcional", () => {
  it("faz média ponderada com o determinístico", async () => {
    const llm = fakeLlm({ nota: 50, justificativa: "Stack aderente, mas sem Tailwind." });
    const result = await scoreJob(idealJob, context, llm);
    expect(result.breakdown.llm).toEqual({
      score: 50,
      justification: "Stack aderente, mas sem Tailwind.",
      model: "modelo-de-teste",
      weight: 0.3,
    });
    expect(result.score).toBe(85);
    expect(llm.requests[0]?.prompt).toContain("Domus Control");
  });

  it("rejeita saída fora do schema e segue só com o determinístico", async () => {
    const result = await scoreJob(idealJob, context, fakeLlm({ nota: 150, justificativa: "" }));
    expect(result.breakdown.llm).toBeNull();
    expect(result.breakdown.llmError).toBeTruthy();
    expect(result.score).toBe(100);
  });

  it("não chama o LLM para vaga eliminada", async () => {
    const llm = failingLlm("não deveria ser chamado");
    await scoreJob(makeJob({ title: "Desenvolvedor .NET" }), context, llm);
    expect(llm.requests).toHaveLength(0);
  });

  it("combineScores sem LLM devolve o determinístico", () => {
    expect(combineScores(73, null)).toBe(73);
  });
});
