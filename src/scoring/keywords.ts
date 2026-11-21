import { type Profile, profileTechnologies } from "@/domain/profile";
import { findTechnologies, mentions, type TechName } from "@/domain/tech-catalog";
import type { KeywordReport } from "./types";

/**
 * Palavras-chave de ATS da vaga comparadas com o currículo. O que falta no CV é
 * separado entre o que o perfil comprova ("tem e não escreveu") e o que não comprova.
 */
export function analyzeKeywords(jobText: string, profile: Profile): KeywordReport {
  const known = profileTechnologies(profile);
  const inResume: TechName[] = [];
  const hasNotWritten: TechName[] = [];
  const missing: TechName[] = [];
  for (const tech of findTechnologies(jobText)) {
    if (mentions(profile.resume, tech)) inResume.push(tech);
    else if (known.has(tech)) hasNotWritten.push(tech);
    else missing.push(tech);
  }
  return { inResume, hasNotWritten, missing };
}
