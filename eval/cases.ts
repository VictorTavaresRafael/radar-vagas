import type { EvalCase } from "@/eval/types";

/**
 * Casos rotulados à mão a partir do perfil verificado (SPEC.md): alvos Front-end Pleno,
 * Full Stack Pleno (React + Node) e QA Automação; remoto no Brasil ou híbrido/presencial
 * em Londrina ou Bauru; sem experiência com .NET, Java, Vue, Flutter, Go.
 *
 * Regra: o rótulo é o julgamento humano. Nunca ajuste um rótulo para o eval passar;
 * se o score discorda, a divergência é um achado.
 */
const REACT_REQ = "Requisitos\n- React, Next.js e TypeScript\n- Testes automatizados";
const FULLSTACK_REQ = "Requisitos\n- React e TypeScript\n- Node.js e NestJS\n- PostgreSQL";

export const evalCases: readonly EvalCase[] = [
  {
    id: "front-ideal",
    note: "Vaga-alvo clássica.",
    job: { description: REACT_REQ },
    expected: { eliminations: [], relevant: true },
  },
  {
    id: "fullstack-ideal-salario",
    note: "Full stack com salário acima do piso.",
    job: {
      title: "Desenvolvedor Full Stack Pleno",
      description: FULLSTACK_REQ,
      salaryMin: 8000,
      salaryMax: 11000,
      currency: "BRL",
    },
    expected: { eliminations: [], relevant: true },
  },
  {
    id: "dotnet-diferencial",
    note: ".NET só como diferencial não pode eliminar.",
    job: { description: `${REACT_REQ}\nDiferenciais\n- .NET e C#` },
    expected: { eliminations: [], relevant: true },
  },
  {
    id: "node-ou-java",
    note: "Alternativa do perfil na mesma linha.",
    job: {
      title: "Desenvolvedor Full Stack Pleno",
      description: "Requisitos\n- React e TypeScript\n- Node.js ou Java no back-end",
    },
    expected: { eliminations: [], relevant: true },
  },
  {
    id: "java-obrigatorio",
    note: "Back-end Java exigido.",
    job: {
      title: "Desenvolvedor Back-end Pleno",
      description: "Requisitos\n- Java 17 e Spring Boot\n- Microsserviços",
    },
    expected: { eliminations: ["linguagem"], relevant: false },
  },
  {
    id: "php-no-titulo",
    note: "Linguagem proibida no título.",
    job: { title: "Desenvolvedor PHP Pleno", description: "Requisitos\n- Laravel\n- MySQL" },
    expected: { eliminations: ["linguagem"], relevant: false },
  },
  {
    id: "flutter-mobile",
    note: "Mobile Flutter.",
    job: { title: "Desenvolvedor Mobile Pleno", description: "Requisitos\n- Flutter e Dart" },
    expected: { eliminations: ["linguagem"], relevant: false },
  },
  {
    id: "golang",
    note: "Go escrito como Golang.",
    job: { title: "Engenheiro de Software Pleno", description: "Requisitos\n- Golang\n- gRPC" },
    expected: { eliminations: ["linguagem"], relevant: false },
  },
  {
    id: "csharp-requisito",
    note: "C# em linha de requisito de vaga full stack.",
    job: {
      title: "Desenvolvedor Full Stack Pleno",
      description: "Requisitos\n- React\n- Experiência com C# e .NET Core",
    },
    expected: { eliminations: ["linguagem"], relevant: false },
  },
  {
    id: "java-ou-kotlin",
    note: "Alternativa que não é do perfil.",
    job: { title: "Desenvolvedor Back-end Pleno", description: "Requisitos\n- Java ou Kotlin" },
    expected: { eliminations: ["linguagem"], relevant: false },
  },
  {
    id: "senior-6-anos",
    note: "Sênior com 6+ anos.",
    job: {
      title: "Desenvolvedor Front-end Sênior",
      seniority: "senior",
      description: `${REACT_REQ}\n- 6+ anos de experiência com front-end`,
    },
    expected: { eliminations: ["senioridade"], relevant: false },
  },
  {
    id: "especialista-8-years",
    note: "Especialista em inglês, 8 years.",
    job: {
      title: "Staff Frontend Engineer",
      seniority: "senior",
      description: "Requirements\n- 8+ years building React applications\n- TypeScript",
    },
    expected: { eliminations: ["senioridade"], relevant: false },
  },
  {
    id: "senior-3-anos",
    note: "Sênior com só 3 anos: vale olhar.",
    job: {
      title: "Desenvolvedor Front-end Sênior",
      seniority: "senior",
      description: `${REACT_REQ}\n- 3 anos de experiência com React`,
    },
    expected: { eliminations: [], relevant: true },
  },
  {
    id: "ingles-fluente",
    note: "Inglês fluente obrigatório.",
    job: { description: `${REACT_REQ}\n- Inglês fluente para reuniões diárias` },
    expected: { eliminations: ["ingles"], relevant: false },
  },
  {
    id: "english-c1-requirements",
    note: "Requisito em inglês, nível C1.",
    job: {
      title: "Frontend Developer",
      location: "Remote - LATAM",
      description: "Requirements\n- React and TypeScript\n- English level C1 or higher",
    },
    expected: { eliminations: ["ingles"], relevant: false },
  },
  {
    id: "ingles-intermediario",
    note: "Inglês intermediário está no perfil.",
    job: { description: `${REACT_REQ}\n- Inglês intermediário` },
    expected: { eliminations: [], relevant: true },
  },
  {
    id: "ingles-fluente-diferencial",
    note: "Fluência só como diferencial.",
    job: { description: `${REACT_REQ}\nDiferenciais\n- Inglês fluente` },
    expected: { eliminations: [], relevant: true },
  },
  {
    id: "presencial-sao-paulo",
    note: "Presencial fora das cidades aceitas.",
    job: { modality: "presencial", location: "São Paulo, SP", description: REACT_REQ },
    expected: { eliminations: ["presencial"], relevant: false },
  },
  {
    id: "presencial-londrina",
    note: "Presencial em cidade aceita.",
    job: { modality: "presencial", location: "Londrina, PR", description: REACT_REQ },
    expected: { eliminations: [], relevant: true },
  },
  {
    id: "hibrido-bauru",
    note: "Híbrido em cidade aceita.",
    job: {
      modality: "hibrido",
      location: "Bauru, SP",
      description: "Requisitos\n- Next.js, Tailwind CSS e TypeScript",
    },
    expected: { eliminations: [], relevant: true },
  },
  {
    id: "hibrido-curitiba",
    note: "Híbrido fora das cidades: inviável, embora o SPEC não tenha filtro para isso.",
    job: { modality: "hibrido", location: "Curitiba, PR", description: REACT_REQ },
    expected: { eliminations: [], relevant: false },
  },
  {
    id: "salario-abaixo-piso",
    note: "Faixa abaixo do piso de R$ 6.000.",
    job: { description: REACT_REQ, salaryMin: 3500, salaryMax: 4500, currency: "BRL" },
    expected: { eliminations: ["salario"], relevant: false },
  },
  {
    id: "salario-usd",
    note: "Dólar não é convertido: não elimina.",
    job: {
      location: "Remote - LATAM",
      contract: "contractor",
      description: REACT_REQ,
      salaryMin: 2000,
      salaryMax: 3000,
      currency: "USD",
    },
    expected: { eliminations: [], relevant: true },
  },
  {
    id: "qa-cypress",
    note: "QA Automação é alvo do perfil.",
    job: {
      title: "QA Automação Pleno",
      description: "Requisitos\n- Cypress\n- JavaScript ou TypeScript\n- Testes de API",
    },
    expected: { eliminations: [], relevant: true },
  },
  {
    id: "vue-front",
    note: "Vue não está no perfil.",
    job: { description: "Requisitos\n- Vue.js 3 e TypeScript\n- Pinia" },
    expected: { eliminations: [], relevant: false },
  },
  {
    id: "dados-python",
    note: "Engenharia de dados não é alvo.",
    job: {
      title: "Engenheiro de Dados Pleno",
      description: "Requisitos\n- Python e SQL\n- Airflow\n- AWS",
    },
    expected: { eliminations: [], relevant: false },
  },
  {
    id: "android-kotlin",
    note: "Mobile nativo não é alvo.",
    job: { title: "Desenvolvedor Android Pleno", description: "Requisitos\n- Kotlin\n- Jetpack" },
    expected: { eliminations: [], relevant: false },
  },
  {
    id: "vaga-antiga",
    note: "Vaga-alvo publicada há 40 dias continua relevante.",
    job: {
      title: "Desenvolvedor Full Stack Pleno",
      description: FULLSTACK_REQ,
      postedAt: new Date("2026-10-11T12:00:00Z"),
    },
    expected: { eliminations: [], relevant: true },
  },
  {
    id: "multiplas-eliminacoes",
    note: "Sênior, 7 anos e inglês fluente.",
    job: {
      title: "Senior React Developer",
      seniority: "senior",
      location: "Remote - LATAM",
      description: "Requirements\n- 7+ years with React\n- Fluent English",
    },
    expected: { eliminations: ["senioridade", "ingles"], relevant: false },
  },
  {
    id: "sobre-empresa-java",
    note: "Java citado só na seção sobre a empresa.",
    job: { description: `Sobre a empresa\nNosso legado é em Java.\n${REACT_REQ}` },
    expected: { eliminations: [], relevant: true },
  },
];
