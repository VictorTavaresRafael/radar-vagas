"use client";

/** Abre a impressão do navegador; "Salvar como PDF" gera o arquivo para anexar. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
    >
      Baixar PDF
    </button>
  );
}
