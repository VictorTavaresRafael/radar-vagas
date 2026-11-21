import { createHash } from "node:crypto";
import type { MergedJob, NormalizedJob } from "@/domain/job";
import { normalizeForMatch } from "@/lib/text";

const COMPANY_SUFFIXES =
  /\b(ltda|s\/?a|sa|inc|llc|ltd|corp|corporation|company|co|gmbh|me|eireli|tecnologia|technologies|technology)\b\.?/g;

export function normalizeCompany(company: string): string {
  return normalizeForMatch(company)
    .replace(/&/g, " and ")
    .replace(COMPANY_SUFFIXES, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const SENIORITY_IN_PARENS =
  /\((?:\s*(?:junior|jr|pleno|pl|mid|senior|sr|especialista|staff)\s*[/|,-]?\s*)+\)/g;
const GENDER_MARKERS = /\((?:a|o|as|os|e)\)|\/a\b/g;

/**
 * Título comparável entre fontes: sem acentos, minúsculas, sem senioridade entre
 * parênteses, sem tags "[Remoto]" do GitHub e sem marcadores de gênero "(a)".
 */
export function normalizeTitle(title: string): string {
  return normalizeForMatch(title)
    .replace(/\[[^\]]*\]/g, " ")
    .replace(SENIORITY_IN_PARENS, " ")
    .replace(GENDER_MARKERS, "")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim();
}

export function dedupeKey(company: string, title: string): string {
  const basis = `${normalizeCompany(company)}|${normalizeTitle(title)}`;
  return createHash("sha256").update(basis).digest("hex").slice(0, 32);
}

const SOURCE_PRIORITY: Record<NormalizedJob["source"], number> = {
  greenhouse: 0,
  lever: 1,
  remotive: 2,
  github: 3,
};

/**
 * Agrupa vagas iguais vindas de fontes diferentes. Mantém como principal a fonte
 * mais estruturada (ATS da empresa antes de agregadores) e guarda as outras URLs.
 */
export function dedupeJobs(jobs: readonly NormalizedJob[]): MergedJob[] {
  const byKey = new Map<string, MergedJob>();
  const ordered = [...jobs].sort((a, b) => SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source]);
  for (const job of ordered) {
    const key = dedupeKey(job.company, job.title);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...job, dedupeKey: key, altUrls: [] });
    } else if (job.url !== existing.url && !existing.altUrls.includes(job.url)) {
      existing.altUrls.push(job.url);
    }
  }
  return [...byKey.values()];
}
