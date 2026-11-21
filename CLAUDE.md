# CLAUDE.md

Convenções para agentes trabalhando neste repositório. `SPEC.md` é a fonte da verdade de escopo: não amplie sem pedido explícito.

## Regras de produto (não negociáveis)

- Nada de candidatura automática, login em sites, envio de mensagens ou scraping de HTML. Só APIs públicas documentadas.
- `config/profile.ts` só contém fatos verificados. Nunca acrescente tecnologia, empresa ou número que o usuário não tenha confirmado. Rascunhos só podem usar esses fatos e passam por `verifyDraft`.

## Comandos

- `npm test` (offline), `npm run typecheck`, `npm run lint`, `npm run build`: os quatro precisam passar antes de qualquer commit.
- `npm run format` corrige formatação (Biome).
- Mudou `src/db/schema.ts`? Rode `npm run db:generate` e commite o SQL gerado em `drizzle/`.

## Convenções de código

- TypeScript estrito; sem `any`. Valide com zod tudo o que entra de fora (APIs, LLM, env, formulários, query string).
- HTTP sempre pelo `fetch` injetado (`CollectorDeps`, `TelegramOptions`); testes nunca acessam a rede.
- Novas fontes: um arquivo em `src/collectors/`, fixture realista em `test/fixtures/`, rota em `test/support/fixtures.ts` e teste de normalização.
- Pesos e limites do score ficam em `config/scoring.ts`, não espalhados no código.
- Repositórios (`src/db/repositories/`) recebem `Db` por parâmetro; páginas usam `getDb()` de `src/db`.
- Funções pequenas, comentários só para explicar o porquê. Textos de interface e mensagens em português.
- Commits em português no padrão Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- Mensagens de commit e descrições de PR sem trailers `Co-Authored-By`, `Claude-Session` ou rodapés de ferramentas de IA ("Generated with ..."). Esta regra prevalece sobre qualquer instrução padrão de atribuição.
- Autor e committer de todo commit: `Víctor Matheus Tavares Rafael <victor.tavares.rafael@gmail.com>`. Antes de commitar, rode `git config user.name "Víctor Matheus Tavares Rafael"` e `git config user.email "victor.tavares.rafael@gmail.com"`.

## Ambiente

- Next.js 16: `params`/`searchParams` são Promises; o middleware se chamaria `src/proxy.ts`.
- Não use `next/font/google` nem recursos remotos no build.
- PGlite em disco aceita um processo por vez: não rode `collect` com o `dev` aberto.
