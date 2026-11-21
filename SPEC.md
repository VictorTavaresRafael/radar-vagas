# Radar de Vagas — Especificação do MVP

Ferramenta pessoal de Víctor Tavares para encontrar, pontuar e acompanhar vagas de tecnologia, e preparar candidaturas personalizadas **sem inventar nada** e **sem se candidatar automaticamente**.

## Objetivo

Substituir a busca manual diária por um painel que mostra, todo dia, as vagas novas que combinam com o perfil, com score explicado, palavras-chave de ATS que faltam no currículo e um rascunho de mensagem ao recrutador. A candidatura continua manual (regra de produto, não limitação técnica): os termos do LinkedIn proíbem automação, e candidatura em massa gera aplicações genéricas.

## Fora do escopo (não fazer)

- Candidatura automática, preenchimento de formulários de terceiros, login em sites.
- Scraping de LinkedIn, Gupy, Indeed ou qualquer página HTML. Só APIs públicas documentadas.
- Enviar mensagens a recrutadores. O sistema só gera rascunhos.

## Stack

- Next.js 16 (App Router) + TypeScript estrito + Tailwind CSS.
- Banco: Drizzle ORM. Em desenvolvimento e testes, **PGlite** (Postgres em WASM, sem servidor). Em produção, Postgres via `DATABASE_URL` (Supabase). Mesmo schema e mesmas migrações.
- Validação: zod. Testes: Vitest. Lint/format: Biome ou ESLint+Prettier.
- LLM opcional: `@anthropic-ai/sdk`, modelo configurável por `ANTHROPIC_MODEL` (padrão `claude-sonnet-5-5`). Sem `ANTHROPIC_API_KEY`, tudo funciona com o score determinístico e templates.
- Gerenciador: npm. Node 22.

## Fontes (coletores)

Cada coletor implementa `Collector { id; fetchJobs(): Promise<RawJob[]> }` e normaliza para `Job`. HTTP via `fetch` injetável (para testes com fixtures).

| Fonte | Endpoint | Observações |
| --- | --- | --- |
| Greenhouse | `https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true` | Campos: `jobs[].id, title, absolute_url, location.name, updated_at, content` (HTML escapado) |
| Lever | `https://api.lever.co/v0/postings/{company}?mode=json` | Campos: `id, text, hostedUrl, categories.{location,commitment,team}, workplaceType, descriptionPlain, createdAt` |
| GitHub Issues | `https://api.github.com/repos/{owner}/{repo}/issues?state=open&per_page=100` | Repos: `frontendbr/vagas`, `react-brasil/vagas`, `backend-br/vagas`. Ignorar PRs. Labels indicam nível, modalidade e contrato |
| Remotive | `https://remotive.com/api/remote-jobs?category=software-dev&search=react` | Termos pedem link para a vaga original e no máximo ~4 chamadas/dia |

Empresas iniciais (configuráveis em `config/sources.ts`):
- Greenhouse: `ilia`, `platformscience`, `zupinnovation`, `rdstation`, `nortal`, `launchpadtechnologiesinc`
- Lever: `ciandt`, `bluelightconsulting`, `oowlish`

## Modelo de dados

- `jobs`: id (uuid), source, external_id, company, title, url, location, remote (bool|null), seniority (junior|pleno|senior|null), contract (clt|pj|contractor|null), salary_min, salary_max, currency, description (texto puro), posted_at, first_seen_at, last_seen_at, dedupe_key (único), score, score_breakdown (jsonb), status, notes.
- `applications`: id, job_id, applied_at, channel, status, next_step, next_step_at, notes.
- `events`: id, job_id, type, payload (jsonb), created_at (histórico de mudanças de status).
- `dedupe_key` = hash de `empresa normalizada + título normalizado` (sem acento, minúsculas, sem senioridade entre parênteses). A mesma vaga vinda de duas fontes vira um registro, com URLs adicionais em `alt_urls`.
- Status: `nova → interessante → candidatado → entrevista → oferta | recusado | descartada`.

## Score (0–100), sempre explicado

1. **Filtros eliminatórios** (score 0 + motivo): linguagem principal obrigatória fora do perfil (.NET, Java, PHP, Flutter, Go como requisito, não diferencial); sênior/especialista com 5+ anos obrigatórios; inglês fluente/C1 obrigatório; presencial ou híbrido fora das cidades aceitas; salário divulgado abaixo do piso.
2. **Pontuação determinística**: stack (React, Next.js, TypeScript, Node/NestJS, Tailwind, Testes, AWS) com pesos, zerada quando a vaga exige framework de front-end fora do perfil (Vue, Svelte) sem citar React/Next.js; senioridade (pleno > júnior/pleno > sênior); modalidade (remoto > híbrido nas cidades > presencial); salário; recência.
3. **Avaliação LLM opcional**: rubrica fixa, saída JSON validada por zod, nota 0–100 com justificativa curta; média ponderada com o determinístico (peso configurável).
4. `score_breakdown` guarda cada componente para o painel mostrar o porquê.
5. Lista de **palavras-chave de ATS** da vaga que não aparecem no currículo, separando "você tem e não escreveu" (constam em `profile.facts`) de "você não tem".

## Personalização (sem inventar)

`config/profile.ts` contém o perfil verificado (abaixo). O gerador de rascunhos (resumo para o topo do CV, mensagem ao recrutador ≤300 caracteres, resposta "fale sobre você") só pode usar fatos de `profile.facts`. Prompt com instrução explícita + verificação pós-geração: qualquer tecnologia/empresa/número citado que não esteja no perfil reprova o rascunho (teste automatizado disso). Sem LLM, usa templates.

## Painel (Next.js)

- `/`: lista de vagas com filtros (score mínimo, fonte, modalidade, status, busca), ordenada por score e recência; badge "nova" para vistas nas últimas 24 h.
- `/vagas/[id]`: detalhes, score explicado, palavras-chave faltantes, rascunhos gerados com botão copiar, link para a vaga original, troca de status, notas.
- `/candidaturas`: kanban por status, com próximos passos e datas.
- Sem autenticação no MVP (uso local); publicado, o acesso fica com a Vercel Authentication.

## Execução

- `npm run collect` — roda todos os coletores, normaliza, deduplica, pontua, grava.
- `npm run dev` — painel.
- `npm test` — Vitest, **100% offline** com fixtures em `test/fixtures/`.
- `.github/workflows/collect.yml` — cron 2×/dia (07:47 e 17:47 BRT, fora da hora cheia) rodando `npm run collect` contra `DATABASE_URL`; workflow de CI com typecheck, lint e testes em PR.
- Alertas opcionais: Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) com as vagas novas de score ≥ 80.

## Perfil verificado (fonte da verdade para `config/profile.ts`)

- Nome: Víctor Matheus Tavares Rafael. Jaú, SP; mudança planejada para Londrina, PR.
- Cargo atual: Desenvolvedor de Software Pleno, Domus Control (CLT, desde jun/2026). Plataforma PWA multi-tenant de gestão para igrejas com Next.js, React, TypeScript, Tailwind CSS. Criou o CI no GitHub Actions (type-check, testes Vitest, auditoria de dependências); fixou Node e Bun no deploy da AWS Amplify bloqueando builds com vulnerabilidades críticas; padronizou o tratamento de erros dos formulários (erros de campo do back-end inline e rolagem até o primeiro campo inválido); redesenhou a listagem de reuniões; corrigiu regeneração de tokens de push; reestruturou fluxos de conta.
- Compass UOL (mai–out/2025, estágio, Innovation Studio Data & AI): ETL na AWS (S3, Glue, Lambda), Docker, QuickSight, IAM, serviços de IA/ML da AWS; Scrum Master da squad por 4 sprints.
- Reforce (dez/2022–nov/2024, estágio, 20 h/semana): sites e landing pages com React, TypeScript, WordPress, PHP, MySQL/MariaDB; SEO e performance.
- Formação: Bacharelado em Engenharia de Software, UTFPR Cornélio Procópio, 2022–2026. TCC SIGA (Angular 21, NestJS 11, Prisma, PostgreSQL, JWT, RBAC, check-in por QR Code) indicado como destaque pela banca.
- Certificação: AWS Certified Cloud Practitioner (out/2025–out/2028).
- Idiomas: português nativo; inglês intermediário (leitura/escrita avançadas, conversação intermediária); espanhol básico.
- Não tem experiência profissional com: .NET/C#, Java, Vue, Flutter, Go, GraphQL em produção, Kubernetes, Redis em produção, Playwright.
- Alvos: Front-end Pleno (React/Next.js), Full Stack Pleno (React + Node), QA Automação/SDET. Remoto no Brasil; híbrido/presencial em Londrina ou Bauru. Internacional (LatAm, contractor) com peso menor enquanto o inglês falado não for B2+.
- Piso salarial: configurável por env `SALARY_FLOOR_BRL` (sem valor padrão no código).
