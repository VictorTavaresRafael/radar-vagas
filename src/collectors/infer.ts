import type { Contract, Currency, Modality, Seniority } from "@/domain/job";
import { normalizeForMatch } from "@/lib/text";

/**
 * Heurísticas compartilhadas pelos coletores para extrair atributos que as APIs não
 * entregam estruturados. Todas trabalham sobre texto normalizado (sem acentos).
 */

const SENIORITY_PATTERNS: ReadonlyArray<readonly [Seniority, RegExp]> = [
  ["senior", /\b(senior|sr|especialista|staff|principal|lead|tech lead)\b/],
  ["pleno", /\b(pleno|pl|mid|mid-level|middle)\b|\b(?:engineer|developer|desenvolvedor[a]?) ii\b/],
  ["junior", /\b(junior|jr|trainee|estagio|estagiari[oa])\b/],
];

/** Senioridade pelo título (ou labels); "Júnior/Pleno" conta como pleno. */
export function inferSeniority(...texts: readonly string[]): Seniority | null {
  const haystack = normalizeForMatch(texts.join(" "));
  const found = SENIORITY_PATTERNS.filter(([, regex]) => regex.test(haystack)).map(
    ([level]) => level,
  );
  if (found.includes("pleno")) return "pleno";
  return found[0] ?? null;
}

export function isJuniorPleno(title: string): boolean {
  const text = normalizeForMatch(title);
  return /\b(junior|jr)\b/.test(text) && /\b(pleno|pl)\b/.test(text);
}

const MODALITY_PATTERNS: ReadonlyArray<readonly [Modality, RegExp]> = [
  ["hibrido", /\b(hibrido|hybrid)\b/],
  ["presencial", /\b(presencial|on-?site|in-office|alocado)\b/],
  ["remoto", /\b(remoto|remote|home ?office|anywhere|100% remoto|remote-first)\b/],
];

function matchModality(text: string): Modality | null {
  const normalized = normalizeForMatch(text);
  return MODALITY_PATTERNS.find(([, regex]) => regex.test(normalized))?.[0] ?? null;
}

/** Título e local têm prioridade: a descrição costuma citar "remoto" em benefícios. */
export function inferModality(primary: string, description: string): Modality | null {
  return matchModality(primary) ?? matchModality(description);
}

export function inferContract(...texts: readonly string[]): Contract | null {
  const text = normalizeForMatch(texts.join(" "));
  if (/\bclt\b/.test(text)) return "clt";
  if (/\b(pj|pessoa juridica)\b/.test(text)) return "pj";
  if (/\b(contractor|contract|freelance|freelancer)\b/.test(text)) return "contractor";
  return null;
}

export interface SalaryRange {
  min: number;
  max: number;
  currency: Currency;
}

const AMOUNT = String.raw`(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|\d+(?:[.,]\d+)?)\s*(k|mil(?![a-zà-ú]))?`;
const BRL_RANGE = new RegExp(
  String.raw`R\$\s*${AMOUNT}(?:\s*(?:a|até|-|–|—|to)\s*(?:R\$\s*)?${AMOUNT})?`,
  "gi",
);
const USD_RANGE = new RegExp(
  String.raw`(?:US\$|USD\s*\$?|\$)\s*${AMOUNT}(?:\s*(?:a|até|-|–|—|to)\s*(?:US\$|USD\s*\$?|\$)?\s*${AMOUNT})?`,
  "gi",
);

/**
 * Valor seguido de "bilhões", "million" etc. é cifra da empresa ("R$ 2 bi em crédito"),
 * não salário. Sem esse corte, a lista mostrava "R$ 2" e "US$ 5".
 */
const MAGNITUDE_AFTER =
  /^\s*(?:bi\b|bilh|bilion|billion|mi\b|milh|million|mm\b|tri\b|trilh|trillion|b\b|m\b)/i;

/** Abaixo disso o número não é salário mensal, anual nem por hora plausível. */
export const MIN_PLAUSIBLE_SALARY = 100;

function parseAmount(raw: string, suffix: string | undefined, currency: Currency): number {
  // Real usa "." como milhar e "," como decimal; dólar, o contrário.
  const [thousands, decimal] = currency === "BRL" ? [".", ","] : [",", "."];
  const looksLikeThousands = new RegExp(`^\\d{1,3}(\\${thousands}\\d{3})+$`).test(raw);
  const cleaned = looksLikeThousands
    ? raw.split(thousands).join("")
    : raw.split(thousands).join("").replace(decimal, ".");
  const value = Number.parseFloat(cleaned);
  return suffix ? value * 1000 : value;
}

/**
 * Em texto longo (descrição), o valor só conta como salário perto de uma palavra que diga
 * isso. Sem esse contexto, "patrimônio a partir de R$ 500.000" virava salário.
 */
const SALARY_BEFORE =
  /(sal[aá]ri|remunera|faixa|compensa|salary|pay|pagamento|bolsa|ganho|ordenado|vencimento|pretens|budget|rate|valor)[\s\S]{0,60}$/i;
const SALARY_AFTER =
  /^\s*(\/|por\b|per\b|mensa|monthly|month|anua|annual|year|yr|ano\b|hora|hour|hr\b|bruto|brutos|liquido|líquido|clt|pj|\+\s*benef)/i;
const SHORT_TEXT = 200;

function matchRange(text: string, regex: RegExp, currency: Currency): SalaryRange | null {
  const needsContext = text.length > SHORT_TEXT;
  for (const match of text.matchAll(regex)) {
    if (!match[1]) continue;
    const start = match.index ?? 0;
    const after = text.slice(start + match[0].length);
    if (MAGNITUDE_AFTER.test(after)) continue;
    if (
      needsContext &&
      !SALARY_BEFORE.test(text.slice(Math.max(0, start - 80), start)) &&
      !SALARY_AFTER.test(after)
    )
      continue;
    const min = parseAmount(match[1], match[2], currency);
    const max = match[3] ? parseAmount(match[3], match[4] ?? match[2], currency) : min;
    if (!Number.isFinite(min) || min < MIN_PLAUSIBLE_SALARY) continue;
    return { min: Math.round(Math.min(min, max)), max: Math.round(Math.max(min, max)), currency };
  }
  return null;
}

/** Primeira faixa salarial explícita (com símbolo de moeda) encontrada no texto. */
export function parseSalary(text: string): SalaryRange | null {
  return matchRange(text, BRL_RANGE, "BRL") ?? matchRange(text, USD_RANGE, "USD");
}

const BRAZIL_PLACES =
  /\b(brasil|brazil|sao paulo|rio de janeiro|londrina|bauru|curitiba|campinas|belo horizonte|porto alegre|florianopolis|recife|jau)\b/;
const BRAZIL_STATE_SUFFIX = /[,-]\s*(sp|pr|rj|mg|sc|rs|pe|ba|go|df|ce|es)\b/;

/** Diferencia "remoto no Brasil" de "remoto internacional" (LatAm, EUA, Worldwide). */
export function isBrazilLocation(location: string | null): boolean | null {
  if (!location) return null;
  const normalized = normalizeForMatch(location);
  return BRAZIL_PLACES.test(normalized) || BRAZIL_STATE_SUFFIX.test(normalized);
}
