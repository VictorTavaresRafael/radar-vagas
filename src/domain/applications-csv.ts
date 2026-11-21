import type { ApplicationExportRow } from "@/db/repositories/applications";
import { toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/dates";
import { STATUS_LABELS } from "./status";

const HEADER = [
  "Empresa",
  "Vaga",
  "URL",
  "Status",
  "Candidatado em",
  "Canal",
  "Próximo passo",
  "Data do próximo passo",
  "Score",
  "Notas",
] as const;

export function applicationsToCsv(rows: readonly ApplicationExportRow[]): string {
  return toCsv(
    HEADER,
    rows.map((row) => [
      row.company,
      row.title,
      row.url,
      STATUS_LABELS[row.status],
      formatDate(row.appliedAt),
      row.channel,
      row.nextStep,
      row.nextStepAt ? formatDate(row.nextStepAt) : "",
      row.score,
      row.notes,
    ]),
  );
}

export function csvFileName(now: Date): string {
  return `candidaturas-${now.toISOString().slice(0, 10)}.csv`;
}
