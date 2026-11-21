import type { ScoreBreakdown } from "@/scoring/types";

export interface TopJob {
  readonly score: number;
  readonly title: string;
  readonly company: string;
  readonly url: string;
  readonly breakdown: ScoreBreakdown;
}

/** Motivo da nota em uma linha: eliminação, ou cada componente com seus pontos. */
export function scoreReason(breakdown: ScoreBreakdown): string {
  if (breakdown.eliminations.length > 0) {
    return `eliminada: ${breakdown.eliminations.map((item) => item.reason).join("; ")}`;
  }
  const parts = breakdown.components.map(
    (component) => `${component.label} ${component.points}/${component.max} (${component.reason})`,
  );
  if (breakdown.llm) parts.push(`LLM ${breakdown.llm.score}: ${breakdown.llm.justification}`);
  return parts.join(" · ");
}

export function topJobs(jobs: readonly TopJob[], limit: number): TopJob[] {
  return jobs.toSorted((a, b) => b.score - a.score).slice(0, limit);
}

export function formatTopJobs(jobs: readonly TopJob[]): string[] {
  if (jobs.length === 0) return ["Nenhuma vaga nova nesta coleta."];
  return [
    `Top ${jobs.length} vagas novas por score:`,
    ...jobs.flatMap((job, index) => [
      `${String(index + 1).padStart(2)}. [${job.score}] ${job.company} — ${job.title}`,
      `    ${scoreReason(job.breakdown)}`,
      `    ${job.url}`,
    ]),
  ];
}
