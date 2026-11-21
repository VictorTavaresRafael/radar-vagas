import { scoring } from "@config/scoring";
import { isBrazilLocation, isJuniorPleno } from "@/collectors/infer";
import type { NormalizedJob } from "@/domain/job";
import { profileTechnologies } from "@/domain/profile";
import { findTechnologies, type TechName } from "@/domain/tech-catalog";
import { isInAcceptedCity } from "./filters";
import { classifyLines } from "./sections";
import type { ScoreComponent, ScoreContext } from "./types";

const DAY_MS = 86_400_000;

/** Framework exigido que o perfil não tem, quando a vaga não cita nenhum framework do perfil. */
function offProfileFrameworks(
  job: NormalizedJob,
  techs: ReadonlySet<TechName>,
  context: ScoreContext,
): TechName[] {
  const core: readonly TechName[] = scoring.coreFrameworks;
  if (core.some((tech) => techs.has(tech))) return [];
  const known = profileTechnologies(context.profile);
  const candidates = new Set<TechName>(
    scoring.offProfileFrameworks.filter((tech) => !known.has(tech)),
  );
  const required = new Set(
    [
      job.title,
      ...classifyLines(job.description)
        .filter((line) => line.context === "required")
        .map((line) => line.text),
    ].flatMap((text) => findTechnologies(text)),
  );
  return [...candidates].filter((tech) => required.has(tech));
}

function stackComponent(job: NormalizedJob, context: ScoreContext): ScoreComponent {
  const techs = new Set(findTechnologies(`${job.title}\n${job.description}`));
  const hits = scoring.stack.filter((item) => item.techs.some((tech) => techs.has(tech)));
  const misses = scoring.stack.filter((item) => !hits.includes(item));
  const max = scoring.stack.reduce((sum, item) => sum + item.weight, 0);
  const outside = offProfileFrameworks(job, techs, context);
  if (outside.length > 0) {
    return {
      key: "stack",
      label: "Stack",
      points: 0,
      max,
      reason: `Framework principal fora do perfil: ${outside.join(", ")}, sem React/Next.js.`,
    };
  }
  const points = hits.reduce((sum, item) => sum + item.weight, 0);
  const found = hits.map((item) => `${item.label} (+${item.weight})`).join(", ") || "nenhuma";
  const absent = misses.map((item) => item.label).join(", ");
  return {
    key: "stack",
    label: "Stack",
    points,
    max,
    reason: absent ? `Encontrado: ${found}. Ausente: ${absent}.` : `Encontrado: ${found}.`,
  };
}

function seniorityComponent(job: NormalizedJob): ScoreComponent {
  const weights = scoring.seniority;
  const base = { key: "senioridade", label: "Senioridade", max: weights.max } as const;
  if (isJuniorPleno(job.title)) {
    return { ...base, points: weights.juniorPleno, reason: "Júnior/Pleno." };
  }
  switch (job.seniority) {
    case "pleno":
      return { ...base, points: weights.pleno, reason: "Pleno: nível-alvo." };
    case "junior":
      return { ...base, points: weights.junior, reason: "Júnior: abaixo do nível atual." };
    case "senior":
      return { ...base, points: weights.senior, reason: "Sênior: acima do nível atual." };
    default:
      return { ...base, points: weights.unknown, reason: "Senioridade não informada." };
  }
}

function modalityComponent(job: NormalizedJob, context: ScoreContext): ScoreComponent {
  const weights = scoring.modality;
  const base = { key: "modalidade", label: "Modalidade", max: weights.max } as const;
  const place = job.location ?? job.title;
  const inCity = isInAcceptedCity(place, context.profile);
  switch (job.modality) {
    case "remoto":
      return isBrazilLocation(job.location) === false
        ? {
            ...base,
            points: weights.remoteInternational,
            reason: `Remoto internacional (${job.location}).`,
          }
        : { ...base, points: weights.remoteBrazil, reason: "Remoto no Brasil." };
    case "hibrido":
      return inCity
        ? {
            ...base,
            points: weights.hybridAcceptedCity,
            reason: `Híbrido em cidade aceita (${place}).`,
          }
        : {
            ...base,
            points: weights.hybridOtherCity,
            reason: `Híbrido fora das cidades aceitas (${job.location ?? "local não informado"}).`,
          };
    case "presencial":
      return {
        ...base,
        points: inCity ? weights.onsiteAcceptedCity : 0,
        reason: `Presencial (${place}).`,
      };
    default:
      return { ...base, points: weights.unknown, reason: "Modalidade não informada." };
  }
}

function salaryComponent(job: NormalizedJob, context: ScoreContext): ScoreComponent {
  const weights = scoring.salary;
  const base = { key: "salario", label: "Salário", max: weights.max } as const;
  const ceiling = job.salaryMax ?? job.salaryMin;
  if (ceiling === null || job.currency === null) {
    return { ...base, points: weights.undisclosed, reason: "Salário não divulgado." };
  }
  if (job.currency !== "BRL") {
    return {
      ...base,
      points: weights.undisclosed,
      reason: `Salário em ${job.currency}; sem conversão para comparar com o piso.`,
    };
  }
  if (context.salaryFloorBrl === null) {
    return {
      ...base,
      points: weights.undisclosed,
      reason: "Piso salarial não configurado (SALARY_FLOOR_BRL).",
    };
  }
  // Abaixo do piso já foi eliminada; aqui só sobra faixa compatível.
  return {
    ...base,
    points: weights.aboveFloor,
    reason: "Faixa divulgada dentro ou acima do piso.",
  };
}

function recencyComponent(job: NormalizedJob, context: ScoreContext): ScoreComponent {
  const weights = scoring.recency;
  const base = { key: "recencia", label: "Recência", max: weights.max } as const;
  if (!job.postedAt) {
    return { ...base, points: weights.unknown, reason: "Data de publicação desconhecida." };
  }
  const days = Math.max(0, (context.now.getTime() - job.postedAt.getTime()) / DAY_MS);
  const band = weights.bands.find((candidate) => days <= candidate.maxDays);
  const rounded = Math.floor(days);
  const age = rounded === 0 ? "hoje" : `há ${rounded} dia${rounded === 1 ? "" : "s"}`;
  return { ...base, points: band?.points ?? 0, reason: `Publicada ${age}.` };
}

export function deterministicComponents(
  job: NormalizedJob,
  context: ScoreContext,
): ScoreComponent[] {
  return [
    stackComponent(job, context),
    seniorityComponent(job),
    modalityComponent(job, context),
    salaryComponent(job, context),
    recencyComponent(job, context),
  ];
}

export function sumComponents(components: readonly ScoreComponent[]): number {
  return components.reduce((sum, component) => sum + component.points, 0);
}
