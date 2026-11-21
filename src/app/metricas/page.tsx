import type { Metadata } from "next";
import { connection } from "next/server";
import { DailyBars } from "@/components/daily-bars";
import { getDb } from "@/db";
import { getSearchMetrics } from "@/db/repositories/metrics";
import { formatPercent } from "@/domain/metrics";
import { STATUS_LABELS } from "@/domain/status";

export const metadata: Metadata = { title: "Métricas" };

const DAYS = 30;
const card = "rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className={card}>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

export default async function MetricsPage() {
  await connection();
  const metrics = await getSearchMetrics(await getDb(), new Date(), DAYS);
  const newInPeriod = metrics.newJobsPerDay.reduce((sum, entry) => sum + entry.count, 0);
  const top = Math.max(1, metrics.funnel[0]?.count ?? 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Métricas da busca</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Vagas novas" value={String(newInPeriod)} hint={`nos últimos ${DAYS} dias`} />
        <Tile
          label="Candidaturas"
          value={String(metrics.applications)}
          hint="vagas que chegaram a Candidatado"
        />
        <Tile
          label="Taxa de resposta"
          value={formatPercent(metrics.responseRate)}
          hint={`${metrics.responded} com entrevista, oferta ou recusa`}
        />
      </div>

      <section className={card}>
        <h2 className="mb-3 text-lg font-semibold">Vagas novas por dia</h2>
        <DailyBars data={metrics.newJobsPerDay} />
      </section>

      <section className={card}>
        <h2 className="mb-1 text-lg font-semibold">Funil</h2>
        <p className="mb-4 text-xs text-zinc-500">
          Cada vaga conta em todas as etapas por onde já passou, mesmo que tenha mudado depois.
        </p>
        <ol className="space-y-3">
          {metrics.funnel.map((step) => (
            <li key={step.stage} className="grid grid-cols-[7rem_1fr_6rem] items-center gap-3">
              <span className="text-sm font-medium">{STATUS_LABELS[step.stage]}</span>
              <span className="h-3 rounded bg-zinc-100 dark:bg-zinc-800">
                <span
                  className="block h-3 rounded bg-emerald-600 dark:bg-emerald-400"
                  style={{ width: `${(step.count / top) * 100}%` }}
                />
              </span>
              <span className="text-right text-sm tabular-nums">
                {step.count}
                <span className="ml-1 text-xs text-zinc-500">
                  {step.fromPrevious === null ? "" : formatPercent(step.fromPrevious)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
