import type { KeywordReport } from "@/scoring/types";

function Group({
  title,
  hint,
  items,
  tone,
}: {
  title: string;
  hint: string;
  items: readonly string[];
  tone: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-xs text-zinc-500">{hint}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-zinc-500">Nenhuma.</p>
      ) : (
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <li key={item} className={`rounded px-1.5 py-0.5 text-xs ${tone}`}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function KeywordList({ report }: { report: KeywordReport }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Palavras-chave de ATS</h2>
      <Group
        title="Você tem e não escreveu no CV"
        hint="Constam nos fatos verificados: vale incluir no currículo."
        items={report.hasNotWritten}
        tone="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
      />
      <Group
        title="Você não tem"
        hint="Não constam no perfil: não escreva; estude ou ignore."
        items={report.missing}
        tone="bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300"
      />
      <Group
        title="Já no currículo"
        hint="Nada a fazer."
        items={report.inResume}
        tone="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      />
    </section>
  );
}
