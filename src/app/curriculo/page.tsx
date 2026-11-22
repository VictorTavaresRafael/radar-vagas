import { cv } from "@config/cv";
import type { Metadata } from "next";
import { PrintButton } from "@/components/print-button";

export const metadata: Metadata = { title: "Currículo" };

const section = "mt-5 border-b border-zinc-300 pb-1 text-sm font-bold uppercase tracking-wide";

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

export default function CurriculoPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Currículo</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Gerado de <code>config/cv.ts</code>, só com fatos verificados. Em "Baixar PDF", escolha
            "Salvar como PDF" e anexe nas candidaturas.
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Folha sempre clara, inclusive no tema escuro: é o que vai para o PDF. */}
      <article className="mx-auto max-w-[210mm] rounded-xl border border-zinc-200 bg-white p-10 text-[13px] leading-relaxed text-zinc-900 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header>
          <h2 className="text-2xl font-bold tracking-tight">{cv.name}</h2>
          <p className="mt-0.5 font-medium text-zinc-700">{cv.headline}</p>
          <p className="mt-1 text-zinc-600">
            {cv.contact.location} · {cv.contact.phone} · {cv.contact.email}
          </p>
          <p className="text-zinc-600">
            <a href={cv.contact.linkedin} className="underline-offset-2 hover:underline">
              {displayUrl(cv.contact.linkedin)}
            </a>
            {" · "}
            <a href={cv.contact.github} className="underline-offset-2 hover:underline">
              {displayUrl(cv.contact.github)}
            </a>
          </p>
        </header>

        <h3 className={section}>Resumo</h3>
        <p className="mt-2">{cv.summary}</p>

        <h3 className={section}>Experiência</h3>
        {cv.experiences.map((item) => (
          <section key={item.company} className="mt-3 break-inside-avoid">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="font-semibold">
                {item.role} — {item.company}
              </p>
              <p className="text-zinc-600">{item.period}</p>
            </div>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {item.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </section>
        ))}

        <h3 className={section}>Formação e certificação</h3>
        <ul className="mt-2 space-y-1.5">
          {cv.education.map((item) => (
            <li key={item.title} className="break-inside-avoid">
              <p className="font-semibold">{item.title}</p>
              <p>{item.detail}</p>
            </li>
          ))}
        </ul>

        <h3 className={section}>Competências</h3>
        <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-0.5">
          {cv.skills.map((item) => (
            <div key={item.area} className="contents">
              <dt className="font-semibold">{item.area}</dt>
              <dd>{item.items}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4">
          <span className="font-semibold">Idiomas: </span>
          {cv.languages}
        </p>
      </article>
    </div>
  );
}
