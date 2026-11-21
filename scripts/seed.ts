import { profile } from "@config/profile";
import { buildCollectors } from "@/collectors";
import { createDbFromEnv } from "@/db/client";
import { getEnv } from "@/lib/env";
import { runCollect } from "@/pipeline/collect";
import { createFixtureFetch, FIXTURE_SOURCES } from "../test/support/fixtures";
import { loadDotEnv } from "./load-env";

/** Popula o banco local com as fixtures dos testes, para ver o painel sem acessar a rede. */
loadDotEnv();
const env = getEnv();
const handle = createDbFromEnv(env);

try {
  await handle.migrate();
  const report = await runCollect({
    db: handle.db,
    collectors: buildCollectors(FIXTURE_SOURCES, {
      fetch: createFixtureFetch(),
      warn: console.warn,
    }),
    scoreContext: {
      profile,
      salaryFloorBrl: env.SALARY_FLOOR_BRL ?? null,
      llmWeight: env.LLM_WEIGHT,
      now: new Date(),
    },
    llm: null,
    notifier: null,
    log: console.log,
  });
  console.log(`Seed concluído: ${report.inserted} vagas novas, ${report.updated} já existentes.`);
} finally {
  await handle.close();
}
