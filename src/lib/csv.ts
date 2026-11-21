/** BOM para o Excel reconhecer UTF-8 e abrir os acentos certos. */
export const CSV_BOM = "﻿";

// Separador padrão do Excel em português (a vírgula é o separador decimal).
const SEPARATOR = ";";

// Célula começando com estes caracteres vira fórmula no Excel (injeção de CSV).
const FORMULA_START = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: string | number | null): string {
  if (value === null) return "";
  const text = String(value);
  const safe = typeof value === "string" && FORMULA_START.test(text) ? `'${text}` : text;
  return /[";\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCsv(
  header: readonly string[],
  rows: readonly (string | number | null)[][],
): string {
  const lines = [header, ...rows].map((row) => row.map(escapeCsvCell).join(SEPARATOR));
  return `${CSV_BOM}${lines.join("\r\n")}\r\n`;
}
