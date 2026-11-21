import { scoring } from "@config/scoring";
import Link from "next/link";
import type { JobListItem } from "@/db/repositories/jobs";
import { MODALITY_LABELS, SOURCE_LABELS } from "@/domain/job";
import { STATUS_LABELS } from "@/domain/status";
import { formatDate, hoursBetween } from "@/lib/dates";
import { formatSalary } from "@/lib/format";
import { ScoreBadge } from "./score-badge";

const chip =
  "rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

export function JobRow({ job, now }: { job: JobListItem; now: Date }) {
  const isNew = hoursBetween(job.firstSeenAt, now) <= scoring.newBadgeHours;
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  return (
    <li>
      <Link
        // Sem prefetch: a lista tem até 200 vagas e cada uma abriria uma função com consulta ao banco.
        prefetch={false}
        href={`/vagas/${job.id}`}
        className="flex items-start gap-4 rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
      >
        <ScoreBadge score={job.score} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-medium">{job.title}</h2>
            {isNew && (
              <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                nova
              </span>
            )}
            {job.status !== "nova" && <span className={chip}>{STATUS_LABELS[job.status]}</span>}
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {job.company}
            {job.location ? ` · ${job.location}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {job.modality && <span className={chip}>{MODALITY_LABELS[job.modality]}</span>}
            {job.contract && <span className={chip}>{job.contract.toUpperCase()}</span>}
            {salary && <span className={chip}>{salary}</span>}
            <span className={chip}>
              {SOURCE_LABELS[job.source]}
              {job.altUrls.length > 0 ? ` +${job.altUrls.length}` : ""}
            </span>
            <span className="text-xs text-zinc-500">publicada em {formatDate(job.postedAt)}</span>
          </div>
        </div>
      </Link>
    </li>
  );
}
