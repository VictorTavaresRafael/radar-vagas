import { profile } from "@config/profile";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildCollectors } from "@/collectors";
import type { Collector } from "@/collectors/types";
import { createPgliteDb, type DbHandle } from "@/db/client";
import { listJobs } from "@/db/repositories/jobs";
import { parseJobFilters } from "@/domain/filters";
import { type CollectDeps, runCollect } from "@/pipeline/collect";
import { createFixtureFetch, FIXTURE_NOW, FIXTURE_SOURCES } from "../support/fixtures";

let handle: DbHandle;

beforeEach(async () => {
  handle = createPgliteDb();
  await handle.migrate();
});

afterEach(async () => {
  await handle.close();
});

const LATER = new Date(FIXTURE_NOW.getTime() + 12 * 60 * 60 * 1000);
const everything = parseJobFilters({ status: "todas", minScore: "0", closed: "1" });
const visible = parseJobFilters({ status: "todas", minScore: "0" });

function collectors(sources: Partial<typeof FIXTURE_SOURCES>): Collector<unknown>[] {
  return buildCollectors(
    { greenhouse: [], lever: [], github: [], remotive: [], ...sources },
    { fetch: createFixtureFetch(), warn: () => {} },
  );
}

function deps(overrides: Partial<CollectDeps>): CollectDeps {
  return {
    db: handle.db,
    collectors: collectors(FIXTURE_SOURCES),
    scoreContext: { profile, salaryFloorBrl: 6000, llmWeight: 0.3, now: FIXTURE_NOW },
    llm: null,
    notifier: null,
    log: () => {},
    ...overrides,
  };
}

describe("vagas encerradas", () => {
  it("vaga de Greenhouse/Lever que some numa coleta sem falhas sai da lista", async () => {
    await runCollect(deps({}));
    // Segunda coleta só com o Lever: as vagas do Greenhouse não vieram.
    const report = await runCollect(
      deps({
        collectors: collectors({ lever: FIXTURE_SOURCES.lever }),
        scoreContext: { profile, salaryFloorBrl: 6000, llmWeight: 0.3, now: LATER },
      }),
    );
    const all = await listJobs(handle.db, everything);
    const closed = all.filter((job) => job.closedAt !== null);
    expect(report.closed).toBe(closed.length);
    expect(closed.length).toBeGreaterThan(0);
    expect(closed.every((job) => job.source === "greenhouse")).toBe(true);
    // GitHub e Remotive não entregam o quadro inteiro: nunca fecham só por não virem.
    expect(all.some((job) => job.source === "github" && job.closedAt === null)).toBe(true);

    const shown = await listJobs(handle.db, visible);
    expect(shown.some((job) => job.closedAt !== null)).toBe(false);
  });

  it("não fecha nada quando alguma fonte falhou", async () => {
    await runCollect(deps({}));
    const broken: Collector<unknown> = {
      id: "greenhouse:fora-do-ar",
      source: "greenhouse",
      fetchJobs: async () => {
        throw new Error("HTTP 503");
      },
      normalize: () => {
        throw new Error("não usado");
      },
    };
    const report = await runCollect(
      deps({
        collectors: [...collectors({ lever: FIXTURE_SOURCES.lever }), broken],
        scoreContext: { profile, salaryFloorBrl: 6000, llmWeight: 0.3, now: LATER },
      }),
    );
    expect(report.closed).toBe(0);
  });

  it("issue fechada no GitHub encerra a vaga; vaga que reaparece reabre", async () => {
    await runCollect(deps({}));
    const checked: string[] = [];
    const report = await runCollect(
      deps({
        collectors: collectors({ lever: FIXTURE_SOURCES.lever }),
        scoreContext: { profile, salaryFloorBrl: 6000, llmWeight: 0.3, now: LATER },
        issueState: async (url) => {
          checked.push(url);
          return "closed";
        },
      }),
    );
    const all = await listJobs(handle.db, everything);
    const github = all.filter((job) => job.source === "github");
    expect(checked.length).toBe(github.length);
    expect(github.every((job) => job.closedAt !== null)).toBe(true);
    expect(report.closed).toBeGreaterThanOrEqual(github.length);

    // Coleta completa depois: tudo voltou, nada encerrado.
    await runCollect(
      deps({
        scoreContext: {
          profile,
          salaryFloorBrl: 6000,
          llmWeight: 0.3,
          now: new Date(LATER.getTime() + 60_000),
        },
      }),
    );
    const reopened = await listJobs(handle.db, everything);
    expect(
      reopened.filter((job) => job.source !== "remotive").every((job) => job.closedAt === null),
    ).toBe(true);
  });
});
