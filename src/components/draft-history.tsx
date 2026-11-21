import type { DraftGeneration } from "@/db/repositories/drafts";
import { DRAFT_LABELS } from "@/drafts/kinds";
import { formatDateTime } from "@/lib/dates";
import { CopyButton } from "./copy-button";

export function DraftHistory({ generations }: { generations: readonly DraftGeneration[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Histórico de rascunhos</h2>
      {generations.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Nenhum rascunho gerado com IA ainda. Cada clique em "Gerar com IA" fica salvo aqui.
        </p>
      ) : (
        generations.map((generation) => (
          <details
            key={generation.generationId}
            className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <summary className="cursor-pointer text-sm font-medium">
              {formatDateTime(generation.createdAt)}
            </summary>
            <div className="mt-3 space-y-3">
              {generation.drafts.map((draft) => (
                <article key={draft.id} className="space-y-1">
                  <header className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{DRAFT_LABELS[draft.kind]}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">
                        {draft.origin === "llm" ? "IA (verificado)" : "Template"}
                      </span>
                      <CopyButton text={draft.text} />
                    </div>
                  </header>
                  <p className="whitespace-pre-line text-sm leading-relaxed">{draft.text}</p>
                  {draft.rejected.length > 0 && (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      IA reprovada por citar:{" "}
                      {draft.rejected.map((violation) => violation.term).join(", ")}.
                    </p>
                  )}
                </article>
              ))}
            </div>
          </details>
        ))
      )}
    </section>
  );
}
