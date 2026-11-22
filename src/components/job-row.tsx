import { scoring } from "@config/scoring";
import Link from "next/link";
import { updateStatusAction } from "@/app/actions";
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
const actionButton =
  "w-full rounded-md border px-2 py-1 text-xs font-medium whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-2";

/** Botão de status sem abrir a vaga: server action pura, funciona sem JavaScript. */
function QuickAction({
  jobId,
  status,
  label,
  className,
}: {
  jobId: string;
  status: "interessante" | "descartada";
  label: string;
  className: string;
}) {
  return (
    <form action={updateStatusAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={`${actionButton} ${className}`}>
        {label}
      </button>
    </form>
  );
}

export function JobRow({ job, now }: { job: JobListItem; now: Date }) {
  const isNew = hoursBetween(job.firstSeenAt, now) <= scoring.newBadgeHours;
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  return (
    <li className="group relative flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-400 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600">
      <ScoreBadge score={job.score} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 font-medium leading-snug">
            {/* O link cobre o cartão inteiro (after:inset-0); os botões ficam acima dele. */}
            <Link
              prefetch={false}
              href={`/vagas/${job.id}`}
              className="after:absolute after:inset-0 after:rounded-xl group-hover:underline group-hover:underline-offset-2"
            >
              {job.title}
            </Link>
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
          {job.closedAt && (
            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
              encerrada
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
      <div className="relative z-10 flex shrink-0 flex-col gap-1.5">
        {job.status === "nova" && (
          <QuickAction
            jobId={job.id}
            status="interessante"
            label="★ Interessante"
            className="border-sky-200 bg-sky-50 text-sky-800 hover:border-sky-400 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300"
          />
        )}
        {job.status !== "descartada" && (
          <QuickAction
            jobId={job.id}
            status="descartada"
            label="✕ Descartar"
            className="border-zinc-200 text-zinc-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
          />
        )}
      </div>
    </li>
  );
}
