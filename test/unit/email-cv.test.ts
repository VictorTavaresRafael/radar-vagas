import { cv, cvToText } from "@config/cv";
import { profile } from "@config/profile";
import { RESUME_TEXT } from "@config/resume";
import { describe, expect, it } from "vitest";
import {
  buildApplicationEmail,
  findContactEmail,
  gmailComposeUrl,
  mailtoUrl,
} from "@/drafts/email";
import { verifyDraft } from "@/drafts/verify";

const job = {
  title: "Desenvolvedor(a) Backend Pleno - White Label e Plataforma",
  company: "Mimix AI",
  description:
    "Backend, APIs e integrações com Node.js e TypeScript. Escreva para caldasvieiramarcos@gmail.com. Dúvidas sobre dados: privacidade@mimix.example.",
};

describe("currículo", () => {
  it("o texto usado nas palavras-chave é o mesmo do currículo exportado", () => {
    expect(RESUME_TEXT).toBe(cvToText(cv));
    expect(RESUME_TEXT).toContain("Domus Control");
    expect(RESUME_TEXT).toContain("AWS Certified Cloud Practitioner");
  });
});

describe("e-mail de candidatura", () => {
  it("acha o contato da vaga e ignora endereços de sistema", () => {
    expect(findContactEmail(job.description)).toBe("caldasvieiramarcos@gmail.com");
    expect(findContactEmail("Envie para noreply@empresa.com.")).toBeNull();
    expect(findContactEmail("Candidate-se pelo link.")).toBeNull();
    expect(findContactEmail("contato@artemispericiamedica.com, aos cuidados")).toBe(
      "contato@artemispericiamedica.com",
    );
  });

  it("monta assunto e texto só com fatos do perfil", () => {
    const email = buildApplicationEmail(job, profile, cv);
    expect(email.to).toBe("caldasvieiramarcos@gmail.com");
    expect(email.subject).toBe(`Candidatura — ${job.title} (${job.company})`);
    expect(email.body).toContain("Domus Control");
    expect(email.body).toContain(cv.contact.linkedin);
    // Links, contato e assinatura vêm do currículo; o resto passa pela mesma verificação dos rascunhos.
    const claims = email.body.split("\n\nLinkedIn:")[0] ?? "";
    expect(verifyDraft(claims, profile, job)).toEqual([]);
  });

  it("gera links de rascunho para o Gmail e o app de e-mail", () => {
    const email = buildApplicationEmail(job, profile, cv);
    const gmail = new URL(gmailComposeUrl(email));
    expect(gmail.hostname).toBe("mail.google.com");
    expect(gmail.searchParams.get("to")).toBe(email.to);
    expect(gmail.searchParams.get("su")).toBe(email.subject);
    expect(gmail.searchParams.get("body")).toBe(email.body);
    expect(mailtoUrl(email)).toMatch(/^mailto:caldasvieiramarcos@gmail\.com\?subject=/);
    expect(mailtoUrl({ ...email, to: null })).toMatch(/^mailto:\?subject=/);
  });
});
