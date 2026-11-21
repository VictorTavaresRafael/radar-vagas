import { describe, expect, it } from "vitest";
import {
  inferContract,
  inferModality,
  inferSeniority,
  isBrazilLocation,
  isJuniorPleno,
  parseSalary,
} from "@/collectors/infer";

describe("parseSalary", () => {
  it.each([
    ["Faixa salarial: R$ 9.000 a R$ 12.000", { min: 9000, max: 12000, currency: "BRL" }],
    ["R$ 8.500,00 - R$ 10.000,00 (CLT)", { min: 8500, max: 10000, currency: "BRL" }],
    ["Salário: R$3500 (PJ)", { min: 3500, max: 3500, currency: "BRL" }],
    ["R$ 7 mil até R$ 9 mil", { min: 7000, max: 9000, currency: "BRL" }],
    ["$6,000 - $8,000 /month", { min: 6000, max: 8000, currency: "USD" }],
    ["USD 50k–70k per year", { min: 50000, max: 70000, currency: "USD" }],
  ])("%s", (text, expected) => {
    expect(parseSalary(text)).toEqual(expected);
  });

  it.each([
    [
      "Movimentamos R$ 2 bilhões em crédito. Salário: R$ 6.000",
      { min: 6000, max: 6000, currency: "BRL" },
    ],
    ["Raised $5 billion. Pay: $4,000 - $5,000", { min: 4000, max: 5000, currency: "USD" }],
    ["Mais de R$ 20 milhões investidos", null],
    ["Carteira de R$ 2 bi; salário R$ 7 mil", { min: 7000, max: 7000, currency: "BRL" }],
    ["R$ 9.000 bilíngue", { min: 9000, max: 9000, currency: "BRL" }],
    ["Prêmio de US$ 51 por indicação", null],
  ])("ignora cifra da empresa ou valor implausível: %s", (text, expected) => {
    expect(parseSalary(text)).toEqual(expected);
  });

  it("ignora números sem moeda", () => {
    expect(parseSalary("3 dias presenciais, 5+ anos de experiência")).toBeNull();
  });
});

describe("inferSeniority", () => {
  it.each([
    ["Desenvolvedor(a) Front-end React (Pleno)", "pleno"],
    ["Engenheiro(a) de Software Sênior - Front-end", "senior"],
    ["Software Engineer II, Frontend", "pleno"],
    ["Desenvolvedor Júnior", "junior"],
    ["Desenvolvedor Front-end Júnior/Pleno", "pleno"],
    ["React Developer (Contractor)", null],
  ])("%s → %s", (title, expected) => {
    expect(inferSeniority(title)).toBe(expected);
  });

  it("reconhece júnior/pleno para pontuar separadamente", () => {
    expect(isJuniorPleno("Dev Front-end Jr/Pl")).toBe(true);
    expect(isJuniorPleno("Dev Front-end Pleno")).toBe(false);
  });
});

describe("inferModality", () => {
  it("prioriza título e local sobre a descrição", () => {
    expect(inferModality("[Londrina] Dev Híbrido", "benefício: home office às sextas")).toBe(
      "hibrido",
    );
  });

  it("cai na descrição quando título e local não dizem nada", () => {
    expect(inferModality("Dev Front-end", "Trabalho 100% remoto")).toBe("remoto");
    expect(inferModality("Dev Front-end", "Sem informação")).toBeNull();
  });
});

describe("inferContract e local", () => {
  it("detecta CLT, PJ e contractor", () => {
    expect(inferContract("CLT")).toBe("clt");
    expect(inferContract("Contratação PJ")).toBe("pj");
    expect(inferContract("Contractor")).toBe("contractor");
    expect(inferContract("Full-time")).toBeNull();
  });

  it("separa remoto no Brasil de internacional", () => {
    expect(isBrazilLocation("Remoto - Brasil")).toBe(true);
    expect(isBrazilLocation("Campinas, SP")).toBe(true);
    expect(isBrazilLocation("Latin America")).toBe(false);
    expect(isBrazilLocation(null)).toBeNull();
  });
});
