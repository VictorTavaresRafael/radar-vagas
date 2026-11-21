export const JOB_STATUSES = [
  "nova",
  "interessante",
  "candidatado",
  "entrevista",
  "oferta",
  "recusado",
  "descartada",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const STATUS_LABELS: Record<JobStatus, string> = {
  nova: "Nova",
  interessante: "Interessante",
  candidatado: "Candidatado",
  entrevista: "Entrevista",
  oferta: "Oferta",
  recusado: "Recusado",
  descartada: "Descartada",
};

/** Status a partir dos quais existe uma candidatura de fato (registro em `applications`). */
export const APPLICATION_STATUSES = [
  "candidatado",
  "entrevista",
  "oferta",
  "recusado",
] as const satisfies readonly JobStatus[];

/** Colunas do kanban de /candidaturas, na ordem do funil. */
export const KANBAN_STATUSES = [
  "interessante",
  ...APPLICATION_STATUSES,
] as const satisfies readonly JobStatus[];

export function isApplicationStatus(status: JobStatus): boolean {
  return (APPLICATION_STATUSES as readonly JobStatus[]).includes(status);
}
