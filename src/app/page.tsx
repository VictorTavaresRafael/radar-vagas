import { JobFiltersForm } from "@/components/job-filters";
import { JobRow } from "@/components/job-row";
import { getDb } from "@/db";
import { listJobs } from "@/db/repositories/jobs";
import { parseJobFilters } from "@/domain/filters";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseJobFilters(await searchParams);
  const jobs = await listJobs(await getDb(), filters);
  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vagas</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Ordenadas por score e recência. Score 0 significa eliminada por filtro; abra a vaga para
          ver o motivo.
        </p>
      </div>
      <JobFiltersForm filters={filters} />
      {jobs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Nenhuma vaga com esses filtros. Rode <code>npm run collect</code> (ou{" "}
          <code>npm run db:seed</code> para dados de exemplo).
        </p>
      ) : (
        <ul className="space-y-2">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} now={now} />
          ))}
        </ul>
      )}
    </div>
  );
}
