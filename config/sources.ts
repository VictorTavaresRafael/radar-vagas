/**
 * Empresas e repositórios monitorados. Para acompanhar uma nova empresa, basta
 * acrescentar o token do board (Greenhouse) ou o slug (Lever) aqui.
 */

export interface GreenhouseBoard {
  /** Token do board: o trecho após boards.greenhouse.io/ na página de vagas da empresa. */
  readonly token: string;
  readonly company: string;
}

export interface LeverSite {
  /** Slug da empresa: o trecho após jobs.lever.co/ na página de vagas. */
  readonly slug: string;
  readonly company: string;
}

export interface GithubRepo {
  readonly owner: string;
  readonly repo: string;
}

export interface RemotiveQuery {
  readonly category: string;
  readonly search: string;
}

export interface SourcesConfig {
  readonly greenhouse: readonly GreenhouseBoard[];
  readonly lever: readonly LeverSite[];
  readonly github: readonly GithubRepo[];
  readonly remotive: readonly RemotiveQuery[];
}

export const sources: SourcesConfig = {
  greenhouse: [
    { token: "ilia", company: "ília" },
    { token: "platformscience", company: "Platform Science" },
    { token: "zupinnovation", company: "Zup Innovation" },
    { token: "rdstation", company: "RD Station" },
    { token: "nortal", company: "Nortal" },
    { token: "launchpadtechnologiesinc", company: "Launchpad Technologies" },
  ],
  lever: [
    { slug: "ciandt", company: "CI&T" },
    { slug: "bluelightconsulting", company: "Bluelight Consulting" },
    { slug: "oowlish", company: "Oowlish" },
  ],
  github: [
    { owner: "frontendbr", repo: "vagas" },
    { owner: "react-brasil", repo: "vagas" },
    { owner: "backend-br", repo: "vagas" },
  ],
  // Os termos da Remotive limitam a ~4 chamadas/dia; com o cron 2×/dia, mantenha no máximo 2 buscas.
  remotive: [{ category: "software-dev", search: "react" }],
};
