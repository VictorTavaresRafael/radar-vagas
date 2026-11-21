import type { JobStatus } from "./status";

export type FollowUpState = "atrasado" | "hoje" | "agendado";

/** Só candidaturas em andamento cobram próximo passo; oferta e recusado já tiveram resposta. */
const PENDING_STATUSES: readonly JobStatus[] = ["candidatado", "entrevista"];

const DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "America/Sao_Paulo",
});

// Compara o dia no calendário de Brasília, não o instante: vence "hoje" até 23:59 daqui.
function dayKey(date: Date): string {
  return DAY_KEY.format(date);
}

export function followUpState(
  status: JobStatus,
  nextStepAt: Date | null,
  now: Date,
): FollowUpState | null {
  if (!nextStepAt || !PENDING_STATUSES.includes(status)) return null;
  const due = dayKey(nextStepAt);
  const today = dayKey(now);
  if (due < today) return "atrasado";
  return due === today ? "hoje" : "agendado";
}

export interface FollowUpItem {
  readonly status: JobStatus;
  readonly nextStepAt: Date | null;
}

/** Atrasadas, da mais antiga para a mais recente. */
export function overdueItems<T extends FollowUpItem>(items: readonly T[], now: Date): T[] {
  return items
    .filter((item) => followUpState(item.status, item.nextStepAt, now) === "atrasado")
    .toSorted((a, b) => (a.nextStepAt?.getTime() ?? 0) - (b.nextStepAt?.getTime() ?? 0));
}
