import { sources } from "@config/sources";
import { buildCollectors } from "@/collectors";
import { createDbFromEnv } from "@/db/client";
import { listDigestJobs } from "@/db/repositories/jobs";
import { getEnv } from "@/lib/env";
import { runCollect } from "@/pipeline/collect";
import { formatTopJobs } from "@/pipeline/report";
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
  for (const line of formatTopJobs(report.top)) console.log(line);
  const notifier = createNotifierFromEnv(env, fetch);
  if (env.SEND_DIGEST === "1") {
    if (!notifier) {
      console.log(
        "Resumo diário não enviado: TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID não configurados.",
      );
    } else {
      const best = await listDigestJobs(handle.db, new Date());
      try {
        await notifier.digest(best, env.PANEL_URL ?? null);
        console.log(`Resumo diário enviado com ${best.length} vaga(s).`);
      } catch (error) {
        console.log(
          `Resumo diário não enviado: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
  // Falha total (todas as fontes fora) deve aparecer como erro no GitHub Actions.
  if (report.collectors.every((collector) => collector.error !== null)) process.exitCode = 1;
} finally {
  await handle.close();
}
