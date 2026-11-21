import type { SourcesConfig } from "@config/sources";
import { createGithubIssuesCollector, type GithubCollectorDeps } from "./github-issues";
import { createGreenhouseCollector } from "./greenhouse";
import { createLeverCollector } from "./lever";
import { createRemotiveCollector } from "./remotive";
import type { Collector } from "./types";

export function buildCollectors(
  config: SourcesConfig,
  deps: GithubCollectorDeps,
): Collector<unknown>[] {
  return [
    ...config.greenhouse.map((board) => createGreenhouseCollector(board, deps)),
    ...config.lever.map((site) => createLeverCollector(site, deps)),
    ...config.github.map((repo) => createGithubIssuesCollector(repo, deps)),
    ...config.remotive.map((query) => createRemotiveCollector(query, deps)),
  ];
}
