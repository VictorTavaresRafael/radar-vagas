import { scoring } from "@config/scoring";
import { z } from "zod";

const optionalString = z.string().trim().optional();

const envSchema = z.object({
  DATABASE_URL: optionalString,
  PGLITE_DATA_DIR: z.string().trim().default(".data/pglite"),
  ANTHROPIC_API_KEY: optionalString,
  ANTHROPIC_MODEL: z.string().trim().default("claude-sonnet-5-5"),
  LLM_WEIGHT: z.coerce.number().min(0).max(1).default(scoring.defaultLlmWeight),
  // Sem valor padrão de propósito: o piso é decisão pessoal, e sem ele o filtro fica desligado.
  SALARY_FLOOR_BRL: z.coerce.number().positive().optional(),
  TELEGRAM_BOT_TOKEN: optionalString,
  TELEGRAM_CHAT_ID: optionalString,
  GITHUB_TOKEN: optionalString,
  DASHBOARD_PASSWORD: optionalString,
  // A Vercel define VERCEL=1 no build e nas funções.
  VERCEL: optionalString,
});

/**
 * Publicado na Vercel, o painel precisa do Postgres (o PGlite gravaria num disco
 * efêmero) e de senha (sem ela, qualquer um com a URL veria e mudaria os dados).
 */
const deployedEnvSchema = envSchema.superRefine((env, context) => {
  if (!env.VERCEL) return;
  for (const key of ["DATABASE_URL", "DASHBOARD_PASSWORD"] as const) {
    if (!env[key]) {
      context.addIssue({ code: "custom", path: [key], message: "obrigatória na Vercel" });
    }
  }
});

export type Env = z.infer<typeof envSchema>;

/**
 * Variável vazia conta como ausente: o GitHub Actions injeta "" quando um secret ou
 * variable não existe, e `z.coerce.number("")` viraria 0 em silêncio.
 */
function dropEmpty(source: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(source).filter((entry): entry is [string, string] => Boolean(entry[1]?.trim())),
  );
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = deployedEnvSchema.safeParse(dropEmpty(source));
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Variáveis de ambiente inválidas:\n${issues.join("\n")}`);
  }
  return result.data;
}

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
