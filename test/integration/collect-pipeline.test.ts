import { profile } from "@config/profile";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildCollectors } from "@/collectors";
import type { Collector } from "@/collectors/types";
import { createPgliteDb, type DbHandle } from "@/db/client";
import {
  changeJobStatus,
  getApplication,
  listJobEvents,
  listKanbanCards,
} from "@/db/repositories/applications";
import { getJob, listJobs } from "@/db/repositories/jobs";
import { parseJobFilters } from "@/domain/filters";
import type { NormalizedJob } from "@/domain/job";
import { type CollectDeps, runCollect } from "@/pipeline/collect";
import type { AlertJob, Notifier } from "@/pipeline/notify";
import { createFixtureFetch, FIXTURE_NOW, FIXTURE_SOURCES } from "../support/fixtures";
import { makeJob } from "../support/jobs";
import { fakeLlm } from "../support/llm";

let handle: DbHandle;

beforeEach(async () => {
  handle = createPgliteDb();
  await handle.migrate();
});

afterEach(async () => {
  await handle.close();
});

function recordingNotifier(): Notifier & { sent: AlertJob[][] } {
  const sent: AlertJob[][] = [];
  return { sent, notify: async (jobs) => void sent.push([...jobs]) };
}

function deps(overrides: Partial<CollectDeps> = {}): CollectDeps {
  return {
    db: handle.db,
    collectors: buildCollectors(FIXTURE_SOURCES, { fetch: createFixtureFetch(), warn: () => {} }),
    scoreContext: { profile, salaryFloorBrl: 6000, llmWeight: 0.3, now: FIXTURE_NOW },
    llm: null,
    notifier: null,
    log: () => {},
    ...overrides,
  };
}

const all = parseJobFilters({ status: "todas" });

describe("npm run collect (pipeline)", () => {
  it("coleta todas as fontes, deduplica, pontua e grava", async () => {
    const notifier = recordingNotifier();
    const report = await runCollect(deps({ notifier }));

    expect(report.collectors.every((collector) => collector.error === null)).toBe(true);
    expect(report.normalized).toBe(19);
    expect(report.unique).toBe(17);
    expect(report.inserted).toBe(17);
    expect(report.top).toHaveLength(10);
    const topScores = report.top.map((job) => job.score);
    expect(topScores).toEqual(topScores.toSorted((a, b) => b - a));

    const jobs = await listJobs(handle.db, all);
    expect(jobs).toHaveLength(17);
    expect(jobs.map((job) => job.score)).toEqual(
      [...jobs.map((job) => job.score)].sort((a, b) => b - a),
    );

    const ilia = jobs.find((job) => job.title === "Desenvolvedor(a) Front-end React (Pleno)");
    expect(ilia?.source).toBe("greenhouse");
    expect(ilia?.altUrls).toEqual(["https://github.com/frontendbr/vagas/issues/2101"]);

    const eliminated = jobs.filter((job) => job.score === 0).map((job) => job.title);
    expect(eliminated).toEqual(
      expect.arrayContaining([
        "Desenvolvedor(a) Back-end .NET (Pleno)",
        "Engenheiro(a) de Software Sênior - Front-end",
        "Software Engineer II, Frontend (React)",
        "Pessoa Desenvolvedora Java Pleno",
        "Desenvolvedor(a) Front-end Pleno - Presencial",
        "Senior React Developer",
        "Desenvolvedor Golang Pleno",
        "Desenvolvedor React Pleno",
      ]),
    );

    expect(notifier.sent).toHaveLength(1);
    expect(notifier.sent[0]?.every((alert) => alert.score >= 80)).toBe(true);
    expect(notifier.sent[0]?.map((alert) => alert.company)).toEqual(
      expect.arrayContaining(["ília", "CI&T", "Pé Vermelho Tech"]),
    );
  });

  it("guarda o breakdown completo e o evento de criação", async () => {
    await runCollect(deps());
    const [top] = await listJobs(handle.db, all);
    if (!top) throw new Error("nenhuma vaga gravada");
    const job = await getJob(handle.db, top.id);
    expect(job?.scoreBreakdown.components).toHaveLength(5);
    expect(job?.scoreBreakdown.final).toBe(job?.score);
    expect(job?.remote).toBe(job?.modality === "remoto");
    const history = await listJobEvents(handle.db, top.id);
    expect(history.map((event) => event.type)).toEqual(["criada"]);
  });

  it("é idempotente: a segunda coleta só atualiza last_seen_at", async () => {
    await runCollect(deps());
    const later = new Date(FIXTURE_NOW.getTime() + 3_600_000);
    const second = await runCollect(
      deps({ scoreContext: { profile, salaryFloorBrl: 6000, llmWeight: 0.3, now: later } }),
    );
    expect(second.inserted).toBe(0);
    expect(second.updated).toBe(17);
    const [top] = await listJobs(handle.db, all);
    const job = top ? await getJob(handle.db, top.id) : undefined;
    expect(job?.lastSeenAt.toISOString()).toBe(later.toISOString());
    expect(job?.firstSeenAt.toISOString()).toBe(FIXTURE_NOW.toISOString());
  });

  it("grava em paralelo sem violar o índice de fonte + id externo", async () => {
    // Mesmo id externo com títulos diferentes: dedupe gera duas vagas, o banco aceita uma.
    const repeated = [
      makeJob({ externalId: "42", title: "Desenvolvedor Front-end Pleno" }),
      makeJob({ externalId: "42", title: "Desenvolvedor Front-end Pleno (vaga reaberta)" }),
      ...Array.from({ length: 12 }, (_, index) =>
        makeJob({ externalId: `x${index}`, title: `Vaga ${index}` }),
      ),
    ];
    const collector: Collector<NormalizedJob> = {
      id: "greenhouse:teste",
      source: "greenhouse",
      fetchJobs: async () => repeated,
      normalize: (job) => job,
    };
    const report = await runCollect(deps({ collectors: [collector as Collector<unknown>] }));
    expect(report.unique).toBe(14);
    expect(report.inserted).toBe(13);
    expect(report.updated).toBe(1);
  });

  it("isola a fonte que falhou e segue com as outras", async () => {
    const offline = createFixtureFetch({
      "https://remotive.com/api/remote-jobs?category=software-dev&search=react": new Response(
        "erro",
        {
          status: 503,
        },
      ),
    });
    const report = await runCollect(
      deps({ collectors: buildCollectors(FIXTURE_SOURCES, { fetch: offline, warn: () => {} }) }),
    );
    const remotive = report.collectors.find((collector) => collector.id.startsWith("remotive"));
    expect(remotive?.error).toContain("HTTP 503");
    expect(report.inserted).toBe(15);
  });

  it("usa o LLM só nas vagas que passaram nos filtros", async () => {
    const llm = fakeLlm({ nota: 60, justificativa: "Aderência parcial." });
    await runCollect(deps({ llm }));
    const jobs = await listJobs(handle.db, all);
    const notEliminated = jobs.filter((job) => job.score > 0);
    expect(llm.requests).toHaveLength(notEliminated.length);
  });

  it("aplica os filtros do painel", async () => {
    await runCollect(deps());
    const remote = await listJobs(
      handle.db,
      parseJobFilters({ modality: "remoto", minScore: "60" }),
    );
    expect(remote.length).toBeGreaterThan(0);
    expect(remote.every((job) => job.modality === "remoto" && job.score >= 60)).toBe(true);
    const search = await listJobs(handle.db, parseJobFilters({ q: "nestjs", status: "todas" }));
    expect(search.map((job) => job.company)).toEqual(expect.arrayContaining(["LogiTrack", "CI&T"]));
    const github = await listJobs(
      handle.db,
      parseJobFilters({ source: "github", status: "todas" }),
    );
    expect(github.every((job) => job.source === "github")).toBe(true);
  });

  it("filtra por região e salário sem esconder vagas sem salário", async () => {
    await runCollect(deps());
    const everything = await listJobs(handle.db, all);
    const abroad = await listJobs(
      handle.db,
      parseJobFilters({ region: "exterior", status: "todas" }),
    );
    expect(abroad.length).toBeGreaterThan(0);
    expect(abroad.every((job) => job.region !== null && job.region !== "brasil")).toBe(true);
    const brazil = await listJobs(
      handle.db,
      parseJobFilters({ region: "brasil", status: "todas" }),
    );
    expect(brazil.every((job) => job.region === "brasil")).toBe(true);

    const floor = 9000;
    const filtered = await listJobs(
      handle.db,
      parseJobFilters({ minSalary: String(floor), status: "todas" }),
    );
    const belowFloor = (job: (typeof everything)[number]) =>
      job.currency === "BRL" && (job.salaryMax ?? job.salaryMin ?? Infinity) < floor;
    expect(filtered.some(belowFloor)).toBe(false);
    expect(filtered.some((job) => job.salaryMin === null)).toBe(true);
    expect(filtered).toHaveLength(everything.filter((job) => !belowFloor(job)).length);
  });
});

describe("candidaturas", () => {
  it("troca de status registra evento, cria candidatura e alimenta o kanban", async () => {
    await runCollect(deps());
    const [top] = await listJobs(handle.db, all);
    if (!top) throw new Error("nenhuma vaga gravada");

    await changeJobStatus(handle.db, top.id, "interessante", FIXTURE_NOW);
    expect(await getApplication(handle.db, top.id)).toBeUndefined();

    await changeJobStatus(handle.db, top.id, "candidatado", FIXTURE_NOW);
    await changeJobStatus(handle.db, top.id, "entrevista", FIXTURE_NOW);

    const application = await getApplication(handle.db, top.id);
    expect(application?.status).toBe("entrevista");
    expect(application?.appliedAt.toISOString()).toBe(FIXTURE_NOW.toISOString());

    const history = await listJobEvents(handle.db, top.id);
    expect(
      history.filter((event) => event.type === "status").map((event) => event.payload),
    ).toEqual(
      expect.arrayContaining([
        { from: "nova", to: "interessante" },
        { from: "interessante", to: "candidatado" },
        { from: "candidatado", to: "entrevista" },
      ]),
    );

    const cards = await listKanbanCards(handle.db, ["entrevista"]);
    expect(cards).toEqual([expect.objectContaining({ jobId: top.id, status: "entrevista" })]);

    const hidden = await listJobs(handle.db, parseJobFilters({}));
    await changeJobStatus(handle.db, top.id, "descartada", FIXTURE_NOW);
    const afterDiscard = await listJobs(handle.db, parseJobFilters({}));
    expect(afterDiscard).toHaveLength(hidden.length - 1);
  });
});
