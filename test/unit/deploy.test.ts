import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

describe("deploy na Vercel", () => {
  it("exige DATABASE_URL quando VERCEL=1", () => {
    expect(() => parseEnv({ VERCEL: "1" })).toThrow(/DATABASE_URL: obrigatória na Vercel/);
    expect(parseEnv({ VERCEL: "1", DATABASE_URL: "postgresql://x" })).toMatchObject({
      DATABASE_URL: "postgresql://x",
    });
  });

  it("localmente nada é obrigatório", () => {
    expect(() => parseEnv({})).not.toThrow();
  });
});

describe("coleta no GitHub Actions", () => {
  it("falha sem DATABASE_URL em vez de gravar num PGlite descartável", () => {
    expect(() => parseEnv({ GITHUB_ACTIONS: "true" })).toThrow(
      /DATABASE_URL: obrigatória no GitHub Actions/,
    );
    expect(() => parseEnv({ GITHUB_ACTIONS: "true", DATABASE_URL: "" })).toThrow(/DATABASE_URL/);
    expect(parseEnv({ GITHUB_ACTIONS: "true", DATABASE_URL: "postgresql://x" })).toMatchObject({
      DATABASE_URL: "postgresql://x",
    });
  });
});
