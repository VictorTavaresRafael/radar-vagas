import type { ScoreBreakdown } from "@/scoring/types";

export function ScoreBreakdownView({ breakdown }: { breakdown: ScoreBreakdown }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Por que este score</h2>
      {breakdown.eliminations.length > 0 && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          <p className="font-medium">Eliminada (score 0):</p>
          <ul className="list-disc pl-5">
            {breakdown.eliminations.map((elimination) => (
              <li key={elimination.rule}>{elimination.reason}</li>
            ))}
          </ul>
        </div>
      )}
      <ul className="space-y-2">
        {breakdown.components.map((component) => (
          <li key={component.key} className="text-sm">
            <div className="flex justify-between gap-2">
              <span className="font-medium">{component.label}</span>
              <span className="tabular-nums text-zinc-600 dark:text-zinc-400">
                {component.points}/{component.max}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full rounded bg-emerald-500"
                style={{
                  width: `${component.max === 0 ? 0 : (component.points / component.max) * 100}%`,
                }}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{component.reason}</p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Determinístico: <strong>{breakdown.deterministic}</strong>
        {breakdown.llm &&
          ` · IA (${breakdown.llm.model}, peso ${breakdown.llm.weight}): ${breakdown.llm.score} — ${breakdown.llm.justification}`}
        {breakdown.llmError && ` · IA indisponível: ${breakdown.llmError}`}
      </p>
    </section>
  );
}
