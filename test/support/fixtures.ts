import { readFileSync } from "node:fs";
import path from "node:path";
import type { SourcesConfig } from "@config/sources";
import { githubIssuesUrl } from "@/collectors/github-issues";
import { greenhouseUrl } from "@/collectors/greenhouse";
import { leverUrl } from "@/collectors/lever";
import { remotiveUrl } from "@/collectors/remotive";
import type { FetchLike } from "@/collectors/types";

/** Instante de referência das fixtures: todas as datas foram escritas em relação a ele. */
export const FIXTURE_NOW = new Date("2026-11-20T12:00:00Z");

/** Subconjunto de `config/sources.ts` que tem fixture gravada em test/fixtures. */
export const FIXTURE_SOURCES: SourcesConfig = {
  greenhouse: [
    { token: "ilia", company: "ília" },
    { token: "platformscience", company: "Platform Science" },
  ],
  lever: [
    { slug: "ciandt", company: "CI&T" },
    { slug: "oowlish", company: "Oowlish" },
  ],
  github: [
    { owner: "frontendbr", repo: "vagas" },
    { owner: "react-brasil", repo: "vagas" },
    { owner: "backend-br", repo: "vagas" },
  ],
  remotive: [{ category: "software-dev", search: "react" }],
};

const FIXTURES_DIR = path.join(process.cwd(), "test", "fixtures");

const ROUTES: Record<string, string> = {
  [greenhouseUrl("ilia")]: "greenhouse-ilia.json",
  [greenhouseUrl("platformscience")]: "greenhouse-platformscience.json",
  [leverUrl("ciandt")]: "lever-ciandt.json",
  [leverUrl("oowlish")]: "lever-oowlish.json",
  [githubIssuesUrl({ owner: "frontendbr", repo: "vagas" })]: "github-frontendbr-vagas.json",
  [githubIssuesUrl({ owner: "react-brasil", repo: "vagas" })]: "github-react-brasil-vagas.json",
  [githubIssuesUrl({ owner: "backend-br", repo: "vagas" })]: "github-backend-br-vagas.json",
  [remotiveUrl({ category: "software-dev", search: "react" })]: "remotive-software-dev-react.json",
};

export function readFixture(file: string): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURES_DIR, file), "utf8"));
}

export interface FixtureFetch extends FetchLike {
  readonly calls: string[];
}

/** `fetch` falso: responde com a fixture da URL e 404 para qualquer outra, sem tocar a rede. */
export function createFixtureFetch(overrides: Record<string, Response> = {}): FixtureFetch {
  const calls: string[] = [];
  const fetchFn = async (input: string): Promise<Response> => {
    calls.push(input);
    const override = overrides[input];
    if (override) return override;
    const file = ROUTES[input];
    if (!file) return new Response("not found", { status: 404 });
    return new Response(JSON.stringify(readFixture(file)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return Object.assign(fetchFn, { calls });
}
