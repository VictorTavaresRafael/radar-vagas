import { describe, expect, it } from "vitest";
import {
  decodeHtmlEntities,
  htmlToText,
  markdownToText,
  normalizeForMatch,
  truncate,
} from "@/lib/text";

describe("htmlToText", () => {
  it("decodifica o HTML escapado do Greenhouse e preserva as linhas", () => {
    const escaped =
      "&lt;p&gt;&lt;strong&gt;Requisitos&lt;/strong&gt;&lt;/p&gt;&lt;ul&gt;&lt;li&gt;React &amp;amp; TypeScript&lt;/li&gt;&lt;/ul&gt;";
    expect(htmlToText(escaped)).toBe("Requisitos\n\n- React & TypeScript");
  });

  it("aceita HTML comum (Lever, Remotive)", () => {
    expect(htmlToText("<p>Olá&nbsp;mundo</p><br/><li>Item</li>")).toBe("Olá mundo\n\n- Item");
  });
});

describe("markdownToText", () => {
  it("remove comentários, títulos, links e negrito do corpo das issues", () => {
    const body =
      "<!-- template -->\n## Requisitos\n**Obrigatórios:**\n* React\n[link](https://x.y)";
    expect(markdownToText(body)).toBe("Requisitos\nObrigatórios:\n- React\nlink");
  });
});

describe("utilitários", () => {
  it("normaliza acentos, caixa e espaços", () => {
    expect(normalizeForMatch("  Sênior   ÍLIA ")).toBe("senior ilia");
  });

  it("decodifica entidades numéricas", () => {
    expect(decodeHtmlEntities("&#233;&#x00E7;")).toBe("éç");
  });

  it("trunca com reticências sem passar do limite", () => {
    expect(truncate("abcdefghij", 5)).toBe("abcd…");
    expect(truncate("abc", 5)).toBe("abc");
  });
});
