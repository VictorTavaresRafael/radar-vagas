import type { Profile } from "@/domain/profile";
import { RESUME_TEXT } from "./resume";

/**
 * Perfil verificado: única fonte de fatos para score, palavras-chave e rascunhos.
 * Só acrescente aqui o que for verdade e comprovável numa entrevista.
 */
export const profile: Profile = {
  name: "Víctor Matheus Tavares Rafael",
  firstName: "Víctor",
  headline: "Desenvolvedor de Software Pleno",
  currentCompany: "Domus Control",
  location: "Jaú, SP (mudança planejada para Londrina, PR)",
  acceptedCities: ["Londrina", "Bauru"],
  targets: [
    "Front-end Pleno (React/Next.js)",
    "Full Stack Pleno (React + Node)",
    "QA Automação/SDET",
  ],
  notExperienced: [
    ".NET",
    "C#",
    "Java",
    "Vue",
    "Flutter",
    "Go",
    "GraphQL",
    "Kubernetes",
    "Redis",
    "Playwright",
  ],
  facts: [
    {
      id: "domus-cargo",
      kind: "cargo",
      text: "Sou Desenvolvedor de Software Pleno na Domus Control (CLT, desde jun/2026).",
    },
    {
      id: "domus-plataforma",
      kind: "experiencia",
      text: "Na Domus Control, desenvolvo uma plataforma PWA multi-tenant de gestão para igrejas com Next.js, React, TypeScript e Tailwind CSS.",
    },
    {
      id: "domus-ci",
      kind: "experiencia",
      text: "Criei o CI (integração contínua) no GitHub Actions, com type-check, testes automatizados com Vitest e auditoria de dependências.",
    },
    {
      id: "domus-deploy",
      kind: "experiencia",
      text: "Fixei as versões de Node e Bun no deploy da AWS Amplify, bloqueando builds com vulnerabilidades críticas.",
    },
    {
      id: "domus-formularios",
      kind: "experiencia",
      text: "Padronizei o tratamento de erros dos formulários, com erros de campo do back-end exibidos inline e rolagem até o primeiro campo inválido.",
    },
    {
      id: "domus-produto",
      kind: "experiencia",
      text: "Redesenhei a listagem de reuniões, corrigi a regeneração de tokens de push e reestruturei fluxos de conta.",
    },
    {
      id: "compass-dados",
      kind: "experiencia",
      text: "Na Compass UOL (estágio, mai–out/2025, Innovation Studio Data & AI), trabalhei com ETL na AWS (S3, Glue, Lambda), Docker, QuickSight, IAM e serviços de IA/ML da AWS.",
    },
    {
      id: "compass-scrum",
      kind: "experiencia",
      text: "Fui Scrum Master da minha squad na Compass UOL por 4 sprints.",
    },
    {
      id: "reforce-sites",
      kind: "experiencia",
      text: "Na Reforce (estágio, dez/2022–nov/2024, 20 h/semana), desenvolvi sites e landing pages com React, TypeScript, WordPress, PHP e MySQL/MariaDB, cuidando de SEO e performance.",
    },
    {
      id: "formacao",
      kind: "formacao",
      text: "Sou bacharel em Engenharia de Software pela UTFPR Cornélio Procópio (2022–2026).",
    },
    {
      id: "tcc-siga",
      kind: "formacao",
      text: "Meu TCC, o SIGA, foi indicado como destaque pela banca: Angular 21, NestJS 11, Prisma, PostgreSQL, JWT, RBAC e check-in por QR Code.",
    },
    {
      id: "certificacao-aws",
      kind: "certificacao",
      text: "Tenho a certificação AWS Certified Cloud Practitioner (out/2025–out/2028).",
    },
    {
      id: "idiomas",
      kind: "idiomas",
      text: "Falo português nativo, inglês intermediário (leitura e escrita avançadas, conversação intermediária) e espanhol básico.",
    },
  ],
  resume: RESUME_TEXT,
};
