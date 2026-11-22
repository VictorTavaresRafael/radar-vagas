import type { GithubRepo } from "@config/sources";
import { z } from "zod";
import type { NormalizedJob } from "@/domain/job";
import { findTechnologies } from "@/domain/tech-catalog";
import { parseDate } from "@/lib/dates";
import { markdownToText, normalizeForMatch } from "@/lib/text";
import {
  inferContract,
  inferModality,
  inferSeniority,
  isBrazilLocation,
  parseSalary,
} from "./infer";
import { type Collector, type CollectorDeps, type FetchLike, getJson, parseItems } from "./types";

export const githubIssueSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string().min(1),
  html_url: z.url(),
  body: z.string().nullable(),
  labels: z.array(z.object({ name: z.string() })).default([]),
  created_at: z.string(),
  user: z.object({ login: z.string() }).nullish(),
  pull_request: z.unknown().optional(),
});

export type GithubIssue = z.infer<typeof githubIssueSchema>;

export function githubIssuesUrl(repo: GithubRepo): string {
  return `https://api.github.com/repos/${repo.owner}/${repo.repo}/issues?state=open&per_page=100`;
}

/** Tags entre colchetes que indicam modalidade, não local: "[Remoto]", "[Híbrido]". */
const MODALITY_TAG = /^(remoto|remote|hibrido|hybrid|presencial|home ?office|100% remoto)$/;
const NOT_A_COMPANY = /^(brasil|brazil|remoto|remote|home ?office|latam|sp|sao paulo)$/;

// Trecho final que descreve a vaga, não quem contrata: "- Pleno", "- Remoto", "- PJ".
const NOT_A_COMPANY_SUFFIX =
  /\b(junior|jr|pleno|pl|senior|sr|estagio|trainee|remoto|remote|hibrido|hybrid|presencial|pj|clt|freela|freelancer|contrato|vaga|afirmativa|pcd|full ?time|part ?time|meio periodo)\b/;

/**
 * "Cargo - Detalhe - Empresa": sem "@" nem "na Empresa", o último trecho depois de " - " é a
 * empresa quando não descreve a vaga (nível, modalidade, contrato), não é local nem tecnologia,
 * e não está todo em maiúsculas (costuma ser cidade: "PORT LOUIS").
 */
function companyFromSuffix(rest: string): { title: string; company: string } | null {
  const parts = rest.split(/\s+[-–|]\s+/);
  if (parts.length < 2) return null;
  const candidate = (parts.at(-1) ?? "").trim();
  const normalized = normalizeForMatch(candidate);
  const looksLikeName =
    candidate.length >= 2 &&
    candidate.length <= 40 &&
    !/[/()]/.test(candidate) &&
    candidate !== candidate.toUpperCase() &&
    !NOT_A_COMPANY.test(normalized) &&
    !NOT_A_COMPANY_SUFFIX.test(normalized) &&
    isBrazilLocation(candidate) !== true &&
    findTechnologies(candidate).length === 0;
  return looksLikeName ? { title: parts.slice(0, -1).join(" - "), company: candidate } : null;
}

interface ParsedTitle {
  readonly title: string;
  readonly company: string | null;
  readonly location: string | null;
}

/**
 * Títulos dos repositórios de vagas seguem "[Local] Cargo @ Empresa" ou "Cargo na Empresa".
 * Só o "@" é inequívoco; "na/no/at" vale se o que vem depois não for local ou modalidade.
 */
export function parseIssueTitle(rawTitle: string): ParsedTitle {
  const tags = [...rawTitle.matchAll(/\[([^\]]+)\]/g)].map((match) => (match[1] ?? "").trim());
  const locations = tags.filter((tag) => !MODALITY_TAG.test(normalizeForMatch(tag)));
  let rest = rawTitle
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  let company: string | null = null;
  const atMatch = /^(.*?)\s*@\s*(.+)$/.exec(rest);
  const prepositionMatch = /^(.*)\s(?:na|no|at)\s+(\p{Lu}.+)$/u.exec(rest);
  if (atMatch?.[1] && atMatch[2]) {
    [rest, company] = [atMatch[1], atMatch[2]];
  } else if (
    prepositionMatch?.[1] &&
    prepositionMatch[2] &&
    !NOT_A_COMPANY.test(normalizeForMatch(prepositionMatch[2]))
  ) {
    [rest, company] = [prepositionMatch[1], prepositionMatch[2]];
  } else {
    const suffix = companyFromSuffix(rest);
    if (suffix) [rest, company] = [suffix.title, suffix.company];
  }
  return {
    title: rest.replace(/\s*[-|–]\s*$/, "").trim(),
    company: company?.trim() || null,
    location: locations.length > 0 ? locations.join(", ") : null,
  };
}

export function normalizeGithubIssue(raw: GithubIssue, repo: GithubRepo): NormalizedJob {
  const parsed = parseIssueTitle(raw.title);
  const description = markdownToText(raw.body ?? "");
  const labels = raw.labels.map((label) => label.name).join(" ");
  const salary = parseSalary(`${raw.title}\n${description}`);
  return {
    source: "github",
    externalId: `${repo.owner}/${repo.repo}#${raw.number}`,
    // Sem empresa no título, o autor da issue é o melhor identificador para dedupe.
    company: parsed.company ?? raw.user?.login ?? `${repo.owner}/${repo.repo}`,
    title: parsed.title,
    url: raw.html_url,
    location: parsed.location,
    modality: inferModality(`${labels} ${raw.title}`, description),
    seniority: inferSeniority(labels, parsed.title),
    contract: inferContract(labels, raw.title, description),
    salaryMin: salary?.min ?? null,
    salaryMax: salary?.max ?? null,
    currency: salary?.currency ?? null,
    description,
    postedAt: parseDate(raw.created_at),
  };
}

export interface GithubCollectorDeps extends CollectorDeps {
  /** Opcional: sem token a API permite 60 req/h, suficiente para 3 repositórios. */
  readonly token?: string | undefined;
}

export function createGithubIssuesCollector(
  repo: GithubRepo,
  deps: GithubCollectorDeps,
): Collector<GithubIssue> {
  const id = `github:${repo.owner}/${repo.repo}`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "radar-vagas",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(deps.token ? { Authorization: `Bearer ${deps.token}` } : {}),
  };
  return {
    id,
    source: "github",
    async fetchJobs() {
      const body = z
        .array(z.unknown())
        .parse(await getJson(deps.fetch, githubIssuesUrl(repo), headers));
      // A API de issues também devolve pull requests; eles não são vagas.
      return parseItems(body, githubIssueSchema, id, deps.warn).filter(
        (issue) => !issue.pull_request,
      );
    },
    normalize: (raw) => normalizeGithubIssue(raw, repo),
  };
}

export type IssueState = "open" | "closed";

const ISSUE_URL = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/(\d+)/;

/**
 * Estado atual de uma issue de vaga pela API do GitHub. null quando a URL não é de issue ou
 * a API não respondeu: na dúvida a vaga continua aberta.
 */
export function createIssueStateChecker(
  fetchFn: FetchLike,
  token?: string,
): (url: string) => Promise<IssueState | null> {
  return async (url) => {
    const match = ISSUE_URL.exec(url);
    if (!match) return null;
    const [, owner, repo, number] = match;
    const response = await fetchFn(
      `https://api.github.com/repos/${owner}/${repo}/issues/${number}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );
    if (!response.ok) return null;
    const parsed = z.object({ state: z.enum(["open", "closed"]) }).safeParse(await response.json());
    return parsed.success ? parsed.data.state : null;
  };
}
