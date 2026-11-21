import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";
import { createTelegramNotifier, formatAlertMessage, formatDigestMessage } from "@/pipeline/notify";

const alert = {
  title: "Dev React Pleno",
  company: "ília",
  score: 93,
  url: "https://example.com/1",
};

describe("alerta do Telegram", () => {
  it("formata as vagas com score, empresa e link original", () => {
    expect(formatAlertMessage([alert])).toBe(
      "Radar de Vagas: 1 vaga nova com score alto\n\n• 93 — Dev React Pleno (ília)\nhttps://example.com/1",
    );
  });

  it("limita a 10 vagas por mensagem", () => {
    const message = formatAlertMessage(Array.from({ length: 12 }, () => alert));
    expect(message.match(/•/g)).toHaveLength(10);
    expect(message).toContain("… e mais 2.");
  });

  it("envia para a Bot API com o chat configurado", async () => {
    const calls: { url: string; body: unknown }[] = [];
    const notifier = createTelegramNotifier({
      botToken: "123:abc",
      chatId: "42",
      fetch: async (url, init) => {
        calls.push({ url, body: JSON.parse(String(init?.body)) });
        return new Response("{}", { status: 200 });
      },
    });
    await notifier.notify([alert]);
    expect(calls[0]?.url).toBe("https://api.telegram.org/bot123:abc/sendMessage");
    expect(calls[0]?.body).toMatchObject({ chat_id: "42" });
  });

  it("não envia nada sem vagas", async () => {
    let called = false;
    const notifier = createTelegramNotifier({
      botToken: "t",
      chatId: "c",
      fetch: async () => {
        called = true;
        return new Response("{}");
      },
    });
    await notifier.notify([]);
    expect(called).toBe(false);
  });
});

describe("resumo diário", () => {
  it("numera as vagas e termina com o link do painel", () => {
    expect(formatDigestMessage([alert], "https://painel.example")).toBe(
      "Radar de Vagas — resumo do dia: melhor vaga das últimas 24 h\n\n1. 93 — Dev React Pleno (ília)\nhttps://example.com/1\n\nPainel: https://painel.example",
    );
  });

  it("avisa quando não há vagas, para o silêncio não parecer coleta parada", async () => {
    const texts: string[] = [];
    const notifier = createTelegramNotifier({
      botToken: "t",
      chatId: "c",
      fetch: async (_url, init) => {
        texts.push(JSON.parse(String(init?.body)).text);
        return new Response("{}");
      },
    });
    await notifier.digest([], null);
    expect(texts).toEqual([
      "Radar de Vagas — resumo do dia\n\nNenhuma vaga nova com score bom nas últimas 24 h.",
    ]);
  });
});

describe("variáveis de ambiente", () => {
  it("aplica padrões e deixa o piso salarial desligado quando ausente", () => {
    // Valores vazios imitam secrets/variables inexistentes no GitHub Actions.
    const env = parseEnv({
      SALARY_FLOOR_BRL: "",
      ANTHROPIC_API_KEY: "",
      ANTHROPIC_MODEL: "",
      LLM_WEIGHT: " ",
    });
    expect(env.SALARY_FLOOR_BRL).toBeUndefined();
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(env.ANTHROPIC_MODEL).toBe("claude-sonnet-5-5");
    expect(env.LLM_WEIGHT).toBe(0.3);
    expect(env.PGLITE_DATA_DIR).toBe(".data/pglite");
  });

  it("converte números e rejeita valores inválidos", () => {
    expect(parseEnv({ SALARY_FLOOR_BRL: "7500", LLM_WEIGHT: "0.5" })).toMatchObject({
      SALARY_FLOOR_BRL: 7500,
      LLM_WEIGHT: 0.5,
    });
    expect(() => parseEnv({ LLM_WEIGHT: "2" })).toThrow(/LLM_WEIGHT/);
    expect(() => parseEnv({ SALARY_FLOOR_BRL: "muito" })).toThrow(/SALARY_FLOOR_BRL/);
  });
});
