import { ALL_STATUSES, type JobFilters } from "@/domain/filters";
import { MODALITIES, MODALITY_LABELS, SOURCE_LABELS, SOURCES } from "@/domain/job";
import { JOB_STATUSES, STATUS_LABELS } from "@/domain/status";

const field =
  "rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

/** Formulário GET: os filtros ficam na URL, então dá para salvar e compartilhar a busca. */
export function JobFiltersForm({ filters }: { filters: JobFilters }) {
  return (
    <form method="get" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <label className="col-span-2 flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        Busca
        <input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="título, empresa ou descrição"
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        Score mínimo
        <input
          name="minScore"
          type="number"
          min={0}
          max={100}
          defaultValue={filters.minScore}
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        Fonte
        <select name="source" defaultValue={filters.source ?? ""} className={field}>
          <option value="">Todas</option>
          {SOURCES.map((source) => (
            <option key={source} value={source}>
              {SOURCE_LABELS[source]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        Modalidade
        <select name="modality" defaultValue={filters.modality ?? ""} className={field}>
          <option value="">Todas</option>
          {MODALITIES.map((modality) => (
            <option key={modality} value={modality}>
              {MODALITY_LABELS[modality]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        Status
        <select name="status" defaultValue={filters.status ?? ""} className={field}>
          <option value="">Ativas (sem descartadas)</option>
          <option value={ALL_STATUSES}>Todas</option>
          {JOB_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>
      <div className="col-span-2 flex items-end gap-2 sm:col-span-3 lg:col-span-6">
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
        >
          Filtrar
        </button>
        <a
          href="/"
          className="text-sm text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          Limpar
        </a>
      </div>
    </form>
  );
}
