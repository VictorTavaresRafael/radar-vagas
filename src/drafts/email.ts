import type { Cv } from "@config/cv";
import type { Profile, ProfileFact } from "@/domain/profile";
import { findTechnologies } from "@/domain/tech-catalog";
import { type DraftJob, rankExperienceFacts } from "./templates";

/**
 * E-mail de candidatura montado só com fatos do perfil. O Radar não envia nada: o painel
 * abre o rascunho no Gmail ou no app de e-mail e quem aperta "Enviar" é a pessoa.
 */
export interface ApplicationEmail {
  /** E-mail de contato encontrado na descrição da vaga; null quando a vaga não informa. */
  readonly to: string | null;
  readonly subject: string;
  readonly body: string;
}

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
// Endereços de sistema nunca são o destino da candidatura.
const IGNORED = /^(no-?reply|nao-?responda|donotreply|privacy|privacidade|dpo|lgpd)@/i;

export function findContactEmail(description: string): string | null {
  const found = description.match(EMAIL) ?? [];
  return (
    found
      .map((email) => email.replace(/[.,;:)]+$/, "").toLowerCase())
      .find((email) => !IGNORED.test(email)) ?? null
  );
}

function factsOfKind(profile: Profile, kind: ProfileFact["kind"]): string[] {
  return profile.facts.filter((fact) => fact.kind === kind).map((fact) => fact.text);
}

export function buildApplicationEmail(job: DraftJob, profile: Profile, cv: Cv): ApplicationEmail {
  const techs = new Set(findTechnologies(`${job.title}\n${job.description}`));
  const experiences = rankExperienceFacts(profile, techs)
    .slice(0, 3)
    .map((fact) => fact.text);
  const body = [
    "Olá, tudo bem?",
    "",
    `Vi a vaga de ${job.title} na ${job.company} e gostaria de me candidatar.`,
    "",
    [...factsOfKind(profile, "cargo"), ...experiences].join(" "),
    "",
    [...factsOfKind(profile, "formacao").slice(0, 1), ...factsOfKind(profile, "certificacao")].join(
      " ",
    ),
    "",
    `LinkedIn: ${cv.contact.linkedin}`,
    `GitHub: ${cv.contact.github}`,
    "Currículo em anexo.",
    "",
    "Fico à disposição para conversar.",
    "",
    "Abraço,",
    cv.name,
    cv.contact.phone,
  ].join("\n");
  return {
    to: findContactEmail(job.description),
    subject: `Candidatura — ${job.title} (${job.company})`,
    body,
  };
}

/** Rascunho no Gmail (aba de composição já preenchida). */
export function gmailComposeUrl(email: ApplicationEmail): string {
  const params = new URLSearchParams({ view: "cm", fs: "1", su: email.subject, body: email.body });
  if (email.to) params.set("to", email.to);
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/** Rascunho no app de e-mail padrão do computador. */
export function mailtoUrl(email: ApplicationEmail): string {
  const query = `subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
  return `mailto:${email.to ?? ""}?${query}`;
}
