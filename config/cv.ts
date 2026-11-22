/**
 * Currículo estruturado: fonte da página /curriculo (exportável em PDF), do texto que o
 * detector de palavras-chave usa (`resume.ts`) e do contato no e-mail de candidatura.
 * Só fatos verificados de `profile.ts`; nada de números ou tecnologias que não estejam lá.
 */
export interface CvExperience {
  readonly role: string;
  readonly company: string;
  readonly period: string;
  readonly bullets: readonly string[];
}

export interface Cv {
  readonly name: string;
  readonly headline: string;
  readonly contact: {
    readonly location: string;
    readonly phone: string;
    readonly email: string;
    readonly linkedin: string;
    readonly github: string;
  };
  readonly summary: string;
  readonly experiences: readonly CvExperience[];
  readonly education: readonly { readonly title: string; readonly detail: string }[];
  readonly skills: readonly { readonly area: string; readonly items: string }[];
  readonly languages: string;
}

export const cv: Cv = {
  name: "Víctor Matheus Tavares Rafael",
  headline:
    "Desenvolvedor Full Stack Pleno · React, Next.js, TypeScript, Node.js · AWS Certified Cloud Practitioner",
  contact: {
    location: "Jaú, SP (mudança planejada para Londrina, PR)",
    phone: "(14) 99760-7132",
    email: "victor.tavares.rafael@gmail.com",
    linkedin: "https://linkedin.com/in/victor-tavares-rafael-a13846236",
    github: "https://github.com/VictorTavaresRafael",
  },
  summary:
    "Desenvolvedor de Software Pleno na Domus Control, onde construo uma plataforma PWA multi-tenant com Next.js, React, TypeScript e Tailwind CSS, integrada a APIs REST e publicada na AWS Amplify. Cuido também da qualidade da entrega: criei o CI no GitHub Actions com type-check, testes com Vitest e auditoria de dependências. Venho de quase 4 anos com desenvolvimento web (React, TypeScript, Node.js, PHP) e de um estágio em dados e IA na AWS. Bacharel em Engenharia de Software pela UTFPR e AWS Certified Cloud Practitioner. Busco posição de Full Stack Pleno (React + Node) ou Front-end Pleno.",
  experiences: [
    {
      role: "Desenvolvedor de Software Pleno",
      company: "Domus Control",
      period: "CLT · jun/2026 – atual",
      bullets: [
        "Desenvolvo uma plataforma PWA multi-tenant de gestão para igrejas com Next.js, React, TypeScript e Tailwind CSS.",
        "Integro o front-end a APIs REST e trabalho com Git, pull requests e code review no dia a dia.",
        "Criei o CI no GitHub Actions, com type-check, testes automatizados com Vitest e auditoria de dependências.",
        "Fixei as versões de Node e Bun no deploy da AWS Amplify, bloqueando builds com vulnerabilidades críticas.",
        "Padronizei o tratamento de erros dos formulários: erros de campo do back-end exibidos inline e rolagem até o primeiro campo inválido.",
        "Redesenhei a listagem de reuniões, corrigi a regeneração de tokens de push e reestruturei fluxos de conta.",
      ],
    },
    {
      role: "Estagiário de Engenharia de Dados na AWS",
      company: "Compass UOL (Innovation Studio Data & AI)",
      period: "Estágio remoto · mai/2025 – out/2025",
      bullets: [
        "Construí pipelines de ETL na AWS com S3, Glue e Lambda, além de Docker, QuickSight, IAM e serviços de IA/ML da AWS.",
        "Fui Scrum Master da minha squad por 4 sprints.",
      ],
    },
    {
      role: "Desenvolvedor Web",
      company: "Reforce Marketing Digital",
      period: "Estágio, 20 h/semana · dez/2022 – nov/2024",
      bullets: [
        "Desenvolvi sites e landing pages com React, TypeScript, WordPress, PHP e MySQL/MariaDB.",
        "Cuidei de SEO e performance das páginas.",
      ],
    },
  ],
  education: [
    {
      title: "Bacharelado em Engenharia de Software — UTFPR, Cornélio Procópio · 2022 – 2026",
      detail:
        "TCC SIGA, indicado como destaque pela banca: Angular 21, NestJS 11, Prisma, PostgreSQL, autenticação JWT, controle de acesso RBAC e check-in por QR Code.",
    },
    {
      title: "AWS Certified Cloud Practitioner — Amazon Web Services",
      detail: "Válida de out/2025 a out/2028.",
    },
  ],
  skills: [
    { area: "Front-end", items: "React, Next.js, TypeScript, Tailwind CSS, PWA, Angular" },
    { area: "Back-end", items: "Node.js, NestJS, Prisma, APIs REST, PHP" },
    { area: "Bancos de dados", items: "PostgreSQL, MySQL, MariaDB" },
    {
      area: "Nuvem e DevOps",
      items: "AWS (Amplify, S3, Lambda, Glue, IAM, QuickSight), Docker, GitHub Actions",
    },
    { area: "Qualidade", items: "Vitest, testes automatizados, CI, code review" },
    { area: "Métodos", items: "Git, pull requests, Scrum (Scrum Master por 4 sprints)" },
  ],
  languages:
    "Português nativo; inglês intermediário (leitura e escrita avançadas, conversação intermediária); espanhol básico.",
};

/** Versão em texto corrido, a mesma que sai no PDF, para comparar com as vagas. */
export function cvToText(source: Cv): string {
  return [
    source.name,
    source.headline,
    `${source.contact.location} · ${source.contact.email}`,
    `${source.contact.linkedin} · ${source.contact.github}`,
    "",
    "Resumo",
    source.summary,
    "",
    "Experiência",
    ...source.experiences.flatMap((item) => [
      `${item.role} — ${item.company} (${item.period})`,
      ...item.bullets.map((bullet) => `- ${bullet}`),
    ]),
    "",
    "Formação e certificação",
    ...source.education.flatMap((item) => [`- ${item.title}`, `  ${item.detail}`]),
    "",
    "Competências",
    ...source.skills.map((item) => `${item.area}: ${item.items}`),
    "",
    `Idiomas: ${source.languages}`,
  ].join("\n");
}
