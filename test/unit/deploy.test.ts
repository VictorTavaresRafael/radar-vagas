import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseEnv } from "@/lib/env";
import { proxy } from "@/proxy";

const basic = (credentials: string) => `Basic ${Buffer.from(credentials).toString("base64")}`;
const request = (authorization?: string) =>
  new NextRequest("https://radar.example.com/", {
    headers: authorization ? { authorization } : {},
  });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("deploy na Vercel", () => {
  it("exige DATABASE_URL e DASHBOARD_PASSWORD quando VERCEL=1", () => {
    expect(() => parseEnv({ VERCEL: "1" })).toThrow(/DATABASE_URL: obrigatória na Vercel/);
    expect(() => parseEnv({ VERCEL: "1", DATABASE_URL: "postgresql://x" })).toThrow(
      /DASHBOARD_PASSWORD: obrigatória na Vercel/,
    );
    expect(
      parseEnv({ VERCEL: "1", DATABASE_URL: "postgresql://x", DASHBOARD_PASSWORD: "s" }),
    ).toMatchObject({ DATABASE_URL: "postgresql://x" });
  });

  it("localmente nada é obrigatório", () => {
    expect(() => parseEnv({})).not.toThrow();
  });

  it("proxy falha fechado na Vercel sem senha", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("DASHBOARD_PASSWORD", "");
    expect(proxy(request()).status).toBe(503);
  });

  it("proxy pede senha quando definida e libera com a correta", () => {
    vi.stubEnv("DASHBOARD_PASSWORD", "segredo");
    expect(proxy(request()).status).toBe(401);
    expect(proxy(request(basic("victor:errada"))).status).toBe(401);
    expect(proxy(request(basic("victor:segredo"))).headers.get("x-middleware-next")).toBe("1");
  });

  it("proxy libera tudo localmente sem senha", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("DASHBOARD_PASSWORD", "");
    expect(proxy(request()).headers.get("x-middleware-next")).toBe("1");
  });
});
