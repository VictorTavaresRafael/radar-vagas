const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  bull: "•",
};

export function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

const BLOCK_TAGS = /<\/?(p|div|br|li|ul|ol|h[1-6]|tr|section|article|header|footer)\b[^>]*>/gi;

/**
 * Converte HTML em texto puro preservando quebras de linha nos elementos de bloco,
 * porque os filtros eliminatórios dependem de saber em qual seção cada linha está.
 */
export function htmlToText(html: string): string {
  // O Greenhouse devolve o HTML escapado (&lt;p&gt;); decodificar antes revela as tags.
  const unescaped = html.includes("&lt;") ? decodeHtmlEntities(html) : html;
  const withBreaks = unescaped.replace(/<li\b[^>]*>/gi, "\n- ").replace(BLOCK_TAGS, "\n");
  const withoutTags = withBreaks.replace(/<[^>]+>/g, "");
  return tidyLines(decodeHtmlEntities(withoutTags));
}

/** Remove a sintaxe de Markdown mais comum (issues do GitHub) mantendo as linhas. */
export function markdownToText(markdown: string): string {
  const text = markdown
    .replace(/\r\n/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[*+]\s+/gm, "- ")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/`([^`]+)`/g, "$1");
  return tidyLines(text);
}

function tidyLines(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .filter((line, index, lines) => line !== "" || (index > 0 && lines[index - 1] !== ""))
    .join("\n")
    .trim();
}

/** Minúsculas, sem acentos e com espaços colapsados: base de comparação e de dedupe. */
export function normalizeForMatch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
