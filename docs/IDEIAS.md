# Ideias e problemas observados

Levantados em 21/11/2026, olhando o painel publicado com as 1.210 vagas reais. Nenhum item
abaixo foi implementado: cada um muda regra de produto (`SPEC.md`) ou precisa de decisão sua.
Em ordem de impacto estimado.

## Qualidade do score

1. **Vagas fora de tecnologia poluem a lista.** Entre os scores 37–45 aparecem dezenas de
   "Agente Stone - Consultor(a) Comercial Externo", "Executive Assistant", "Analista de Cobrança",
   "Customer Success". Elas somam pontos só com modalidade, recência e salário não divulgado.
   Ideia: zerar (ou limitar a 20) a vaga cujo título não cita nenhum termo de engenharia/dev e
   cuja stack não encontrou nada. Precisa de lista de termos em `config/scoring.ts` e casos no
   `eval/`.
2. **Modalidade "Remoto" errada em vagas presenciais.** Os "Consultor(a) Comercial Externo" da
   Stone saem como Remoto porque o local não diz a modalidade e a descrição cita "remoto" em
   outro contexto. Ideia: tratar "externo", "campo", "porta a porta" e "CNH" como presencial, e
   dar menos peso à descrição quando o local é uma cidade específica.
3. **Vagas fora do Brasil sem modalidade pontuam alto.** "Software Engineer II — Chennai, Índia"
   tem 62. Ideia: local explicitamente fora do Brasil e sem "remote" vale 0 em modalidade.
4. **Configurar `SALARY_FLOOR_BRL`.** Sem ele, todo salário vale 5/10 e o filtro de piso fica
   desligado. É decisão pessoal, por isso não tem valor padrão.

## Dados

5. **Reprocessar vagas antigas.** A correção de salário deste PR vale só para vagas novas; as
   gravadas continuam com o valor errado no banco (o painel apenas esconde). Um script
   `npm run rescore` que reaplica extração e score em tudo resolveria, e também aplicaria os
   itens 1–3 quando entrarem.
6. **Esconder vagas que sumiram da fonte.** `last_seen_at` já existe. Vaga não vista há 7 dias
   provavelmente fechou: mostrar etiqueta "pode ter fechado" ou filtrar por padrão.
7. **Bluelight Consulting com 613 vagas.** Quase todas são a mesma "React Engineer - Remote,
   Latin America" em cidades diferentes; a deduplicação junta em uma (`Lever +101`), mas a coleta
   gasta tempo nelas. Ideia: limite de vagas por empresa/fonte por coleta.

## Painel

8. **Ordenação por data** além de score, e filtro "só novas (24 h)".
9. **Ações rápidas na lista:** descartar ou marcar "Interessante" sem abrir a vaga.
10. **Resumo diário no Telegram** com as 5 melhores do dia, mesmo abaixo de 80.

## Infra

11. **`DATABASE_URL` também no ambiente Preview da Vercel**, apontando para um banco de teste,
    para validar PRs antes do merge. Hoje só Production tem banco.
12. **`attachDatabasePool` (`@vercel/functions`)** para fechar conexões antes de a função
    pausar, se os timeouts voltarem mesmo com as consultas em sequência.
13. **Trocar a senha do banco** de novo (ela passou por um chat) por uma só com letras e
    números, e atualizar Vercel e o secret do GitHub juntos.
