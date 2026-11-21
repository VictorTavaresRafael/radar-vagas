/**
 * Catálogo de tecnologias e práticas reconhecidas como palavras-chave de ATS.
 * É a mesma lista usada para pontuar a stack, detectar palavras-chave faltantes
 * e verificar se um rascunho citou algo que não está no perfil.
 */

interface TechDefinition {
  readonly name: string;
  /** Alternativas em sintaxe de RegExp, sem flags; as fronteiras são adicionadas por `boundary`. */
  readonly pattern: string;
  /** Padrões curtos e ambíguos (como "Go") só valem com a capitalização exata. */
  readonly caseSensitive?: boolean;
}

const DEFINITIONS = [
  { name: "React", pattern: "react(?:\\.js|js)?" },
  { name: "React Native", pattern: "react native" },
  { name: "Next.js", pattern: "next\\.?js" },
  { name: "TypeScript", pattern: "typescript" },
  { name: "JavaScript", pattern: "javascript|ecmascript|es6" },
  { name: "Node.js", pattern: "node(?:\\.js|js)?" },
  { name: "NestJS", pattern: "nest\\.?js" },
  { name: "Tailwind CSS", pattern: "tailwind(?:\\s*css)?" },
  { name: "HTML", pattern: "html5?" },
  { name: "CSS", pattern: "css3?" },
  { name: "Sass", pattern: "sass|scss" },
  { name: "Redux", pattern: "redux(?: toolkit)?" },
  { name: "Zustand", pattern: "zustand" },
  { name: "React Query", pattern: "react query|tanstack query" },
  { name: "Vite", pattern: "vite" },
  { name: "Storybook", pattern: "storybook" },
  { name: "Figma", pattern: "figma" },
  { name: "Design System", pattern: "design systems?" },
  { name: "Acessibilidade", pattern: "acessibilidade|accessibility|wcag|a11y" },
  { name: "SEO", pattern: "seo" },
  { name: "Performance web", pattern: "performance|core web vitals|web vitals|lighthouse" },
  { name: "PWA", pattern: "pwa|progressive web apps?" },
  { name: "Multi-tenant", pattern: "multi-?tenant" },
  { name: "Micro-frontends", pattern: "micro-?front-?ends?" },
  { name: "Microsserviços", pattern: "micro-?servi[cç]os|microservices" },
  { name: "REST", pattern: "restful|apis? rest|rest apis?" },
  { name: "GraphQL", pattern: "graphql" },
  { name: "JWT", pattern: "jwt" },
  { name: "RBAC", pattern: "rbac" },
  {
    name: "Testes automatizados",
    pattern:
      "testes? (?:automatizados?|unit[aá]rios?|de integra[cç][aã]o|e2e)|automated tests?|unit tests?|tdd",
  },
  { name: "Vitest", pattern: "vitest" },
  { name: "Jest", pattern: "jest" },
  { name: "Testing Library", pattern: "(?:react )?testing library" },
  { name: "Cypress", pattern: "cypress" },
  { name: "Playwright", pattern: "playwright" },
  { name: "Selenium", pattern: "selenium" },
  { name: "CI/CD", pattern: "ci\\s*/\\s*cd|integra[cç][aã]o cont[ií]nua|continuous integration" },
  { name: "GitHub Actions", pattern: "github actions" },
  { name: "Git", pattern: "git" },
  { name: "Docker", pattern: "docker" },
  { name: "Kubernetes", pattern: "kubernetes|k8s" },
  { name: "AWS", pattern: "aws|amazon web services" },
  { name: "AWS Amplify", pattern: "(?:aws )?amplify" },
  { name: "S3", pattern: "(?:aws |amazon )?s3" },
  { name: "Lambda", pattern: "(?:aws )?lambda" },
  { name: "Glue", pattern: "(?:aws )?glue" },
  { name: "QuickSight", pattern: "(?:amazon )?quicksight" },
  { name: "IAM", pattern: "iam" },
  { name: "ETL", pattern: "etl" },
  { name: "PostgreSQL", pattern: "postgres(?:ql)?" },
  { name: "MySQL", pattern: "mysql" },
  { name: "MariaDB", pattern: "mariadb" },
  { name: "MongoDB", pattern: "mongo(?:db)?" },
  { name: "Redis", pattern: "redis" },
  { name: "SQL", pattern: "sql" },
  { name: "Prisma", pattern: "prisma" },
  { name: "Angular", pattern: "angular(?:js)?" },
  { name: "Vue", pattern: "vue(?:\\.js|js)?" },
  { name: "Svelte", pattern: "svelte(?:kit)?" },
  { name: "WordPress", pattern: "wordpress" },
  { name: "PHP", pattern: "php" },
  { name: "Python", pattern: "python" },
  { name: "Java", pattern: "java(?!\\s*script)" },
  { name: "Kotlin", pattern: "kotlin" },
  { name: "C#", pattern: "c#" },
  { name: ".NET", pattern: "asp\\.net(?: core)?|\\.net(?: core)?|dotnet" },
  { name: "Flutter", pattern: "flutter" },
  { name: "Dart", pattern: "dart" },
  { name: "Go", pattern: "Go(?:lang)?|golang|GoLang", caseSensitive: true },
  { name: "Ruby", pattern: "ruby(?: on rails)?" },
  { name: "Bun", pattern: "bun" },
  { name: "Linux", pattern: "linux" },
  { name: "Scrum", pattern: "scrum" },
  { name: "Kanban", pattern: "kanban" },
  { name: "Metodologias ágeis", pattern: "metodologias? [aá]geis|agile|[aá]gil" },
] as const satisfies readonly TechDefinition[];

export type TechName = (typeof DEFINITIONS)[number]["name"];

interface CompiledTech {
  readonly name: TechName;
  readonly regex: RegExp;
}

function boundary(definition: TechDefinition): RegExp {
  // Fronteira por letras/dígitos Unicode: \b falha com "C#", ".NET" e palavras acentuadas.
  // Nos termos curtos o hífen também encerra a fronteira, para "Go-to-market" não contar como Go.
  const flags = definition.caseSensitive ? "u" : "iu";
  const after = definition.caseSensitive ? "[\\p{L}\\p{N}-]" : "[\\p{L}\\p{N}]";
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${definition.pattern})(?!${after})`, flags);
}

const COMPILED: readonly CompiledTech[] = DEFINITIONS.map((definition: TechDefinition) => ({
  name: definition.name as TechName,
  regex: boundary(definition),
}));

/** Tecnologias do catálogo mencionadas no texto, na ordem do catálogo e sem repetição. */
export function findTechnologies(text: string): TechName[] {
  return COMPILED.filter((tech) => tech.regex.test(text)).map((tech) => tech.name);
}

export function mentions(text: string, name: TechName): boolean {
  const tech = COMPILED.find((candidate) => candidate.name === name);
  return tech ? tech.regex.test(text) : false;
}
