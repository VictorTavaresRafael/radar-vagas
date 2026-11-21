import { updateStatusAction } from "@/app/actions";
import { JOB_STATUSES, type JobStatus, STATUS_LABELS } from "@/domain/status";

/** Formulário sem JavaScript: funciona como server action pura. */
export function StatusForm({
  jobId,
  status,
  compact = false,
}: {
  jobId: string;
  status: JobStatus;
  compact?: boolean;
}) {
  return (
    <form action={updateStatusAction} className="flex items-center gap-2">
      <input type="hidden" name="jobId" value={jobId} />
      <label
        className={compact ? "sr-only" : "text-sm text-zinc-600 dark:text-zinc-400"}
        htmlFor={`status-${jobId}`}
      >
        Status
      </label>
      <select
        id={`status-${jobId}`}
        name="status"
        defaultValue={status}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        {JOB_STATUSES.map((option) => (
          <option key={option} value={option}>
            {STATUS_LABELS[option]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-md bg-zinc-900 px-2.5 py-1 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Mover
      </button>
    </form>
  );
}
