import { scoring } from "@config/scoring";
import Link from "next/link";
import type { JobListItem } from "@/db/repositories/jobs";
import { MODALITY_LABELS } from "@/domain/job";
import { REGION_LABELS } from "@/domain/region";
import { formatSalary } from "@/lib/format";
import { ScoreBadge } from "./score-badge";

/** Faixa no topo da home com os melhores matches dos últimos dias ainda não trabalhados. */
export function Highlights({ jobs }: { jobs: readonly JobListItem[] }) {
  if (jobs.length === 0) return null;
  return (
    <section aria-labelledby="destaques" className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2
          id="destaques"
          className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"
        >
          ★ Destaque
        </h2>
        <p className="text-xs text-zinc-500">
          Score ≥ {scoring.highlight.minScore}, coletadas nos últimos {scoring.highlight.maxAgeDays}{" "}
          dias, ainda sem candidatura
        </p>
      </div>
      <ul className="grid gap-3 md:grid-cols-3">
        {jobs.map((job) => {
          const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
          const facts = [
            job.modality ? MODALITY_LABELS[job.modality] : null,
            job.region ? REGION_LABELS[job.region] : null,
            salary,
          ].filter(Boolean);
          return (
            <li key={job.id}>
              <Link
                prefetch={false}
                href={`/vagas/${job.id}`}
                className="flex h-full flex-col gap-3 rounded-xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm transition hover:border-emerald-500 hover:shadow dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-zinc-900 dark:hover:border-emerald-400"
              >
                <div className="flex items-start gap-3">
                  <ScoreBadge score={job.score} />
                  <div className="min-w-0">
                    <h3 className="font-medium leading-snug">{job.title}</h3>
                    <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                      {job.company}
                    </p>
                  </div>
                </div>
                {facts.length > 0 && (
                  <p className="mt-auto text-xs text-zinc-600 dark:text-zinc-400">
                    {facts.join(" · ")}
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
