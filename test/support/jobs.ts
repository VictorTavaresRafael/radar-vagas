import { profile } from "@config/profile";
import type { NormalizedJob } from "@/domain/job";
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
