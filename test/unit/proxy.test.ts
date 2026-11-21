import { describe, expect, it } from "vitest";
import { hasValidCredentials } from "@/proxy";

const basic = (credentials: string) => `Basic ${Buffer.from(credentials).toString("base64")}`;

describe("senha do painel", () => {
  it("aceita qualquer usuário com a senha correta", () => {
    expect(hasValidCredentials(basic("victor:segredo"), "segredo")).toBe(true);
    expect(hasValidCredentials(basic(":segredo"), "segredo")).toBe(true);
  });

  it("recusa senha errada, prefixo da senha ou cabeçalho ausente", () => {
    expect(hasValidCredentials(basic("victor:errada"), "segredo")).toBe(false);
    expect(hasValidCredentials(basic("victor:segred"), "segredo")).toBe(false);
    expect(hasValidCredentials(null, "segredo")).toBe(false);
    expect(hasValidCredentials("Bearer x", "segredo")).toBe(false);
  });
});
