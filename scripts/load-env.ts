import { existsSync } from "node:fs";

/** Scripts rodam fora do Next, que é quem carregaria o .env; no CI as variáveis já vêm do ambiente. */
export function loadDotEnv(file = ".env"): void {
  if (existsSync(file)) process.loadEnvFile(file);
}
