import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ScoreBadge } from "@/components/score-badge";
import { StatusForm } from "@/components/status-form";
import { getDb } from "@/db";
import { type KanbanCard, listKanbanCards } from "@/db/repositories/applications";
import { KANBAN_STATUSES, STATUS_LABELS } from "@/domain/status";
import { formatDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Candidaturas" };

function Card({ card, now }: { card: KanbanCard; now: Date }) {
  const overdue = card.nextStepAt !== null && card.nextStepAt < now;
  return (
    <li className="space-y-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <Link href={`/vagas/${card.jobId}`} className="flex items-start gap-2 hover:underline">
        <ScoreBadge score={card.score} />
        <span className="min-w-0">
          <span className="block text-sm font-medium">{card.title}</span>
          <span className="block text-xs text-zinc-600 dark:text-zinc-400">{card.company}</span>
        </span>
      </Link>
      {card.nextStep && (
        <p
          className={`text-xs ${overdue ? "font-medium text-rose-600" : "text-zinc-600 dark:text-zinc-400"}`}
        >
          Próximo: {card.nextStep}
          {card.nextStepAt ? ` (${formatDate(card.nextStepAt)})` : ""}
        </p>
      )}
      {card.appliedAt && (
        <p className="text-xs text-zinc-500">Candidatado em {formatDate(card.appliedAt)}</p>
      )}
      <StatusForm jobId={card.jobId} status={card.status} compact />
    </li>
  );
}

export default async function ApplicationsPage() {
  // Sem parâmetros, o Next tentaria pré-renderizar no build, quando não há banco.
  await connection();
  const cards = await listKanbanCards(await getDb(), KANBAN_STATUSES);
  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Candidaturas</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Mova a vaga de coluna pelo seletor. Próximos passos vencidos aparecem em vermelho.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {KANBAN_STATUSES.map((status) => {
          const column = cards.filter((card) => card.status === status);
          return (
            <section key={status} className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-900/50">
              <h2 className="mb-3 flex justify-between text-sm font-semibold">
                {STATUS_LABELS[status]}
                <span className="text-zinc-500">{column.length}</span>
              </h2>
              <ul className="space-y-2">
                {column.map((card) => (
                  <Card key={card.jobId} card={card} now={now} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
