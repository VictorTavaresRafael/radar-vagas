import type { JsonRequest, LlmClient } from "@/llm/client";

export interface FakeLlm extends LlmClient {
  readonly requests: JsonRequest<unknown>[];
}

/** LLM falso: devolve a resposta configurada passando pelo mesmo schema zod do cliente real. */
export function fakeLlm(response: unknown): FakeLlm {
  const requests: JsonRequest<unknown>[] = [];
  return {
    model: "modelo-de-teste",
    requests,
    async completeJson<T>(request: JsonRequest<T>): Promise<T> {
      requests.push(request as JsonRequest<unknown>);
      return request.schema.parse(response);
    },
  };
}

export function failingLlm(message: string): FakeLlm {
  const requests: JsonRequest<unknown>[] = [];
  return {
    model: "modelo-de-teste",
    requests,
    async completeJson<T>(request: JsonRequest<T>): Promise<T> {
      requests.push(request as JsonRequest<unknown>);
      throw new Error(message);
    },
  };
}
