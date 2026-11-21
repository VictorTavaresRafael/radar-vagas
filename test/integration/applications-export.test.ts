import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPgliteDb, type DbHandle } from "@/db/client";
import {
  changeJobStatus,
  listApplicationsForExport,
  saveApplicationDetails,
} from "@/db/repositories/applications";
import { FIXTURE_NOW } from "../support/fixtures";
import { insertTestJob } from "../support/jobs";

let handle: DbHandle;

beforeEach(async () => {
  handle = createPgliteDb();
  await handle.migrate();
});

afterEach(async () => {
  await handle.close();
});

const day = (offset: number) => new Date(FIXTURE_NOW.getTime() + offset * 86_400_000);

describe("exportação de candidaturas", () => {
  it("traz só vagas com candidatura, da mais recente para a mais antiga", async () => {
    const older = await insertTestJob(handle.db, { externalId: "1", title: "Front-end Pleno" });
    const newer = await insertTestJob(handle.db, { externalId: "2", title: "Full Stack Pleno" });
    await insertTestJob(handle.db, { externalId: "3", title: "QA Automação" });

    await changeJobStatus(handle.db, older.id, "candidatado", day(1));
    await changeJobStatus(handle.db, newer.id, "candidatado", day(2));
    await changeJobStatus(handle.db, newer.id, "entrevista", day(3));
    await saveApplicationDetails(handle.db, newer.id, {
      channel: "Indicação",
      nextStep: "Entrevista técnica",
      nextStepAt: day(5),
      notes: "Levar portfólio",
    });

    const rows = await listApplicationsForExport(handle.db);
    expect(rows.map((row) => [row.title, row.status])).toEqual([
      ["Full Stack Pleno", "entrevista"],
      ["Front-end Pleno", "candidatado"],
    ]);
    expect(rows[0]).toMatchObject({ channel: "Indicação", nextStep: "Entrevista técnica" });
  });
});
