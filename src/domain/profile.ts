import { findTechnologies, type TechName } from "./tech-catalog";

export type FactKind = "cargo" | "experiencia" | "formacao" | "certificacao" | "idiomas";

/**
 * Um fato verificado sobre o candidato, escrito em primeira pessoa para poder ser
 * usado literalmente nos rascunhos. As tecnologias que ele autoriza citar são as
 * que o catálogo reconhece no próprio texto, para que lista e texto nunca divirjam.
 */
export interface ProfileFact {
  readonly id: string;
  readonly kind: FactKind;
  readonly text: string;
}

export interface Profile {
  readonly name: string;
  readonly firstName: string;
  readonly headline: string;
  readonly currentCompany: string;
  readonly location: string;
  /** Cidades em que híbrido/presencial é aceitável; híbrido/presencial em qualquer outra é eliminatório. */
  readonly acceptedCities: readonly string[];
  readonly targets: readonly string[];
  /** Sem experiência profissional: nunca podem aparecer nos fatos nem nos rascunhos. */
  readonly notExperienced: readonly TechName[];
  readonly facts: readonly ProfileFact[];
  /** Texto do currículo atual, usado para saber o que "você tem e não escreveu". */
  readonly resume: string;
}

export function factTechnologies(fact: ProfileFact): TechName[] {
  return findTechnologies(fact.text);
}

export function profileTechnologies(profile: Profile): Set<TechName> {
  return new Set(profile.facts.flatMap(factTechnologies));
}
