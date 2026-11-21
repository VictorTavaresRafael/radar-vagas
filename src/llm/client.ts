import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

export interface JsonRequest<T> {
  readonly system: string;
  readonly prompt: string;
  readonly schema: z.ZodType<T>;
  readonly maxTokens?: number;
}

/** Fronteira com o modelo: quem usa recebe sempre um objeto já validado pelo zod. */
export interface LlmClient {
  readonly model: string;
  completeJson<T>(request: JsonRequest<T>): Promise<T>;
}

export class LlmOutputError extends Error {
  override readonly name = "LlmOutputError";
}

/** Aceita a resposta crua ou envolta em bloco de código, que alguns modelos insistem em usar. */
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const candidate = (fenced?.[1] ?? text).trim();
  const start = candidate.search(/[[{]/);
  if (start === -1) throw new LlmOutputError("Resposta do modelo sem JSON.");
  try {
    return JSON.parse(candidate.slice(start));
  } catch {
    throw new LlmOutputError("JSON inválido na resposta do modelo.");
  }
}

export function parseWithSchema<T>(text: string, schema: z.ZodType<T>): T {
  const result = schema.safeParse(extractJson(text));
  if (!result.success) {
    throw new LlmOutputError(`Resposta fora do formato esperado: ${result.error.message}`);
  }
  return result.data;
}

export interface AnthropicOptions {
  readonly apiKey: string;
  readonly model: string;
  /** Injetável para testes offline. */
  readonly fetch?: typeof fetch;
}

export function createAnthropicClient(options: AnthropicOptions): LlmClient {
  const anthropic = new Anthropic({
    apiKey: options.apiKey,
    maxRetries: 2,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
  return {
    model: options.model,
    async completeJson<T>(request: JsonRequest<T>): Promise<T> {
      const message = await anthropic.messages.create({
        model: options.model,
        max_tokens: request.maxTokens ?? 1024,
        system: request.system,
        messages: [{ role: "user", content: request.prompt }],
      });
      const text = message.content
        .flatMap((block) => (block.type === "text" ? [block.text] : []))
        .join("");
      return parseWithSchema(text, request.schema);
    },
  };
}
