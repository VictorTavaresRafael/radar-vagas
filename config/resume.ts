/**
 * Texto do currículo que está sendo enviado hoje (versão Full Stack Pleno de 22/11/2026). O
 * detector de palavras-chave compara a vaga com este texto para separar "você tem e não
 * escreveu" de "você não tem". Os rascunhos não usam este texto: só `profile.facts`.
 */
export const RESUME_TEXT = `
Víctor Matheus Tavares Rafael
Desenvolvedor Full Stack Pleno · React, Next.js, TypeScript, Node.js · AWS Certified Cloud Practitioner
Jaú, SP (mudança planejada para Londrina, PR) · victor.tavares.rafael@gmail.com
linkedin.com/in/victor-tavares-rafael-a13846236 · github.com/VictorTavaresRafael

Resumo
Desenvolvedor de Software Pleno na Domus Control, onde construo uma plataforma PWA multi-tenant com
Next.js, React, TypeScript e Tailwind CSS, integrada a APIs REST e publicada na AWS Amplify. Cuido
também da qualidade da entrega: criei o CI no GitHub Actions com type-check, testes com Vitest e
auditoria de dependências. Venho de quase 4 anos com desenvolvimento web (React, TypeScript, Node.js,
PHP) e de um estágio em dados e IA na AWS. Bacharel em Engenharia de Software pela UTFPR e AWS
Certified Cloud Practitioner. Busco posição de Full Stack Pleno (React + Node) ou Front-end Pleno.

Experiência
Desenvolvedor de Software Pleno — Domus Control (CLT · jun/2026 – atual)
- Desenvolvo uma plataforma PWA multi-tenant de gestão para igrejas com Next.js, React, TypeScript e Tailwind CSS.
- Integro o front-end a APIs REST e trabalho com Git, pull requests e code review no dia a dia.
- Criei o CI no GitHub Actions, com type-check, testes automatizados com Vitest e auditoria de dependências.
- Fixei as versões de Node e Bun no deploy da AWS Amplify, bloqueando builds com vulnerabilidades críticas.
- Padronizei o tratamento de erros dos formulários: erros de campo do back-end exibidos inline e rolagem até o primeiro campo inválido.
- Redesenhei a listagem de reuniões, corrigi a regeneração de tokens de push e reestruturei fluxos de conta.

Estagiário de Engenharia de Dados na AWS — Compass UOL, Innovation Studio Data & AI (mai/2025 – out/2025)
- Construí pipelines de ETL na AWS com S3, Glue e Lambda, além de Docker, QuickSight, IAM e serviços de IA/ML da AWS.
- Fui Scrum Master da minha squad por 4 sprints.

Desenvolvedor Web — Reforce Marketing Digital (estágio, 20 h/semana · dez/2022 – nov/2024)
- Desenvolvi sites e landing pages com React, TypeScript, WordPress, PHP e MySQL/MariaDB.
- Cuidei de SEO e performance das páginas.

Formação e certificação
- Bacharelado em Engenharia de Software — UTFPR, Cornélio Procópio · 2022 – 2026
  - TCC SIGA, indicado como destaque pela banca: Angular 21, NestJS 11, Prisma, PostgreSQL, autenticação JWT, controle de acesso RBAC e check-in por QR Code.
- AWS Certified Cloud Practitioner — Amazon Web Services · válida de out/2025 a out/2028

Competências
Front-end: React, Next.js, TypeScript, Tailwind CSS, PWA, Angular
Back-end: Node.js, NestJS, Prisma, APIs REST, PHP
Bancos de dados: PostgreSQL, MySQL, MariaDB
Nuvem e DevOps: AWS (Amplify, S3, Lambda, Glue, IAM, QuickSight), Docker, GitHub Actions
Qualidade: Vitest, testes automatizados, CI, code review
Métodos: Git, pull requests, Scrum (Scrum Master por 4 sprints)

Idiomas: português nativo; inglês intermediário (leitura e escrita avançadas, conversação intermediária); espanhol básico.
`;
