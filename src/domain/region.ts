import type { SourceId } from "@/domain/job";
import { normalizeForMatch } from "@/lib/text";

export const REGIONS = [
  "brasil",
  "america_latina",
  "america_norte",
  "europa",
  "asia",
  "oceania",
  "africa",
  "global",
] as const;
export type Region = (typeof REGIONS)[number];

export const REGION_LABELS: Record<Region, string> = {
  brasil: "Brasil",
  america_latina: "América Latina",
  america_norte: "América do Norte",
  europa: "Europa",
  asia: "Ásia e Oriente Médio",
  oceania: "Oceania",
  africa: "África",
  global: "Global",
};

const CONTINENT_PATTERNS: ReadonlyArray<readonly [Exclude<Region, "global">, RegExp]> = [
  [
    "brasil",
    /\b(brasil|brazil|sao paulo|rio de janeiro|belo horizonte|curitiba|campinas|porto alegre|florianopolis|recife|salvador|fortaleza|brasilia|joinville|londrina|bauru|goiania|manaus|belem)\b|[,/-]\s*(sp|rj|mg|pr|sc|rs|pe|ba|go|df|ce|es|pa|am|mt|ms|ma|pb|rn|al|se|pi|to|ro|ac|ap|rr)\b/,
  ],
  [
    "america_latina",
    /\b(latam|latin america|america latina|south america|central america|mexico|colombia|argentina|chile|peru|uruguay|paraguay|bolivia|ecuador|venezuela|costa rica|panama|guatemala|belize|medellin|bogota|buenos aires|santiago|lima|montevideo|guadalajara)\b/,
  ],
  [
    "america_norte",
    /\b(united states|usa|us|u\.s\.|canada|new york|nyc|san francisco|austin|seattle|boston|chicago|los angeles|denver|toronto|vancouver|montreal)\b/,
  ],
  [
    "europa",
    /\b(europe|europa|emea|eu|united kingdom|uk|england|london|ireland|dublin|germany|berlin|munich|portugal|lisbon|lisboa|porto|spain|madrid|barcelona|france|paris|netherlands|amsterdam|poland|warsaw|sweden|stockholm|nordics|denmark|norway|finland|italy|romania|ukraine|switzerland|austria|belgium|czech)\b/,
  ],
  [
    "asia",
    /\b(asia|apac|india|chennai|bangalore|bengaluru|hyderabad|pune|mumbai|singapore|japan|tokyo|china|hong kong|korea|philippines|vietnam|indonesia|malaysia|thailand|israel|tel aviv|ksa|saudi|uae|dubai|qatar|turkey)\b/,
  ],
  ["oceania", /\b(australia|sydney|melbourne|new zealand|auckland)\b/],
  ["africa", /\b(africa|nigeria|kenya|egypt|morocco|mauritius|port louis|ghana)\b/],
];

const GLOBAL = /\b(worldwide|anywhere|global|any location|todo o mundo)\b/;

// Fontes de comunidades brasileiras: sem local, a vaga é daqui.
const BRAZILIAN_SOURCES: ReadonlySet<SourceId> = new Set(["github"]);

/**
 * Região pelo local. Brasil vence quando aparece (a vaga está aberta a quem mora aqui);
 * locais em mais de um continente, ou "Worldwide", viram global.
 */
export function inferRegion(location: string | null, source: SourceId): Region | null {
  if (!location?.trim()) return BRAZILIAN_SOURCES.has(source) ? "brasil" : null;
  const text = normalizeForMatch(location);
  const found = CONTINENT_PATTERNS.filter(([, regex]) => regex.test(text)).map(
    ([region]) => region,
  );
  if (found.includes("brasil")) return "brasil";
  if (GLOBAL.test(text) || found.length > 1) return "global";
  if (found[0]) return found[0];
  // "Remoto" escrito em português, sem país: vaga brasileira.
  if (/\b(remoto|hibrido|presencial)\b/.test(text)) return "brasil";
  return BRAZILIAN_SOURCES.has(source) ? "brasil" : null;
}
