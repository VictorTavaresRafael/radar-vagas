import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createAnthropicClient, extractJson, LlmOutputError } from "@/llm/client";

const schema = z.object({ nota: z.number() });

function anthropicResponse(text: string): Response {
  return new Response(
    JSON.stringify({
      id: "msg_teste",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-5-5",
      content: [{ type: "text", text, citations: null }],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 5 },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("extractJson", () => {
  it("aceita JSON puro, em bloco de código ou com texto antes", () => {
    expect(extractJson('{"nota": 1}')).toEqual({ nota: 1 });
    expect(extractJson('```json\n{"nota": 2}\n```')).toEqual({ nota: 2 });
    expect(extractJson('Aqui está: {"nota": 3}')).toEqual({ nota: 3 });
  });

  it("falha com erro próprio quando não há JSON", () => {
    expect(() => extractJson("sem json")).toThrow(LlmOutputError);
  });
});

describe("createAnthropicClient", () => {
  it("chama a Messages API com o modelo configurado e valida a resposta com zod", async () => {
    const requests: { url: string; body: Record<string, unknown> }[] = [];
    const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      requests.push({ url: String(input), body: JSON.parse(String(init?.body)) });
      return anthropicResponse('{"nota": 77}');
    };
    const client = createAnthropicClient({
      apiKey: "sk-teste",
      model: "claude-sonnet-5-5",
      fetch: fakeFetch,
    });

    await expect(client.completeJson({ system: "s", prompt: "p", schema })).resolves.toEqual({
      nota: 77,
    });
    expect(requests[0]?.url).toContain("/v1/messages");
    expect(requests[0]?.body).toMatchObject({
      model: "claude-sonnet-5-5",
      system: "s",
      messages: [{ role: "user", content: "p" }],
    });
  });

  it("rejeita resposta que não passa no schema", async () => {
    const client = createAnthropicClient({
      apiKey: "sk-teste",
      model: "claude-sonnet-5-5",
      fetch: async () => anthropicResponse('{"nota": "alta"}'),
    });
    await expect(client.completeJson({ system: "s", prompt: "p", schema })).rejects.toThrow(
      LlmOutputError,
    );
  });
});
