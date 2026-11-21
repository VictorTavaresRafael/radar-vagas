import { describe, expect, it } from "vitest";
import { visiblePages } from "@/components/pagination";
import { filtersToQuery, parseJobFilters } from "@/domain/filters";

describe("paginação da lista de vagas", () => {
  it("mostra a primeira, a última e as vizinhas da atual", () => {
    expect(visiblePages(1, 1)).toEqual([1]);
    expect(visiblePages(1, 3)).toEqual([1, 2, 3]);
    expect(visiblePages(5, 25)).toEqual([1, "…", 4, 5, 6, "…", 25]);
    expect(visiblePages(25, 25)).toEqual([1, "…", 24, 25]);
  });

  it("page inválida na URL vira 1", () => {
    expect(parseJobFilters({}).page).toBe(1);
    expect(parseJobFilters({ page: "0" }).page).toBe(1);
    expect(parseJobFilters({ page: "abc" }).page).toBe(1);
    expect(parseJobFilters({ page: "3" }).page).toBe(3);
  });

  it("links preservam os filtros e omitem a página 1", () => {
    const filters = parseJobFilters({ q: "react", minScore: "60", modality: "remoto" });
    expect(filtersToQuery(filters, 1)).toBe("?q=react&minScore=60&modality=remoto");
    expect(filtersToQuery(filters, 2)).toBe("?q=react&minScore=60&modality=remoto&page=2");
    expect(filtersToQuery(parseJobFilters({}), 1)).toBe("");
  });
});
