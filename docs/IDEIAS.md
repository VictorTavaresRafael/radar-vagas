# Ideias e problemas observados

Levantados em 21/11/2026, olhando o painel publicado com as 1.210 vagas reais. Os itens
numerados ainda estão pendentes e precisam de decisão sua.

## Feito

- Vagas fora de tecnologia (vendas, atendimento, jurídico, RH, marketing, administrativo,
  logística) são eliminadas e saem da lista. Dev, QA, dados, DevOps, segurança e IA ficam.
  Regras em `src/domain/area.ts`.
- Região por vaga (Brasil, América Latina, América do Norte, Europa, Ásia, Oceania, África,
  Global) e filtro "Mundo todo / Brasil / Fora do Brasil / continente". `src/domain/region.ts`.
- Salário mínimo como filtro seu, com piso sugerido pela mediana dos salários divulgados.
- Faixa "Destaque" na home: score ≥ 70, coletada nos últimos 7 dias, sem candidatura.
- Vagas já gravadas sem avaliação de LLM são recalculadas a cada coleta.

## Dados

5. **Modalidade pela descrição** continua frágil: "remoto" em benefícios pode marcar uma vaga
   presencial como remota. Com as vagas de vendas fora, o impacto caiu.
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
