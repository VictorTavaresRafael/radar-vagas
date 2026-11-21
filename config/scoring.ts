import type { TechName } from "@/domain/tech-catalog";

export interface StackWeight {
  readonly label: string;
  /** Qualquer uma destas tecnologias na vaga concede o peso. */
  readonly techs: readonly TechName[];
  readonly weight: number;
}

/** Pesos do score determinístico. A soma dos máximos de cada componente é 100. */
export const scoring = {
  stack: [
    { label: "React", techs: ["React", "React Native"], weight: 10 },
    { label: "Next.js", techs: ["Next.js"], weight: 8 },
    { label: "TypeScript", techs: ["TypeScript"], weight: 8 },
    { label: "Node/NestJS", techs: ["Node.js", "NestJS"], weight: 5 },
    { label: "Tailwind", techs: ["Tailwind CSS"], weight: 3 },
    {
      label: "Testes",
      techs: ["Testes automatizados", "Vitest", "Jest", "Testing Library", "Cypress", "Playwright"],
      weight: 3,
    },
    { label: "AWS", techs: ["AWS", "AWS Amplify", "S3", "Lambda"], weight: 3 },
  ] satisfies readonly StackWeight[],
  seniority: { max: 20, pleno: 20, juniorPleno: 15, unknown: 12, junior: 8, senior: 5 },
  modality: {
    max: 20,
    remoteBrazil: 20,
    hybridAcceptedCity: 15,
    onsiteAcceptedCity: 12,
    // Internacional (LatAm/contractor) pesa menos enquanto a conversação em inglês não for B2+.
    remoteInternational: 10,
    unknown: 8,
    hybridOtherCity: 0,
  },
  salary: { max: 10, aboveFloor: 10, undisclosed: 5 },
  recency: {
    max: 10,
    unknown: 3,
    /** Faixas em dias desde a publicação, da mais recente para a mais antiga. */
    bands: [
      { maxDays: 1, points: 10 },
      { maxDays: 3, points: 8 },
      { maxDays: 7, points: 6 },
      { maxDays: 14, points: 4 },
      { maxDays: 30, points: 2 },
    ],
  },
  elimination: {
    /** Linguagens principais fora do perfil quando aparecem como requisito. */
    forbiddenMainLanguages: [".NET", "C#", "Java", "PHP", "Flutter", "Go"] satisfies TechName[],
    seniorMaxRequiredYears: 5,
  },
  /** Peso padrão do LLM na média com o determinístico (sobrescrito por LLM_WEIGHT). */
  defaultLlmWeight: 0.3,
  /** Score mínimo para o alerta do Telegram. */
  alertMinScore: 80,
  /** Uma vaga é "nova" no painel durante este intervalo após a primeira coleta. */
  newBadgeHours: 24,
} as const;
