import Link from "next/link";
import { type ApplicationEmail, gmailComposeUrl, mailtoUrl } from "@/drafts/email";
import { CopyButton } from "./copy-button";

const linkButton =
  "rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800";

/** Rascunho de e-mail pronto; o envio é sempre um clique da pessoa no próprio e-mail. */
export function EmailDraft({ email }: { email: ApplicationEmail }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">E-mail de candidatura</h2>
          <p className="text-xs text-zinc-500">
            Só fatos do perfil. Abre pronto no seu e-mail: anexe o{" "}
            <Link href="/curriculo" className="underline underline-offset-2">
              currículo em PDF
            </Link>{" "}
            e você mesmo envia.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={gmailComposeUrl(email)} target="_blank" rel="noreferrer" className={linkButton}>
            Abrir no Gmail ↗
          </a>
          <a href={mailtoUrl(email)} className={linkButton}>
            App de e-mail
          </a>
          <CopyButton text={`${email.subject}\n\n${email.body}`} />
        </div>
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-zinc-500">Para</dt>
        <dd>
          {email.to ?? (
            <span className="text-amber-700 dark:text-amber-400">
              a vaga não informa e-mail; candidate-se pelo link original
            </span>
          )}
        </dd>
        <dt className="text-zinc-500">Assunto</dt>
        <dd>{email.subject}</dd>
      </dl>
      <p className="whitespace-pre-line rounded-lg border border-zinc-200 p-4 text-sm leading-relaxed dark:border-zinc-800">
        {email.body}
      </p>
    </section>
  );
}
