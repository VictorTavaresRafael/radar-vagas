import { scoring } from "@config/scoring";
import {
  factTechnologies,
  type Profile,
  type ProfileFact,
  profileTechnologies,
} from "@/domain/profile";
import { findTechnologies, type TechName } from "@/domain/tech-catalog";
import { normalizeForMatch, truncate } from "@/lib/text";
import { type DraftKind, MESSAGE_MAX_LENGTH } from "./kinds";
import type { DraftTarget } from "./verify";

export interface DraftJob extends DraftTarget {
  readonly description: string;
}

export type DraftTexts = Record<DraftKind, string>;

/** Tecnologias da stack-alvo valem o peso do score; as demais valem 1. */
function techWeight(tech: TechName): number {
  return (
    scoring.stack.find((item) => (item.techs as readonly TechName[]).includes(tech))?.weight ?? 1
  );
}

function overlap(fact: ProfileFact, jobTechs: ReadonlySet<TechName>): number {
  return factTechnologies(fact)
    .filter((tech) => jobTechs.has(tech))
    .reduce((sum, tech) => sum + techWeight(tech), 0);
}

/** Experiências mais relevantes para a vaga primeiro; empate mantém a ordem do perfil. */
export function rankExperienceFacts(
  profile: Profile,
  jobTechs: ReadonlySet<TechName>,
): ProfileFact[] {
  return profile.facts
    .filter((fact) => fact.kind === "experiencia")
    .map((fact, index) => ({ fact, index, score: overlap(fact, jobTechs) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.fact);
}

function factsOfKind(profile: Profile, kind: ProfileFact["kind"]): ProfileFact[] {
  return profile.facts.filter((fact) => fact.kind === kind);
}

function jobTechnologies(job: DraftJob): Set<TechName> {
  return new Set(findTechnologies(`${job.title}\n${job.description}`));
}

/** Tecnologias que a vaga pede e o perfil comprova: as únicas que os templates citam. */
function sharedTechnologies(profile: Profile, job: DraftJob): TechName[] {
  const known = profileTechnologies(profile);
  return [...jobTechnologies(job)].filter((tech) => known.has(tech));
}

function chooseTarget(profile: Profile, job: DraftJob): string {
  const text = normalizeForMatch(`${job.title} ${job.description}`);
  const [frontEnd, fullStack, qa] = profile.targets;
  if (
    qa &&
    /\b(qa|sdet|quality|qualidade|automacao de testes)\b/.test(normalizeForMatch(job.title))
  )
    return qa;
  if (fullStack && /\b(full ?stack|node|nestjs|back-?end)\b/.test(text)) return fullStack;
  return frontEnd ?? profile.headline;
}

function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items.at(-1)}`;
}

function resumoTemplate(profile: Profile, job: DraftJob): string {
  const experiences = rankExperienceFacts(profile, jobTechnologies(job)).slice(0, 2);
  return [
    ...factsOfKind(profile, "cargo"),
    ...experiences,
    ...factsOfKind(profile, "formacao").slice(0, 1),
  ]
    .map((fact) => fact.text)
    .join(" ");
}

function messageCandidate(profile: Profile, job: DraftJob, techs: readonly string[]): string {
  const stack = techs.length > 0 ? ` Tenho experiência com ${joinList(techs)}.` : "";
  return `Olá! Sou ${profile.firstName}, ${profile.headline} na ${profile.currentCompany}. Vi a vaga de ${job.title} na ${job.company} e gostaria de conversar.${stack} Posso enviar meu currículo?`;
}

/** Vai retirando tecnologias até caber no limite; o título longo é o último recurso. */
function mensagemTemplate(profile: Profile, job: DraftJob): string {
  const techs = sharedTechnologies(profile, job).slice(0, 4);
  for (let count = techs.length; count >= 0; count -= 1) {
    const candidate = messageCandidate(profile, job, techs.slice(0, count));
    if (candidate.length <= MESSAGE_MAX_LENGTH) return candidate;
  }
  return truncate(messageCandidate(profile, job, []), MESSAGE_MAX_LENGTH);
}

function sobreTemplate(profile: Profile, job: DraftJob): string {
  const techs = jobTechnologies(job);
  const experiences = rankExperienceFacts(profile, techs).slice(0, 3);
  const extras = [
    ...factsOfKind(profile, "formacao"),
    ...factsOfKind(profile, "certificacao"),
  ].filter((fact) => overlap(fact, techs) > 0);
  const education = extras.length > 0 ? extras : factsOfKind(profile, "formacao").slice(0, 1);
  return [
    ...factsOfKind(profile, "cargo").map((fact) => fact.text),
    ...experiences.map((fact) => fact.text),
    ...education.map((fact) => fact.text),
    `Busco uma posição como ${chooseTarget(profile, job)}.`,
  ].join(" ");
}

export function templateDrafts(profile: Profile, job: DraftJob): DraftTexts {
  return {
    resumo: resumoTemplate(profile, job),
    mensagem: mensagemTemplate(profile, job),
    sobre: sobreTemplate(profile, job),
  };
}
