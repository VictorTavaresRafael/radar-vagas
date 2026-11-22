import { describe, expect, it, vi } from "vitest";
import { buildCollectors } from "@/collectors";
import { createGithubIssuesCollector, parseIssueTitle } from "@/collectors/github-issues";
import { createGreenhouseCollector } from "@/collectors/greenhouse";
import { createLeverCollector } from "@/collectors/lever";
import { createRemotiveCollector } from "@/collectors/remotive";
import { type Collector, HttpError } from "@/collectors/types";
import type { NormalizedJob } from "@/domain/job";
import { createFixtureFetch, FIXTURE_SOURCES } from "../support/fixtures";

const deps = () => ({ fetch: createFixtureFetch(), warn: vi.fn() });

async function collect<Raw>(collector: Collector<Raw>): Promise<NormalizedJob[]> {
  const raws = await collector.fetchJobs();
  return raws.map((raw) => collector.normalize(raw));
}

describe("Greenhouse", () => {
  it("normaliza o board com HTML escapado, salário, contrato e data de publicação", async () => {
    const jobs = await collect(
      createGreenhouseCollector({ token: "ilia", company: "ília" }, deps()),
    );
    expect(jobs).toHaveLength(3);
    const [react] = jobs;
    expect(react).toMatchObject({
      source: "greenhouse",
      externalId: "4012345006",
      company: "ília",
      title: "Desenvolvedor(a) Front-end React (Pleno)",
      url: "https://job-boards.greenhouse.io/ilia/jobs/4012345006",
      location: "Remoto - Brasil",
      modality: "remoto",
      seniority: "pleno",
      contract: "clt",
      salaryMin: 9000,
      salaryMax: 12000,
      currency: "BRL",
    });
    expect(react?.postedAt?.toISOString()).toBe("2026-11-18T12:00:00.000Z");
    expect(react?.description).toContain("- Experiência sólida com React e TypeScript;");
    expect(react?.description).not.toMatch(/&lt;|<li>/);
  });

  it("propaga erro HTTP com a URL que falhou", async () => {
    const collector = createGreenhouseCollector({ token: "inexistente", company: "X" }, deps());
    await expect(collector.fetchJobs()).rejects.toBeInstanceOf(HttpError);
  });
});

describe("Lever", () => {
  it("usa workplaceType, commitment e junta as listas de requisitos à descrição", async () => {
    const jobs = await collect(createLeverCollector({ slug: "ciandt", company: "CI&T" }, deps()));
    expect(jobs.map((job) => job.modality)).toEqual(["remoto", "hibrido", "presencial"]);
    const [fullStack] = jobs;
    expect(fullStack).toMatchObject({
      source: "lever",
      company: "CI&T",
      location: "Brasil - Remoto",
      contract: "clt",
      seniority: "pleno",
      url: "https://jobs.lever.co/ciandt/a3f1c2d4-5b6e-4f70-8a91-0b2c3d4e5f60",
    });
    expect(fullStack?.description).toContain(
      "Requisitos\n- Experiência com React, TypeScript e Next.js",
    );
    expect(fullStack?.description).toContain("Diferenciais\n- AWS (Lambda, S3)");
    expect(fullStack?.postedAt?.toISOString()).toBe("2026-11-19T15:00:00.000Z");
  });

  it("converte a faixa salarial estruturada", async () => {
    const [job] = await collect(
      createLeverCollector({ slug: "oowlish", company: "Oowlish" }, deps()),
    );
    expect(job).toMatchObject({
      salaryMin: 3500,
      salaryMax: 5000,
      currency: "USD",
      contract: "contractor",
    });
  });
});

describe("GitHub Issues", () => {
  it("ignora pull requests e extrai empresa, local e atributos das labels", async () => {
    const jobs = await collect(
      createGithubIssuesCollector({ owner: "frontendbr", repo: "vagas" }, deps()),
    );
    expect(jobs.map((job) => job.externalId)).toEqual([
      "frontendbr/vagas#2101",
      "frontendbr/vagas#2102",
      "frontendbr/vagas#2104",
      "frontendbr/vagas#2105",
    ]);
    const londrina = jobs[1];
    expect(londrina).toMatchObject({
      company: "Pé Vermelho Tech",
      title: "Desenvolvedor Front-end Júnior/Pleno",
      location: "Londrina",
      modality: "hibrido",
      contract: "pj",
      salaryMin: 6000,
      salaryMax: 7500,
      currency: "BRL",
    });
  });

  it("envia token e cabeçalhos exigidos pela API do GitHub", async () => {
    const fetchFn = createFixtureFetch();
    const spy = vi.fn(fetchFn);
    const collector = createGithubIssuesCollector(
      { owner: "backend-br", repo: "vagas" },
      { fetch: spy, warn: vi.fn(), token: "ghp_teste" },
    );
    await collector.fetchJobs();
    const init = spy.mock.calls[0]?.[1];
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer ghp_teste",
      "User-Agent": "radar-vagas",
    });
  });

  it.each([
    [
      "[Remoto] Dev React (Pleno) @ ília",
      { title: "Dev React (Pleno)", company: "ília", location: null },
    ],
    [
      "[São Paulo] Front-end na Varejo Digital",
      { title: "Front-end", company: "Varejo Digital", location: "São Paulo" },
    ],
    [
      "Desenvolvedor React Pleno remoto no Brasil",
      { title: "Desenvolvedor React Pleno remoto no Brasil", company: null, location: null },
    ],
    // Títulos reais do backend-br/vagas e do frontendbr/vagas (nov/2026).
    [
      "[Remoto] Desenvolvedor(a) Backend Pleno - White Label e Plataforma - Mimix AI",
      {
        title: "Desenvolvedor(a) Backend Pleno - White Label e Plataforma",
        company: "Mimix AI",
        location: null,
      },
    ],
    [
      "[Remoto] Desenvolvedor(a) Back-end Júnior - Python / AI Coding & Agentic AI - MKdigital",
      {
        title: "Desenvolvedor(a) Back-end Júnior - Python / AI Coding & Agentic AI",
        company: "MKdigital",
        location: null,
      },
    ],
    [
      "Fullstack Developer - Jazida.com",
      { title: "Fullstack Developer", company: "Jazida.com", location: null },
    ],
    [
      "Back-end Developer JR - PORT LOUIS",
      { title: "Back-end Developer JR - PORT LOUIS", company: null, location: null },
    ],
    [
      "Desenvolvedor Front-end - Pleno",
      { title: "Desenvolvedor Front-end - Pleno", company: null, location: null },
    ],
    [
      "Desenvolvedor Back-end - Node.js",
      { title: "Desenvolvedor Back-end - Node.js", company: null, location: null },
    ],
    [
      "Desenvolvedor Front-end - Londrina",
      { title: "Desenvolvedor Front-end - Londrina", company: null, location: null },
    ],
  ])("parseIssueTitle(%s)", (title, expected) => {
    expect(parseIssueTitle(title)).toEqual(expected);
  });
});

describe("Remotive", () => {
  it("marca tudo como remoto, mantém o link original e interpreta a data sem fuso como UTC", async () => {
    const jobs = await collect(
      createRemotiveCollector({ category: "software-dev", search: "react" }, deps()),
    );
    expect(jobs).toHaveLength(3);
    expect(jobs.every((job) => job.modality === "remoto")).toBe(true);
    expect(jobs[0]).toMatchObject({
      company: "Northwind Labs",
      seniority: "senior",
      location: "Latin America",
      salaryMin: 6000,
      salaryMax: 8000,
      currency: "USD",
      url: "https://remotive.com/remote-jobs/software-dev/senior-react-developer-2034567",
    });
    expect(jobs[0]?.postedAt?.toISOString()).toBe("2026-11-19T10:21:43.000Z");
    expect(jobs[1]?.contract).toBe("contractor");
  });
});

describe("validação de fronteira", () => {
  it("descarta item fora do formato sem derrubar a fonte", async () => {
    const warn = vi.fn();
    const broken = new Response(JSON.stringify({ jobs: [{ id: "sem-titulo" }] }), { status: 200 });
    const fetchFn = createFixtureFetch({
      "https://boards-api.greenhouse.io/v1/boards/quebrado/jobs?content=true": broken,
    });
    const collector = createGreenhouseCollector(
      { token: "quebrado", company: "Q" },
      { fetch: fetchFn, warn },
    );
    await expect(collector.fetchJobs()).resolves.toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("monta um coletor por empresa, repositório e busca configurados", () => {
    const collectors = buildCollectors(FIXTURE_SOURCES, deps());
    expect(collectors.map((collector) => collector.id)).toEqual([
      "greenhouse:ilia",
      "greenhouse:platformscience",
      "lever:ciandt",
      "lever:oowlish",
      "github:frontendbr/vagas",
      "github:react-brasil/vagas",
      "github:backend-br/vagas",
      "remotive:software-dev:react",
    ]);
  });
});
