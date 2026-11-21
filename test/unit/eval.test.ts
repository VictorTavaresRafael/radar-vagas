import { describe, expect, it } from "vitest";
import { checkGates, formatReport } from "@/eval/report";
import { runEval, summarize, toMetrics } from "@/eval/run";
import type { CaseResult } from "@/eval/types";
import { makeContext } from "../support/jobs";

const result = (overrides: Partial<CaseResult>): CaseResult => ({
  id: "caso",
  note: "",
  score: 80,
  expectedEliminations: [],
  actualEliminations: [],
  expectedRelevant: true,
  actualRelevant: true,
  ...overrides,
});

describe("métricas do eval", () => {
  it("calcula precisão, recall e F1", () => {
    const m = toMetrics({ tp: 3, fp: 1, fn: 2 });
    expect(m.precision).toBeCloseTo(0.75);
    expect(m.recall).toBeCloseTo(0.6);
    expect(m.f1).toBeCloseTo(2 / 3);
  });

  it("devolve null quando não há denominador", () => {
    expect(toMetrics({ tp: 0, fp: 0, fn: 0 })).toMatchObject({
      precision: null,
      recall: null,
      f1: null,
    });
  });

  it("conta eliminações por regra e lista divergências", () => {
    const report = summarize([
      result({ id: "ok", expectedEliminations: ["linguagem"], actualEliminations: ["linguagem"] }),
      result({ id: "faltou", expectedEliminations: ["ingles"], actualRelevant: true }),
      result({ id: "sobrou", actualEliminations: ["salario"], actualRelevant: false }),
    ]);
    expect(report.eliminationsByRule.linguagem).toMatchObject({ tp: 1, fp: 0, fn: 0 });
    expect(report.eliminationsByRule.ingles).toMatchObject({ tp: 0, fp: 0, fn: 1 });
    expect(report.eliminationsByRule.salario).toMatchObject({ tp: 0, fp: 1, fn: 0 });
    expect(report.failures.map((f) => f.id)).toEqual(["faltou", "sobrou"]);
  });
});

describe("gates e relatório", () => {
  it("reprova métricas abaixo do mínimo", () => {
    const report = summarize([result({ expectedRelevant: true, actualRelevant: false })]);
    const failed = checkGates(report, {
      eliminationPrecision: 0,
      eliminationRecall: 0,
      relevanceF1: 0.5,
    });
    expect(failed).toEqual(["F1 de relevância: — < mínimo 50.0%"]);
  });

  it("formata a tabela e as divergências", () => {
    const text = formatReport(summarize([result({ id: "x", actualRelevant: false, score: 40 })]));
    expect(text).toContain("| **Relevância (score ≥ 60)** | 0 | 0 | 1 |");
    expect(text).toContain("`x` (score 40)");
  });
});

describe("runEval", () => {
  it("pontua os casos com o score real e rejeita ids duplicados", async () => {
    const item = {
      id: "java",
      note: "",
      job: { title: "Desenvolvedor Java Pleno", description: "Requisitos\n- Java" },
      expected: { eliminations: ["linguagem"] as const, relevant: false },
    };
    const report = await runEval([item], makeContext());
    expect(report.failures).toEqual([]);
    await expect(runEval([item, item], makeContext())).rejects.toThrow("duplicado");
  });
});
