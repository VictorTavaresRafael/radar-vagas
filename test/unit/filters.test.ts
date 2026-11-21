import { describe, expect, it } from "vitest";
import { findEliminations, requiredYears } from "@/scoring/filters";
import { classifyLines } from "@/scoring/sections";
import { makeContext, makeJob } from "../support/jobs";

const rules = (job: ReturnType<typeof makeJob>, context = makeContext()) =>
  findEliminations(job, context).map((elimination) => elimination.rule);

describe("seções da descrição", () => {
  it("separa requisitos, diferenciais e benefícios", () => {
    const lines = classifyLines(
      "Buscamos dev\nRequisitos\n- React\nDiferenciais:\n- .NET\nBenefícios\n- Plano de saúde\n- Java é desejável",
    );
    expect(lines.map((line) => `${line.context}:${line.text}`)).toEqual([
      "required:Buscamos dev",
      "required:Requisitos",
      "required:- React",
      "optional:Diferenciais:",
      "optional:- .NET",
      "neutral:Benefícios",
      "neutral:- Plano de saúde",
      "optional:- Java é desejável",
    ]);
  });
});

describe("filtros eliminatórios", () => {
  it("vaga compatível não é eliminada", () => {
    expect(rules(makeJob())).toEqual([]);
  });

  it.each([
    ["título", makeJob({ title: "Desenvolvedor Back-end .NET (Pleno)" })],
    ["requisito", makeJob({ description: "Requisitos\n- Experiência com Java e Spring" })],
    ["Go em requisito", makeJob({ description: "Requisitos\n- Experiência com Go em produção" })],
    ["Flutter", makeJob({ title: "Desenvolvedor Flutter Pleno" })],
    ["PHP", makeJob({ description: "Requisitos\n- PHP 8 e Laravel" })],
  ])("elimina linguagem principal fora do perfil (%s)", (_case, job) => {
    expect(rules(job)).toContain("linguagem");
  });

  it("não elimina linguagem fora do perfil como diferencial ou com alternativa do perfil", () => {
    const optional = makeJob({ description: "Requisitos\n- React\nDiferenciais\n- .NET\n- Java" });
    const alternative = makeJob({ description: "Requisitos\n- APIs REST em Node.js ou Java" });
    const goToMarket = makeJob({ description: "Requisitos\n- Apoiar o time de Go-to-market" });
    expect(rules(optional)).toEqual([]);
    expect(rules(alternative)).toEqual([]);
    expect(rules(goToMarket)).toEqual([]);
  });

  it("elimina sênior com 5+ anos obrigatórios, mas não pleno com 5 anos nem sênior sem exigência", () => {
    const senior = makeJob({
      seniority: "senior",
      description: "O que esperamos\n- 6+ anos de experiência",
    });
    const seniorAsBonus = makeJob({
      seniority: "senior",
      description: "Requisitos\n- React\nDiferenciais\n- 8 anos",
    });
    const pleno = makeJob({ description: "Requisitos\n- 5 anos de experiência com React" });
    expect(rules(senior)).toEqual(["senioridade"]);
    expect(requiredYears(senior)).toBe(6);
    expect(rules(seniorAsBonus)).toEqual([]);
    expect(rules(pleno)).toEqual([]);
  });

  it("elimina inglês fluente/C1 obrigatório, mas não intermediário nem como diferencial", () => {
    const fluent = makeJob({ description: "Requirements\n- Fluent English (C1) is required" });
    const portuguese = makeJob({ description: "Requisitos\n- Inglês fluente" });
    const intermediate = makeJob({ description: "Requisitos\n- Inglês intermediário" });
    const bonus = makeJob({ description: "Nice to have\n- Fluent English" });
    expect(rules(fluent)).toEqual(["ingles"]);
    expect(rules(portuguese)).toEqual(["ingles"]);
    expect(rules(intermediate)).toEqual([]);
    expect(rules(bonus)).toEqual([]);
  });

  it("elimina híbrido fora das cidades aceitas e mantém Londrina", () => {
    const curitiba = makeJob({ modality: "hibrido", location: "Curitiba, PR" });
    const londrina = makeJob({ modality: "hibrido", location: "Londrina, PR" });
    expect(rules(curitiba)).toEqual(["presencial"]);
    expect(findEliminations(curitiba, makeContext())[0]?.reason).toBe(
      "Híbrido fora das cidades aceitas (Curitiba, PR).",
    );
    expect(rules(londrina)).toEqual([]);
  });

  it("elimina presencial fora das cidades aceitas e mantém Londrina e Bauru", () => {
    const campinas = makeJob({ modality: "presencial", location: "Campinas, SP" });
    const unknown = makeJob({ modality: "presencial", location: null });
    const bauru = makeJob({ modality: "presencial", location: "Bauru - SP" });
    const londrinaInTitle = makeJob({
      modality: "presencial",
      location: null,
      title: "[Londrina] Dev Pleno",
    });
    expect(rules(campinas)).toEqual(["presencial"]);
    expect(rules(unknown)).toEqual(["presencial"]);
    expect(rules(bauru)).toEqual([]);
    expect(rules(londrinaInTitle)).toEqual([]);
  });

  it("elimina salário em BRL abaixo do piso só quando o piso está configurado", () => {
    const low = makeJob({ salaryMin: 3000, salaryMax: 3500, currency: "BRL" });
    const usd = makeJob({ salaryMin: 3000, salaryMax: 3500, currency: "USD" });
    expect(rules(low)).toEqual(["salario"]);
    expect(rules(low, makeContext({ salaryFloorBrl: null }))).toEqual([]);
    expect(rules(usd)).toEqual([]);
  });

  it("acumula todos os motivos com texto explicativo", () => {
    const job = makeJob({
      title: "Desenvolvedor Java Sênior",
      seniority: "senior",
      modality: "presencial",
      location: "São Paulo",
      description: "Requisitos\n- 7+ anos\n- Inglês fluente",
    });
    const eliminations = findEliminations(job, makeContext());
    expect(eliminations.map((elimination) => elimination.rule)).toEqual([
      "linguagem",
      "senioridade",
      "ingles",
      "presencial",
    ]);
    expect(eliminations[0]?.reason).toBe("Linguagem principal fora do perfil exigida: Java.");
  });
});
