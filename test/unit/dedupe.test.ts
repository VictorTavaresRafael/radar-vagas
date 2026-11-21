import { describe, expect, it } from "vitest";
import { dedupeJobs, dedupeKey, normalizeCompany, normalizeTitle } from "@/pipeline/dedupe";
import { makeJob } from "../support/jobs";

describe("normalização para dedupe", () => {
  it("remove acentos, caixa, senioridade entre parênteses, tags e marcadores de gênero", () => {
    expect(normalizeTitle("[Remoto] Desenvolvedor(a) Front-end React (Pleno)")).toBe(
      "desenvolvedor front end react",
    );
    expect(normalizeTitle("Desenvolvedor Front-end React (Sênior/Especialista)")).toBe(
      "desenvolvedor front end react",
    );
  });

  it("mantém parênteses que não são senioridade", () => {
    expect(normalizeTitle("React Developer (Contractor)")).toBe("react developer contractor");
  });

  it("ignora sufixos societários na empresa", () => {
    expect(normalizeCompany("ília")).toBe("ilia");
    expect(normalizeCompany("Launchpad Technologies Inc.")).toBe("launchpad");
    expect(normalizeCompany("CI&T")).toBe("ci and t");
  });

  it("gera a mesma chave para a mesma vaga escrita de formas diferentes", () => {
    expect(dedupeKey("ília", "Desenvolvedor(a) Front-end React (Pleno)")).toBe(
      dedupeKey("ILIA", "desenvolvedor front-end react"),
    );
    expect(dedupeKey("ília", "Front-end React")).not.toBe(dedupeKey("Outra", "Front-end React"));
  });
});

describe("dedupeJobs", () => {
  it("funde a mesma vaga de duas fontes, mantendo o ATS da empresa como principal", () => {
    const github = makeJob({
      source: "github",
      externalId: "frontendbr/vagas#2101",
      company: "ília",
      title: "Desenvolvedor(a) Front-end React (Pleno)",
      url: "https://github.com/frontendbr/vagas/issues/2101",
    });
    const greenhouse = makeJob({
      source: "greenhouse",
      externalId: "4012345006",
      company: "ília",
      title: "Desenvolvedor(a) Front-end React (Pleno)",
      url: "https://job-boards.greenhouse.io/ilia/jobs/4012345006",
    });
    const other = makeJob({
      externalId: "9",
      title: "QA Automação Pleno",
      url: "https://example.com/9",
    });

    const merged = dedupeJobs([github, greenhouse, other]);

    expect(merged).toHaveLength(2);
    const ilia = merged.find((job) => job.company === "ília");
    expect(ilia?.source).toBe("greenhouse");
    expect(ilia?.altUrls).toEqual(["https://github.com/frontendbr/vagas/issues/2101"]);
  });

  it("não repete URL idêntica em alt_urls", () => {
    const job = makeJob();
    expect(dedupeJobs([job, { ...job }])[0]?.altUrls).toEqual([]);
  });
});
