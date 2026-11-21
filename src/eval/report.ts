import type { EliminationRule } from "@/scoring/types";
import type { EvalReport, Metrics } from "./types";

export interface EvalGates {
  readonly eliminationPrecision: number;
  readonly eliminationRecall: number;
  readonly relevanceF1: number;
}

const pct = (value: number | null): string =>
  value === null ? "—" : `${(value * 100).toFixed(1)}%`;

const row = (label: string, m: Metrics): string =>
  `| ${label} | ${m.tp} | ${m.fp} | ${m.fn} | ${pct(m.precision)} | ${pct(m.recall)} | ${pct(m.f1)} |`;

const rules = (list: readonly EliminationRule[]): string =>
  list.length > 0 ? list.join(", ") : "nenhuma";

export function formatReport(report: EvalReport): string {
  const lines = [
    `# Eval do score (${report.total} casos rotulados, sem LLM)`,
    "",
    "| Métrica | VP | FP | FN | Precisão | Recall | F1 |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...Object.entries(report.eliminationsByRule).map(([rule, m]) => row(`Eliminação: ${rule}`, m)),
    row("**Eliminações (total)**", report.eliminations),
    row(`**Relevância (score ≥ ${report.relevantMinScore})**`, report.relevance),
    "",
  ];
  if (report.failures.length === 0) return [...lines, "Nenhuma divergência."].join("\n");
  return [
    ...lines,
    `## Divergências (${report.failures.length})`,
    "",
    ...report.failures.map(
      (f) =>
        `- \`${f.id}\` (score ${f.score}): esperado [${rules(f.expectedEliminations)}], relevante=${f.expectedRelevant}; obtido [${rules(f.actualEliminations)}], relevante=${f.actualRelevant}. ${f.note}`,
    ),
  ].join("\n");
}

/** Lista de gates reprovados; vazia significa que o eval passou. */
export function checkGates(report: EvalReport, gates: EvalGates): string[] {
  const failed: string[] = [];
  const check = (label: string, value: number | null, min: number) => {
    if ((value ?? 0) < min) failed.push(`${label}: ${pct(value)} < mínimo ${pct(min)}`);
  };
  check("Precisão das eliminações", report.eliminations.precision, gates.eliminationPrecision);
  check("Recall das eliminações", report.eliminations.recall, gates.eliminationRecall);
  check("F1 de relevância", report.relevance.f1, gates.relevanceF1);
  return failed;
}
