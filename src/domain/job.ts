export const SOURCES = ["greenhouse", "lever", "github", "remotive"] as const;
export type SourceId = (typeof SOURCES)[number];

export const SOURCE_LABELS: Record<SourceId, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  github: "GitHub Issues",
  remotive: "Remotive",
};

export const SENIORITIES = ["junior", "pleno", "senior"] as const;
export type Seniority = (typeof SENIORITIES)[number];

export const MODALITIES = ["remoto", "hibrido", "presencial"] as const;
export type Modality = (typeof MODALITIES)[number];

export const MODALITY_LABELS: Record<Modality, string> = {
  remoto: "Remoto",
  hibrido: "Híbrido",
  presencial: "Presencial",
};

export const CONTRACTS = ["clt", "pj", "contractor"] as const;
export type Contract = (typeof CONTRACTS)[number];

export type Currency = "BRL" | "USD";

/** Vaga já normalizada por um coletor, antes de pontuar e gravar. */
export interface NormalizedJob {
  source: SourceId;
  externalId: string;
  company: string;
  title: string;
  url: string;
  location: string | null;
  modality: Modality | null;
  seniority: Seniority | null;
  contract: Contract | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: Currency | null;
  description: string;
  postedAt: Date | null;
}

/** Vaga deduplicada: a mesma oportunidade pode ter vindo de mais de uma fonte. */
export interface MergedJob extends NormalizedJob {
  dedupeKey: string;
  altUrls: string[];
}
