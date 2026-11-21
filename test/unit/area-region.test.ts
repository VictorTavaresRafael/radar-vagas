import { describe, expect, it } from "vitest";
import { classifyArea } from "@/domain/area";
import { inferRegion } from "@/domain/region";

// Títulos e locais reais da coleta de 21/11/2026.
describe("classifyArea", () => {
  it.each([
    "Desenvolvedor(a) Full Stack",
    "Mobile Developer React Native (Pleno)",
    "[POS e Meios de Pagamento] Quality Assurance Engineer - Pleno",
    "TECH OPS ANALYST I - QA TESTER | PE CROSS",
    "DATA ENGINEER II | BANKING, FINANCE & GROWTH MG",
    "Senior Data Engineer",
    "Customer Support Engineer",
    "Product Security Engineer",
    "Head of Salesforce Engineering",
    "AI Engineer Mid-level, Brazil",
    "Senior Cloud Infrastructure Engineer",
  ])("tecnologia: %s", (title) => {
    expect(classifyArea(title)).toBe("tecnologia");
  });

  it.each([
    "Agente Stone - Consultor(a) Comercial Externo | Matelândia/PR",
    "Agente Stone - Executivo(a) de Contas Externo | Osasco/SP",
    "Executive Assistant, Office of the CTO",
    "Grupo QuintoAndar | Analista de Cobrança (Evictions) [Vaga Afirmativa para Pessoas com Deficiência]",
    "Strategic Account Executive - San Francisco",
    "Business Development Representative, Financial Services - UKI",
    "Customer Success Analyst",
    "Assistente de Operações Juridicas",
    "Candidate Experience Specialist, Contractor (EMEA)",
    "Director, Partner Marketing",
    "Auxiliar de Atendimento Logístico | CNH A (Moto) | Florianópolis/SC",
    "Renewals Manager - LATAM",
    "Commercial Contracts Specialist - Legal Ops",
    "Telesales Executive - Argentina",
    "Grupo QuintoAndar | Sr Strategy Manager",
    "Grupo QuintoAndar I Sr Revenue and Pricing Management",
    "[Talent Pool] WEALTH MANAGEMENT - Belo Horizonte",
    "Grupo QuintoAndar | Growth Marketing Specialist",
    "Analista de Planejamento e Performance Sênior (vaga afirmativa PCD)",
  ])("fora: %s", (title) => {
    expect(classifyArea(title)).toBe("fora");
  });

  it("sem pista fica sem área (e continua na lista)", () => {
    expect(classifyArea("Head of Professional Services")).toBeNull();
  });
});

describe("inferRegion", () => {
  it.each([
    ["Brasil", "brasil"],
    ["Sao Paulo, Sao Paulo, Brasil", "brasil"],
    ["Brazil (Remote)", "brasil"],
    ["Belo Horizonte, MG; Curitiba, PR", "brasil"],
    ["Remoto", "brasil"],
    ["Latin America - Remote", "america_latina"],
    ["Medellin", "america_latina"],
    ["Remote, Canada; Remote, United States", "america_norte"],
    ["Hybrid - San Francisco, New York City", "america_norte"],
    ["Wellhub · Portugal (Remote)", "europa"],
    ["Hybrid - London, Berlin", "europa"],
    ["Chennai, Tamil Nadu, India", "asia"],
    ["Remote, KSA", "asia"],
    ["Remote - Australia", "oceania"],
    ["Worldwide", "global"],
    ["LATAM, Europe, USA, Canada, APAC", "global"],
  ] as const)("%s → %s", (location, expected) => {
    expect(inferRegion(location, "greenhouse")).toBe(expected);
  });

  it("vaga das comunidades brasileiras do GitHub sem local é do Brasil", () => {
    expect(inferRegion(null, "github")).toBe("brasil");
    expect(inferRegion(null, "greenhouse")).toBeNull();
  });
});
