import { sources } from "@config/sources";
import { buildCollectors } from "@/collectors";
import { createDbFromEnv } from "@/db/client";
import { getEnv } from "@/lib/env";
import { runCollect } from "@/pipeline/collect";
import { createLlmFromEnv, createNotifierFromEnv, scoreContextFromEnv } from "@/runtime";
import { loadDotEnv } from "./load-env";

loadDotEnv();
const env = getEnv();
const handle = createDbFromEnv(env);

try {
  await handle.migrate();
  const llm = createLlmFromEnv(env);
  console.log(
    `Banco: ${handle.kind}. LLM: ${llm ? llm.model : "desligado (score determinístico)"}.`,
  );
  const report = await runCollect({
    db: handle.db,
    collectors: buildCollectors(sources, { fetch, warn: console.warn, token: env.GITHUB_TOKEN }),
    scoreContext: scoreContextFromEnv(env, new Date()),
    llm,
    notifier: createNotifierFromEnv(env, fetch),
    log: console.log,
  });
  console.log(
    `${report.normalized} vagas coletadas, ${report.unique} únicas: ${report.inserted} novas, ${report.updated} já conhecidas, ${report.alerts.length} com score alto.`,
  );
  // Falha total (todas as fontes fora) deve aparecer como erro no GitHub Actions.
  if (report.collectors.every((collector) => collector.error !== null)) process.exitCode = 1;
} finally {
  await handle.close();
}
