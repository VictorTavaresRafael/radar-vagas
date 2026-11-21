import { describe, expect, it } from "vitest";
import { formatTopJobs, scoreReason, type TopJob, topJobs } from "@/pipeline/report";
import type { ScoreBreakdown } from "@/scoring/types";

const breakdown = (overrides: Partial<ScoreBreakdown> = {}): ScoreBreakdown => ({
  version: 1,
  eliminations: [],
  components: [
    { key: "stack", label: "Stack", points: 26, max: 40, reason: "React, TypeScript" },
    { key: "senioridade", label: "Senioridade", points: 20, max: 20, reason: "pleno" },
  ],
  deterministic: 46,
  llm: null,
  llmError: null,
  final: 46,
  keywords: { inResume: [], hasNotWritten: [], missing: [] },
  scoredAt: "2026-11-21T00:00:00.000Z",
  ...overrides,
});

const job = (score: number, title: string): TopJob => ({
  score,
  title,
  company: "Empresa",
  url: `https://example.com/${title}`,
  breakdown: breakdown(),
});

describe("top do log da coleta", () => {
  it("explica cada componente ou a eliminação", () => {
    expect(scoreReason(breakdown())).toBe(
      "Stack 26/40 (React, TypeScript) · Senioridade 20/20 (pleno)",
    );
    expect(
      scoreReason(breakdown({ eliminations: [{ rule: "linguagem", reason: "Java obrigatório" }] })),
    ).toBe("eliminada: Java obrigatório");
  });

  it("ordena por score e corta no limite", () => {
    const top = topJobs([job(50, "a"), job(90, "b"), job(70, "c")], 2);
    expect(top.map((item) => item.title)).toEqual(["b", "c"]);
  });

  it("formata posição, score, empresa, título, motivo e link", () => {
    expect(formatTopJobs([job(90, "Front-end Pleno")])).toEqual([
      "Top 1 vagas novas por score:",
      " 1. [90] Empresa — Front-end Pleno",
      "    Stack 26/40 (React, TypeScript) · Senioridade 20/20 (pleno)",
      "    https://example.com/Front-end Pleno",
    ]);
    expect(formatTopJobs([])).toEqual(["Nenhuma vaga nova nesta coleta."]);
  });
});
