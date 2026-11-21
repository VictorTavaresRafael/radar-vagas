"use client";

import { useState, useTransition } from "react";
import { generateLlmDraftsAction } from "@/app/actions";
import type { Draft, DraftSet } from "@/drafts/generate";
import { DRAFT_LABELS, MESSAGE_MAX_LENGTH } from "@/drafts/kinds";
import { CopyButton } from "./copy-button";

interface DraftsPanelProps {
  readonly jobId: string;
  readonly initial: DraftSet;
  readonly llmEnabled: boolean;
}

function DraftCard({ draft }: { draft: Draft }) {
  const tooLong = draft.kind === "mensagem" && draft.text.length > MESSAGE_MAX_LENGTH;
  return (
    <article className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <header className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{DRAFT_LABELS[draft.kind]}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">
            {draft.origin === "llm" ? "IA (verificado)" : "Template"} · {draft.text.length}{" "}
            caracteres
          </span>
          <CopyButton text={draft.text} />
        </div>
      </header>
      <p
        className={`whitespace-pre-line text-sm leading-relaxed ${tooLong ? "text-rose-600" : ""}`}
      >
        {draft.text}
      </p>
      {draft.rejected.length > 0 && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          O texto da IA foi reprovado por citar algo fora do perfil (
          {draft.rejected.map((violation) => violation.term).join(", ")}); este é o template.
        </p>
      )}
    </article>
  );
}

export function DraftsPanel({ jobId, initial, llmEnabled }: DraftsPanelProps) {
  const [set, setSet] = useState<DraftSet>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function generate(): void {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateLlmDraftsAction(jobId);
        if (result.drafts.length > 0) setSet(result);
        if (result.llmError) setError(result.llmError);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Falha ao gerar rascunhos.");
      }
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Rascunhos</h2>
        {llmEnabled && (
          <button
            type="button"
            onClick={generate}
            disabled={pending}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {pending ? "Gerando…" : "Gerar com IA"}
          </button>
        )}
      </div>
      <p className="text-xs text-zinc-500">
        Gerados só com fatos de <code>config/profile.ts</code>. Revise antes de enviar: nada é
        enviado automaticamente.
      </p>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {set.drafts.map((draft) => (
        <DraftCard key={draft.kind} draft={draft} />
      ))}
    </section>
  );
}
