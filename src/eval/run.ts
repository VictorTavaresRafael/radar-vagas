import { scoring } from "@config/scoring";
import type { NormalizedJob } from "@/domain/job";
import { scoreJob } from "@/scoring/score";
import type { EliminationRule, ScoreContext } from "@/scoring/types";
import type { CaseResult, Counts, EvalCase, EvalReport, Metrics } from "./types";

const RULES: readonly EliminationRule[] = [
  "linguagem",
  "senioridade",
  "ingles",
  "presencial",
  "salario",
];

export function baseJob(now: Date): NormalizedJob {
  return {
    source: "greenhouse",
    externalId: "eval",
    company: "Empresa Exemplo",
    title: "Desenvolvedor Front-end Pleno",
    url: "https://example.com/vagas/eval",
    location: "Remoto - Brasil",
    modality: "remoto",
    seniority: "pleno",
    contract: "clt",
    salaryMin: null,
    salaryMax: null,
    currency: null,
    description: "",
    postedAt: now,
  };
}

const ratio = (num: number, den: number): number | null => (den === 0 ? null : num / den);

export function toMetrics(counts: Counts): Metrics {
  const precision = ratio(counts.tp, counts.tp + counts.fp);
  const recall = ratio(counts.tp, counts.tp + counts.fn);
  const f1 =
    precision === null || recall === null || precision + recall === 0
      ? null
      : (2 * precision * recall) / (precision + recall);
  return { ...counts, precision, recall, f1 };
}

function countBinary(pairs: readonly { expected: boolean; actual: boolean }[]): Counts {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (const { expected, actual } of pairs) {
    if (expected && actual) tp++;
    else if (!expected && actual) fp++;
    else if (expected && !actual) fn++;
  }
  return { tp, fp, fn };
}

const sumCounts = (items: readonly Counts[]): Counts =>
  items.reduce((acc, c) => ({ tp: acc.tp + c.tp, fp: acc.fp + c.fp, fn: acc.fn + c.fn }), {
    tp: 0,
    fp: 0,
    fn: 0,
  });

async function runCase(item: EvalCase, context: ScoreContext): Promise<CaseResult> {
  // Sem LLM: o eval mede a parte determinística, que roda sempre e é reprodutível.
  const result = await scoreJob({ ...baseJob(context.now), ...item.job }, context, null);
  const actualEliminations = [...new Set(result.breakdown.eliminations.map((e) => e.rule))];
  return {
    id: item.id,
    note: item.note,
    score: result.score,
    expectedEliminations: item.expected.eliminations,
    actualEliminations,
    expectedRelevant: item.expected.relevant,
    actualRelevant: result.score >= scoring.evaluation.relevantMinScore,
  };
}

function sameRules(a: readonly EliminationRule[], b: readonly EliminationRule[]): boolean {
  return a.length === b.length && a.every((rule) => b.includes(rule));
}

export function summarize(results: readonly CaseResult[]): EvalReport {
  const byRule = Object.fromEntries(
    RULES.map((rule) => [
      rule,
      countBinary(
        results.map((r) => ({
          expected: r.expectedEliminations.includes(rule),
          actual: r.actualEliminations.includes(rule),
        })),
      ),
    ]),
  ) as Record<EliminationRule, Counts>;
  return {
    total: results.length,
    relevantMinScore: scoring.evaluation.relevantMinScore,
    eliminationsByRule: Object.fromEntries(
      RULES.map((rule) => [rule, toMetrics(byRule[rule])]),
    ) as Record<EliminationRule, Metrics>,
    eliminations: toMetrics(sumCounts(Object.values(byRule))),
    relevance: toMetrics(
      countBinary(results.map((r) => ({ expected: r.expectedRelevant, actual: r.actualRelevant }))),
    ),
    failures: results.filter(
      (r) =>
        !sameRules(r.expectedEliminations, r.actualEliminations) ||
        r.expectedRelevant !== r.actualRelevant,
    ),
  };
}

export async function runEval(
  cases: readonly EvalCase[],
  context: ScoreContext,
): Promise<EvalReport> {
  const ids = new Set<string>();
  for (const item of cases) {
    if (ids.has(item.id)) throw new Error(`Caso de eval duplicado: ${item.id}`);
    ids.add(item.id);
  }
  return summarize(await Promise.all(cases.map((item) => runCase(item, context))));
}
