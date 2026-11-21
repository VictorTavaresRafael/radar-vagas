/** Etapas do funil, na ordem. Uma vaga que chegou a uma etapa conta também nas anteriores. */
export const FUNNEL_STAGES = ["nova", "candidatado", "entrevista", "oferta"] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export interface DayCount {
  readonly day: string; // AAAA-MM-DD no fuso de Brasília
  readonly count: number;
}

export interface FunnelStep {
  readonly stage: FunnelStage;
  readonly count: number;
  /** Percentual em relação à etapa anterior (null na primeira ou quando a anterior é zero). */
  readonly fromPrevious: number | null;
}

const DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function dayKey(date: Date): string {
  return DAY_KEY.format(date);
}

/** Últimos `days` dias até hoje (inclusive), com zero nos dias sem vaga. */
export function fillDays(counts: readonly DayCount[], now: Date, days: number): DayCount[] {
  const byDay = new Map(counts.map((entry) => [entry.day, entry.count]));
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now.getTime() - (days - 1 - index) * 86_400_000);
    const day = dayKey(date);
    return { day, count: byDay.get(day) ?? 0 };
  });
}

export function buildFunnel(counts: Readonly<Record<FunnelStage, number>>): FunnelStep[] {
  return FUNNEL_STAGES.map((stage, index) => {
    const previous = index > 0 ? counts[FUNNEL_STAGES[index - 1] as FunnelStage] : 0;
    return {
      stage,
      count: counts[stage],
      fromPrevious: index === 0 || previous === 0 ? null : counts[stage] / previous,
    };
  });
}

/** Resposta = a candidatura saiu de "candidatado" (entrevista, oferta ou recusa). */
export function responseRate(applications: number, responded: number): number | null {
  return applications === 0 ? null : responded / applications;
}

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}
