import { profile } from "@config/profile";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { saveNotesAction } from "@/app/actions";
import { ApplicationForm } from "@/components/application-form";
import { DraftHistory } from "@/components/draft-history";
import { DraftsPanel } from "@/components/drafts-panel";
import { KeywordList } from "@/components/keyword-list";
import { ScoreBadge } from "@/components/score-badge";
import { ScoreBreakdownView } from "@/components/score-breakdown";
import { StatusForm } from "@/components/status-form";
import { getDb } from "@/db";
import { getApplication, listJobEvents } from "@/db/repositories/applications";
import { listDraftGenerations } from "@/db/repositories/drafts";
import { getJob } from "@/db/repositories/jobs";
import type { EventRow, JobRow } from "@/db/schema";
import { MODALITY_LABELS, SOURCE_LABELS } from "@/domain/job";
import { JOB_STATUSES, STATUS_LABELS } from "@/domain/status";
import { generateDrafts } from "@/drafts/generate";
import { formatDate } from "@/lib/dates";
import { getEnv } from "@/lib/env";
import { formatSalary } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

// `cache` faz a metadata e a página dividirem uma consulta só, em vez de duas simultâneas.
const findJob = cache(async (id: string): Promise<JobRow | undefined> => {
  const parsed = z.uuid().safeParse(id);
  return parsed.success ? getJob(await getDb(), parsed.data) : undefined;
});

async function loadJob(params: PageProps["params"]): Promise<JobRow> {
  const { id } = await params;
  const job = await findJob(id);
  if (!job) notFound();
  return job;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const job = await loadJob(params);
  return { title: `${job.title} — ${job.company}` };
}

const card = "rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";

const statusPayloadSchema = z.object({ from: z.enum(JOB_STATUSES), to: z.enum(JOB_STATUSES) });

function describeEvent(event: EventRow): string {
  if (event.type === "criada") return "Vaga coletada";
  const payload = statusPayloadSchema.safeParse(event.payload);
  return payload.success
    ? `${STATUS_LABELS[payload.data.from]} → ${STATUS_LABELS[payload.data.to]}`
    : "Status alterado";
}

export default async function JobPage({ params }: PageProps) {
  const job = await loadJob(params);
  const db = await getDb();
  // Consultas em sequência: veja getSearchMetrics.
  const application = await getApplication(db, job.id);
  const history = await listJobEvents(db, job.id);
  const draftHistory = await listDraftGenerations(db, job.id);
  const drafts = await generateDrafts(job, profile, null);
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  const facts = [
    job.location,
    job.modality ? MODALITY_LABELS[job.modality] : null,
    job.contract?.toUpperCase(),
    salary,
    `publicada em ${formatDate(job.postedAt)}`,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <header className={`${card} flex flex-col gap-4 sm:flex-row sm:items-start`}>
        <ScoreBadge score={job.score} size="lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">{job.title}</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {job.company} · {facts.join(" · ")}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Abrir vaga original ({SOURCE_LABELS[job.source]}) ↗
            </a>
            {job.altUrls.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-zinc-600 hover:underline dark:text-zinc-400"
              >
                também em {new URL(url).hostname} ↗
              </a>
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            A candidatura é sempre manual, pelo link original.
          </p>
        </div>
        <StatusForm jobId={job.id} status={job.status} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className={card}>
            <ScoreBreakdownView breakdown={job.scoreBreakdown} />
          </div>
          <div className={card}>
            <DraftsPanel
              jobId={job.id}
              initial={drafts}
              llmEnabled={Boolean(getEnv().ANTHROPIC_API_KEY)}
            />
          </div>
          <div className={card}>
            <DraftHistory generations={draftHistory} />
          </div>
          <details className={card}>
            <summary className="cursor-pointer text-lg font-semibold">Descrição da vaga</summary>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {job.description}
            </p>
          </details>
        </div>
        <aside className="space-y-6">
          <div className={card}>
            <KeywordList report={job.scoreBreakdown.keywords} />
          </div>
          {application && (
            <div className={card}>
              <h2 className="mb-2 text-lg font-semibold">Candidatura</h2>
              <ApplicationForm application={application} />
            </div>
          )}
          <form action={saveNotesAction} className={`${card} space-y-2`}>
            <input type="hidden" name="jobId" value={job.id} />
            <label htmlFor="notes" className="text-lg font-semibold">
              Notas
            </label>
            <textarea
              id="notes"
              name="notes"
              defaultValue={job.notes}
              rows={5}
              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
            >
              Salvar notas
            </button>
          </form>
          <div className={card}>
            <h2 className="mb-2 text-lg font-semibold">Histórico</h2>
            <ol className="space-y-1 text-sm">
              {history.map((event) => (
                <li key={event.id} className="flex justify-between gap-2">
                  <span>{describeEvent(event)}</span>
                  <span className="text-zinc-500">{formatDate(event.createdAt)}</span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
