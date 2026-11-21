import { type Profile, profileTechnologies } from "@/domain/profile";
import { findTechnologies } from "@/domain/tech-catalog";
import { normalizeForMatch } from "@/lib/text";

export type ViolationKind = "tecnologia" | "numero" | "nome";

export interface Violation {
  readonly kind: ViolationKind;
  readonly term: string;
}

export interface DraftTarget {
  readonly title: string;
  readonly company: string;
}

const NUMBER = /(?<![\p{L}\p{N}])\d+(?:[.,]\d+)?(?![\p{L}\p{N}])/gu;
const WORD = /\p{L}[\p{L}\p{N}]*/gu;
const SENTENCE_BREAK = /[.!?:;]+(?:\s+|$)|\n+/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Citar o título e a empresa da vaga não é afirmar experiência, então eles saem da checagem. */
function withoutTarget(text: string, target: DraftTarget): string {
  return [target.title, target.company]
    .filter((term) => term.trim().length > 0)
    .reduce((acc, term) => acc.replace(new RegExp(escapeRegExp(term), "giu"), " "), text);
}

function numbersIn(text: string): Set<string> {
  return new Set(text.match(NUMBER) ?? []);
}

function vocabulary(profile: Profile): Set<string> {
  const sources = [
    profile.name,
    profile.headline,
    profile.currentCompany,
    ...profile.targets,
    ...profile.facts.map((fact) => fact.text),
    // "CI/CD" vem de "integração contínua": o nome canônico também precisa ser aceito.
    ...profileTechnologies(profile),
  ];
  return new Set(sources.flatMap((source) => (source.match(WORD) ?? []).map(normalizeForMatch)));
}

/**
 * Nomes próprios no meio da frase (empresas, produtos, certificações) precisam
 * existir no vocabulário dos fatos. A primeira palavra da frase é ignorada porque
 * em português ela é maiúscula por gramática, não por ser nome.
 */
function unknownProperNouns(text: string, known: Set<string>): string[] {
  const unknown = new Set<string>();
  for (const sentence of text.split(SENTENCE_BREAK)) {
    const words = sentence.match(WORD) ?? [];
    for (const word of words.slice(1)) {
      const isCapitalized = word[0] !== undefined && word[0] !== word[0].toLowerCase();
      if (isCapitalized && !known.has(normalizeForMatch(word))) unknown.add(word);
    }
  }
  return [...unknown];
}

/**
 * Reprova o rascunho que citar tecnologia, número ou nome próprio ausentes de
 * `profile.facts`. Lista vazia significa aprovado.
 */
export function verifyDraft(text: string, profile: Profile, target: DraftTarget): Violation[] {
  const scrubbed = withoutTarget(text, target);
  const allowedTechs = profileTechnologies(profile);
  const allowedNumbers = numbersIn(profile.facts.map((fact) => fact.text).join("\n"));
  const techViolations = findTechnologies(scrubbed)
    .filter((tech) => !allowedTechs.has(tech))
    .map((term): Violation => ({ kind: "tecnologia", term }));
  const numberViolations = [...numbersIn(scrubbed)]
    .filter((value) => !allowedNumbers.has(value))
    .map((term): Violation => ({ kind: "numero", term }));
  const flaggedTechs = new Set(
    techViolations.map((violation) => normalizeForMatch(violation.term)),
  );
  const nameViolations = unknownProperNouns(scrubbed, vocabulary(profile))
    .filter((word) => !flaggedTechs.has(normalizeForMatch(word)))
    .map((term): Violation => ({ kind: "nome", term }));
  return [...techViolations, ...numberViolations, ...nameViolations];
}
