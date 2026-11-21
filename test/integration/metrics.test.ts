import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPgliteDb, type DbHandle } from "@/db/client";
import { changeJobStatus } from "@/db/repositories/applications";
import { getSearchMetrics } from "@/db/repositories/metrics";
import { insertTestJob } from "../support/jobs";

let handle: DbHandle;

beforeEach(async () => {
  handle = createPgliteDb();
  await handle.migrate();
});

afterEach(async () => {
  await handle.close();
});

// 21/11/2026 às 10:00 em Brasília.
const now = new Date("2026-11-21T13:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

describe("métricas da busca (banco)", () => {
  it("conta vagas por dia, funil histórico e taxa de resposta", async () => {
    const ids: string[] = [];
    for (const [index, age] of [0, 0, 1, 3, 40].entries()) {
      const job = await insertTestJob(
        handle.db,
        { externalId: String(index), title: `Vaga ${index}` },
        daysAgo(age),
      );
      ids.push(job.id);
    }
    const [a, b, c, d] = ids as [string, string, string, string];
    await changeJobStatus(handle.db, a, "candidatado", now);
    await changeJobStatus(handle.db, b, "candidatado", now);
    await changeJobStatus(handle.db, c, "candidatado", now);
    await changeJobStatus(handle.db, a, "entrevista", now);
    // Chegou à entrevista e depois foi recusada: continua contando na etapa entrevista.
    await changeJobStatus(handle.db, b, "entrevista", now);
    await changeJobStatus(handle.db, b, "recusado", now);
    await changeJobStatus(handle.db, d, "descartada", now);

    const metrics = await getSearchMetrics(handle.db, now, 7);

    expect(metrics.newJobsPerDay.map((entry) => entry.count)).toEqual([0, 0, 0, 1, 0, 1, 2]);
    expect(metrics.funnel.map((step) => [step.stage, step.count])).toEqual([
      ["nova", 5],
      ["candidatado", 3],
      ["entrevista", 2],
      ["oferta", 0],
    ]);
    expect(metrics.applications).toBe(3);
    expect(metrics.responded).toBe(2);
    expect(metrics.responseRate).toBeCloseTo(2 / 3);
  });
});
