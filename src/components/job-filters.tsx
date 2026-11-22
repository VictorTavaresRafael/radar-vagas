import { ABROAD, ALL_STATUSES, type JobFilters } from "@/domain/filters";
import { MODALITIES, MODALITY_LABELS, SOURCE_LABELS, SOURCES } from "@/domain/job";
import { REGION_LABELS, REGIONS } from "@/domain/region";
import { JOB_STATUSES, STATUS_LABELS } from "@/domain/status";

const field =
  "rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

/** Formulário GET: os filtros ficam na URL, então dá para salvar e compartilhar a busca. */
export function JobFiltersForm({
  filters,
  suggestedFloor,
}: {
  filters: JobFilters;
  /** Mediana dos salários divulgados, sugerida como ponto de partida. */
  suggestedFloor: number | null;
}) {
  return (
    <form
      method="get"
      className="grid grid-cols-2 gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
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
        Região
        <select name="region" defaultValue={filters.region ?? ""} className={field}>
          <option value="">Mundo todo</option>
          <option value="brasil">{REGION_LABELS.brasil}</option>
          <option value={ABROAD}>Fora do Brasil</option>
          <optgroup label="Continente">
            {REGIONS.filter((region) => region !== "brasil").map((region) => (
              <option key={region} value={region}>
                {REGION_LABELS[region]}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        Salário mínimo (R$/mês)
        <input
          name="minSalary"
          type="number"
          min={0}
          step={500}
          defaultValue={filters.minSalary ?? ""}
          placeholder={suggestedFloor ? suggestedFloor.toLocaleString("pt-BR") : "ex.: 6000"}
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        Status
        <select name="status" defaultValue={filters.status ?? ""} className={field}>
          <option value="">Ativas</option>
          <option value={ALL_STATUSES}>Todas</option>
          {JOB_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>
      <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2 sm:col-span-3 lg:col-span-4">
        <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          Ordenar por
          <select name="sort" defaultValue={filters.sort} className={field}>
            <option value="score">Score</option>
            <option value="recentes">Mais recentes</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            name="closed"
            value="1"
            defaultChecked={filters.closed}
            className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
          />
          Mostrar vagas encerradas ou que sumiram da fonte
        </label>
      </div>
      <div className="col-span-2 flex flex-wrap items-end gap-x-3 gap-y-1 sm:col-span-3 lg:col-span-4">
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
        {suggestedFloor !== null && !filters.minSalary && (
          <span className="text-xs text-zinc-500">
            Piso sugerido: R$ {suggestedFloor.toLocaleString("pt-BR")} (mediana dos salários
            divulgados). Vagas sem salário ou em dólar continuam na lista.
          </span>
        )}
      </div>
    </form>
  );
}
