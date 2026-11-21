import { scoring } from "@config/scoring";
import Link from "next/link";
import type { JobListItem } from "@/db/repositories/jobs";
import { MODALITY_LABELS, SOURCE_LABELS } from "@/domain/job";
import { REGION_LABELS } from "@/domain/region";
import { STATUS_LABELS } from "@/domain/status";
import { formatDate, hoursBetween } from "@/lib/dates";
import { formatSalary } from "@/lib/format";
import { ScoreBadge } from "./score-badge";

const chip =
  "rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
const salaryChip =
  "rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300";

export function JobRow({ job, now }: { job: JobListItem; now: Date }) {
  const isNew = hoursBetween(job.firstSeenAt, now) <= scoring.newBadgeHours;
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  return (
    <li>
      <Link
        // Sem prefetch: cada vaga abriria uma função com consulta ao banco.
        prefetch={false}
        href={`/vagas/${job.id}`}
        className="group flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-400 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
      >
        <ScoreBadge score={job.score} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 font-medium leading-snug group-hover:underline group-hover:underline-offset-2">
              {job.title}
            </h2>
            <span className="hidden shrink-0 text-xs text-zinc-500 tabular-nums sm:inline">
              {formatDate(job.postedAt)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{job.company}</span>
            {job.location ? ` · ${job.location}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {isNew && (
              <span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                nova
              </span>
            )}
            {job.status !== "nova" && (
              <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-500/15 dark:text-sky-300">
                {STATUS_LABELS[job.status]}
              </span>
            )}
            {salary && <span className={salaryChip}>{salary}</span>}
            {job.modality && <span className={chip}>{MODALITY_LABELS[job.modality]}</span>}
            {job.region && job.region !== "brasil" && (
              <span className={chip}>🌎 {REGION_LABELS[job.region]}</span>
            )}
            {job.contract && <span className={chip}>{job.contract.toUpperCase()}</span>}
            <span className={chip}>
              {SOURCE_LABELS[job.source]}
              {job.altUrls.length > 0 ? ` +${job.altUrls.length}` : ""}
            </span>
            <span className="text-xs text-zinc-500 sm:hidden">{formatDate(job.postedAt)}</span>
          </div>
        </div>
      </Link>
    </li>
  );
}
