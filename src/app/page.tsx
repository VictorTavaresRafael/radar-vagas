import { connection } from "next/server";
import { Highlights } from "@/components/highlights";
import { JobFiltersForm } from "@/components/job-filters";
import { JobRow } from "@/components/job-row";
import { Pagination } from "@/components/pagination";
import { getDb } from "@/db";
import { countJobs, listHighlights, listJobs, suggestedSalaryFloor } from "@/db/repositories/jobs";
import { PAGE_SIZE, parseJobFilters } from "@/domain/filters";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const filters = parseJobFilters(await searchParams);
  const db = await getDb();
  // Em sequência: na Vercel há uma conexão só com o pooler do Supabase.
  const total = await countJobs(db, filters);
  const jobs = await listJobs(db, filters);
  const now = new Date();
  const highlights = filters.page === 1 ? await listHighlights(db, filters, now) : [];
  const floor = await suggestedSalaryFloor(db);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const first = total === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1;
  const last = Math.min(filters.page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vagas</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Ordenadas por score e recência. Score 0 significa eliminada por filtro; abra a vaga para
            ver o motivo.
          </p>
        </div>
        <p className="text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
          {total === 0
            ? "Nenhuma vaga"
            : `${first}–${last} de ${total.toLocaleString("pt-BR")} ${total === 1 ? "vaga" : "vagas"}`}
        </p>
      </div>
      <JobFiltersForm filters={filters} suggestedFloor={floor} />
      <Highlights jobs={highlights} />
      {jobs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          {total === 0 ? (
            <>
              Nenhuma vaga com esses filtros. Rode <code>npm run collect</code> (ou{" "}
              <code>npm run db:seed</code> para dados de exemplo).
            </>
          ) : (
            "Esta página está além do fim da lista."
          )}
        </p>
      ) : (
        <ul className="space-y-2">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} now={now} />
          ))}
        </ul>
      )}
      <Pagination filters={filters} pages={pages} />
    </div>
  );
}
