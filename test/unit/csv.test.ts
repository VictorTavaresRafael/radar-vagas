import { describe, expect, it } from "vitest";
import { applicationsToCsv, csvFileName } from "@/domain/applications-csv";
import { CSV_BOM, escapeCsvCell, toCsv } from "@/lib/csv";

describe("CSV", () => {
  it("escapa separador, aspas e quebras de linha", () => {
    expect(escapeCsvCell("simples")).toBe("simples");
    expect(escapeCsvCell("a;b")).toBe('"a;b"');
    expect(escapeCsvCell('disse "oi"')).toBe('"disse ""oi"""');
    expect(escapeCsvCell("linha 1\nlinha 2")).toBe('"linha 1\nlinha 2"');
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(87)).toBe("87");
  });

  it("neutraliza células que o Excel executaria como fórmula", () => {
    expect(escapeCsvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(escapeCsvCell("+5511999")).toBe("'+5511999");
    expect(escapeCsvCell("-1")).toBe("'-1");
    expect(escapeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("começa com BOM e usa CRLF", () => {
    expect(toCsv(["a", "b"], [["1", 2]])).toBe(`${CSV_BOM}a;b\r\n1;2\r\n`);
  });

  it("monta as candidaturas com status e datas em português", () => {
    const csv = applicationsToCsv([
      {
        company: "ília",
        title: "Desenvolvedor Front-end Pleno",
        url: "https://example.com/1",
        status: "entrevista",
        appliedAt: new Date("2026-11-10T15:00:00Z"),
        channel: "Site da empresa",
        nextStep: "Entrevista técnica",
        nextStepAt: new Date("2026-11-25T15:00:00Z"),
        score: 88,
        notes: "",
      },
    ]);
    const [header, row] = csv.slice(CSV_BOM.length).split("\r\n");
    expect(header?.split(";")).toHaveLength(10);
    expect(row).toBe(
      "ília;Desenvolvedor Front-end Pleno;https://example.com/1;Entrevista;10/11/2026;Site da empresa;Entrevista técnica;25/11/2026;88;",
    );
  });

  it("nomeia o arquivo com a data", () => {
    expect(csvFileName(new Date("2026-11-21T12:00:00Z"))).toBe("candidaturas-2026-11-21.csv");
  });
});
