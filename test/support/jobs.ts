import { profile } from "@config/profile";
import type { Db } from "@/db/client";
import { insertJob } from "@/db/repositories/jobs";
import type { JobRow } from "@/db/schema";
import type { NormalizedJob } from "@/domain/job";
import { dedupeJobs } from "@/pipeline/dedupe";
import { scoreJob } from "@/scoring/score";
import type { ScoreContext } from "@/scoring/types";
import { FIXTURE_NOW } from "./fixtures";

export function makeJob(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    source: "greenhouse",
    externalId: "1",
    company: "Empresa Exemplo",
    title: "Desenvolvedor Front-end Pleno",
    url: "https://example.com/vagas/1",
    location: "Remoto - Brasil",
    modality: "remoto",
    seniority: "pleno",
    contract: "clt",
    salaryMin: null,
    salaryMax: null,
    currency: null,
    description: "Requisitos\n- React e TypeScript",
    postedAt: FIXTURE_NOW,
    ...overrides,
  };
}

export function makeContext(overrides: Partial<ScoreContext> = {}): ScoreContext {
  return { profile, salaryFloorBrl: 6000, llmWeight: 0.3, now: FIXTURE_NOW, ...overrides };
}

/** Grava uma vaga no banco de teste pelo mesmo caminho da coleta (dedupe + score + insert). */
export async function insertTestJob(
  db: Db,
  overrides: Partial<NormalizedJob> = {},
  now: Date = FIXTURE_NOW,
): Promise<JobRow> {
  const job = makeJob(overrides);
  const [merged] = dedupeJobs([job]);
  if (!merged) throw new Error("dedupe não devolveu a vaga de teste");
  return insertJob(db, merged, await scoreJob(job, makeContext({ now }), null), now);
}
