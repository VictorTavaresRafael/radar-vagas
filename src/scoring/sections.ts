import { normalizeForMatch } from "@/lib/text";

/**
 * Classifica cada linha da descrição como requisito, diferencial ou neutra
 * (benefícios, sobre a empresa). Os filtros eliminatórios só olham requisitos,
 * porque ".NET como diferencial" não deve derrubar uma vaga de React.
 */
export type LineContext = "required" | "optional" | "neutral";

export interface ClassifiedLine {
  readonly text: string;
  readonly context: LineContext;
}

const OPTIONAL_HEADING =
  /^(diferenciais|diferencial|desejaveis|desejavel|sera um diferencial|nice to have|nice-to-have|bonus|bonus points|pontos extras|plus|it's a plus|extras|preferred qualifications)\b/;
const REQUIRED_HEADING =
  /^(requisitos|requirements|qualificacoes|qualifications|o que esperamos|o que buscamos|o que voce precisa|voce precisa|what you('ll)? need|what we('re)? looking for|must have|must-haves?|responsabilidades|responsibilities|atividades|o que voce vai fazer|what you('ll)? do|competencias|habilidades|skills|about you|sobre voce|stack|tecnologias)\b/;
const NEUTRAL_HEADING =
  /^(beneficios|benefits|perks|o que oferecemos|what we offer|sobre( a| nos| o time| a empresa)?|about( us| the company| the role)?|quem somos|processo seletivo|etapas|local|salario|remuneracao|faixa salarial|contratacao)\b/;
const OPTIONAL_INLINE =
  /\b(diferencia(l|is)|desejavel|desejaveis|nice to have|nice-to-have|is a plus|a plus|bonus|seria otimo|sera um plus|preferencialmente|preferred)\b/;

const MAX_HEADING_LENGTH = 60;

function headingContext(line: string): LineContext | null {
  const normalized = normalizeForMatch(line)
    .replace(/^[-*#\s]+/, "")
    .replace(/[:!?.]+$/, "");
  if (normalized.length === 0 || normalized.length > MAX_HEADING_LENGTH) return null;
  if (OPTIONAL_HEADING.test(normalized)) return "optional";
  if (NEUTRAL_HEADING.test(normalized)) return "neutral";
  if (REQUIRED_HEADING.test(normalized)) return "required";
  return null;
}

export function classifyLines(description: string): ClassifiedLine[] {
  // Antes do primeiro título o texto costuma descrever a vaga, então conta como requisito.
  let current: LineContext = "required";
  const result: ClassifiedLine[] = [];
  for (const raw of description.split("\n")) {
    const text = raw.trim();
    if (!text) continue;
    // O próprio título entra no contexto que ele abre: "Stack: .NET e Angular" é título e conteúdo.
    const heading = headingContext(text.split(":")[0] ?? text);
    if (heading) current = heading;
    const inlineOptional = OPTIONAL_INLINE.test(normalizeForMatch(text));
    result.push({ text, context: inlineOptional ? "optional" : current });
  }
  return result;
}
