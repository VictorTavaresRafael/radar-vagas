import Link from "next/link";
import { filtersToQuery, type JobFilters } from "@/domain/filters";

const base =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm tabular-nums transition";
const idle =
  "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600";
const disabled =
  "pointer-events-none border-zinc-100 text-zinc-300 dark:border-zinc-900 dark:text-zinc-700";

/** Páginas próximas da atual, com a primeira e a última sempre visíveis. */
export function visiblePages(current: number, pages: number): Array<number | "…"> {
  const wanted = new Set([1, pages, current - 1, current, current + 1]);
  const sorted = [...wanted].filter((page) => page >= 1 && page <= pages).sort((a, b) => a - b);
  const result: Array<number | "…"> = [];
  for (const page of sorted) {
    const previous = result.at(-1);
    if (typeof previous === "number" && page - previous > 1) result.push("…");
    result.push(page);
  }
  return result;
}

export function Pagination({ filters, pages }: { filters: JobFilters; pages: number }) {
  if (pages <= 1) return null;
  const current = Math.min(filters.page, pages);
  const href = (page: number) => `/${filtersToQuery(filters, page)}`;
  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-center gap-1.5">
      <Link
        href={href(current - 1)}
        className={`${base} ${current <= 1 ? disabled : idle}`}
        aria-disabled={current <= 1}
        prefetch={false}
      >
        ← Anterior
      </Link>
      {visiblePages(current, pages).map((page, index) =>
        page === "…" ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: reticências não têm identidade própria.
          <span key={`gap-${index}`} className="px-1 text-sm text-zinc-400">
            …
          </span>
        ) : (
          <Link
            key={page}
            href={href(page)}
            prefetch={false}
            aria-current={page === current ? "page" : undefined}
            className={`${base} ${
              page === current
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                : idle
            }`}
          >
            {page}
          </Link>
        ),
      )}
      <Link
        href={href(current + 1)}
        className={`${base} ${current >= pages ? disabled : idle}`}
        aria-disabled={current >= pages}
        prefetch={false}
      >
        Próxima →
      </Link>
    </nav>
  );
}
