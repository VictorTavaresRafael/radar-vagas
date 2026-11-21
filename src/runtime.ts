import { profile } from "@config/profile";
import type { FetchLike } from "@/collectors/types";
import type { Env } from "@/lib/env";
import { createAnthropicClient, type LlmClient } from "@/llm/client";
import { createTelegramNotifier, type Notifier } from "@/pipeline/notify";
import type { ScoreContext } from "@/scoring/types";

/** Ponto único onde as variáveis de ambiente viram dependências concretas. */

export function createLlmFromEnv(env: Env): LlmClient | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  return createAnthropicClient({ apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL });
}

export function createNotifierFromEnv(env: Env, fetchFn: FetchLike): Notifier | null {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return null;
  return createTelegramNotifier({
    botToken: env.TELEGRAM_BOT_TOKEN,
    chatId: env.TELEGRAM_CHAT_ID,
    fetch: fetchFn,
  });
}

export function scoreContextFromEnv(env: Env, now: Date): ScoreContext {
  return {
    profile,
    salaryFloorBrl: env.SALARY_FLOOR_BRL ?? null,
    llmWeight: env.LLM_WEIGHT,
    now,
  };
}
