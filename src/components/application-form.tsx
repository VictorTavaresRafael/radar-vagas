import { saveApplicationAction } from "@/app/actions";
import type { ApplicationRow } from "@/db/schema";
import { formatDate } from "@/lib/dates";

const field =
  "w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

function toDateInput(date: Date | null): string {
  return date ? date.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }) : "";
}

export function ApplicationForm({ application }: { application: ApplicationRow }) {
  return (
    <form action={saveApplicationAction} className="space-y-2">
      <input type="hidden" name="jobId" value={application.jobId} />
      <p className="text-xs text-zinc-500">
        Candidatura registrada em {formatDate(application.appliedAt)}.
      </p>
      <label className="block text-xs text-zinc-600 dark:text-zinc-400">
        Canal
        <input
          name="channel"
          defaultValue={application.channel}
          placeholder="site da empresa, LinkedIn, indicação…"
          className={field}
        />
      </label>
      <label className="block text-xs text-zinc-600 dark:text-zinc-400">
        Próximo passo
        <input
          name="nextStep"
          defaultValue={application.nextStep}
          placeholder="entrevista técnica, follow-up…"
          className={field}
        />
      </label>
      <label className="block text-xs text-zinc-600 dark:text-zinc-400">
        Data do próximo passo
        <input
          name="nextStepAt"
          type="date"
          defaultValue={toDateInput(application.nextStepAt)}
          className={field}
        />
      </label>
      <label className="block text-xs text-zinc-600 dark:text-zinc-400">
        Notas da candidatura
        <textarea name="notes" defaultValue={application.notes} rows={3} className={field} />
      </label>
      <button
        type="submit"
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
      >
        Salvar candidatura
      </button>
    </form>
  );
}
