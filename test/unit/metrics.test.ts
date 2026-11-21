import { describe, expect, it } from "vitest";
import { buildFunnel, fillDays, formatPercent, responseRate } from "@/domain/metrics";

describe("métricas", () => {
  it("preenche os dias sem vaga com zero, no fuso de Brasília", () => {
    // 02:00 UTC do dia 22 ainda é dia 21 em Brasília.
    const now = new Date("2026-11-22T02:00:00Z");
    expect(fillDays([{ day: "2026-11-20", count: 3 }], now, 3)).toEqual([
      { day: "2026-11-19", count: 0 },
      { day: "2026-11-20", count: 3 },
      { day: "2026-11-21", count: 0 },
    ]);
  });

  it("calcula a conversão entre etapas do funil", () => {
    const funnel = buildFunnel({ nova: 100, candidatado: 10, entrevista: 2, oferta: 0 });
    expect(funnel.map((step) => step.fromPrevious)).toEqual([null, 0.1, 0.2, 0]);
    expect(
      buildFunnel({ nova: 5, candidatado: 0, entrevista: 0, oferta: 0 })[2]?.fromPrevious,
    ).toBeNull();
  });

  it("taxa de resposta sem candidaturas é indefinida", () => {
    expect(responseRate(0, 0)).toBeNull();
    expect(formatPercent(responseRate(8, 2))).toBe("25%");
    expect(formatPercent(null)).toBe("—");
  });
});
