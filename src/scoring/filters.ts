import { scoring } from "@config/scoring";
import type { NormalizedJob } from "@/domain/job";
import { type Profile, profileTechnologies } from "@/domain/profile";
import { findTechnologies, type TechName } from "@/domain/tech-catalog";
import { normalizeForMatch } from "@/lib/text";
import { classifyLines } from "./sections";
import type { Elimination, ScoreContext } from "./types";

const ALTERNATIVE = /\b(ou|or)\b/;

/**
 * Linguagem fora do perfil conta como requisito quando está no título ou numa linha
 * de requisito, exceto se a linha oferecer alternativa do perfil ("Node.js ou Java").
 */
function requiredForbiddenLanguages(job: NormalizedJob, profile: Profile): TechName[] {
  const forbidden = new Set<TechName>(scoring.elimination.forbiddenMainLanguages);
  const known = profileTechnologies(profile);
  const found = new Set(findTechnologies(job.title).filter((tech) => forbidden.has(tech)));
  for (const line of classifyLines(job.description)) {
    if (line.context !== "required") continue;
    const techs = findTechnologies(line.text);
    const hasProfileAlternative =
      ALTERNATIVE.test(normalizeForMatch(line.text)) &&
      techs.some((tech) => known.has(tech) && !forbidden.has(tech));
    if (hasProfileAlternative) continue;
    for (const tech of techs) if (forbidden.has(tech)) found.add(tech);
  }
  return [...found];
}

function requiredLines(job: NormalizedJob): string[] {
  return classifyLines(job.description)
    .filter((line) => line.context === "required")
    .map((line) => normalizeForMatch(line.text));
}

const YEARS = /(\d{1,2})\s*\+?\s*(?:anos|years|yrs)\b/g;

export function requiredYears(job: NormalizedJob): number | null {
  const years = requiredLines(job).flatMap((line) =>
    [...line.matchAll(YEARS)].map((match) => Number(match[1])),
  );
  return years.length > 0 ? Math.max(...years) : null;
}

const ENGLISH = /\b(ingles|english)\b/;
const ADVANCED_LEVEL =
  /\b(fluente|fluencia|fluent|fluency|c1|c2|nativo|native|bilingue|bilingual)\b/;

function requiresFluentEnglish(job: NormalizedJob): boolean {
  return requiredLines(job).some((line) => ENGLISH.test(line) && ADVANCED_LEVEL.test(line));
}

export function isInAcceptedCity(location: string | null, profile: Profile): boolean {
  if (!location) return false;
  const normalized = normalizeForMatch(location);
  return profile.acceptedCities.some((city) => normalized.includes(normalizeForMatch(city)));
}

function salaryCeiling(job: NormalizedJob): number | null {
  if (job.currency !== "BRL") return null;
  return job.salaryMax ?? job.salaryMin;
}

const formatBrl = (value: number): string => `R$ ${value.toLocaleString("pt-BR")}`;

/** Motivos que zeram o score. Lista vazia significa que a vaga segue para a pontuação. */
export function findEliminations(job: NormalizedJob, context: ScoreContext): Elimination[] {
  const eliminations: Elimination[] = [];
  const languages = requiredForbiddenLanguages(job, context.profile);
  if (languages.length > 0) {
    eliminations.push({
      rule: "linguagem",
      reason: `Linguagem principal fora do perfil exigida: ${languages.join(", ")}.`,
    });
  }
  const years = requiredYears(job);
  if (
    job.seniority === "senior" &&
    years !== null &&
    years >= scoring.elimination.seniorMaxRequiredYears
  ) {
    eliminations.push({
      rule: "senioridade",
      reason: `Vaga sênior/especialista exigindo ${years}+ anos de experiência.`,
    });
  }
  if (requiresFluentEnglish(job)) {
    eliminations.push({ rule: "ingles", reason: "Inglês fluente/C1 obrigatório." });
  }
  // Híbrido também exige ir ao escritório: fora das cidades aceitas é tão inviável quanto presencial.
  if (
    (job.modality === "presencial" || job.modality === "hibrido") &&
    !isInAcceptedCity(job.location ?? job.title, context.profile)
  ) {
    const label = job.modality === "presencial" ? "Presencial" : "Híbrido";
    eliminations.push({
      rule: "presencial",
      reason: `${label} fora das cidades aceitas (${job.location ?? "local não informado"}).`,
    });
  }
  const ceiling = salaryCeiling(job);
  if (context.salaryFloorBrl !== null && ceiling !== null && ceiling < context.salaryFloorBrl) {
    eliminations.push({
      rule: "salario",
      reason: `Salário divulgado (até ${formatBrl(ceiling)}) abaixo do piso de ${formatBrl(context.salaryFloorBrl)}.`,
    });
  }
  return eliminations;
}
