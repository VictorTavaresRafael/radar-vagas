import { describe, expect, it } from "vitest";
import { handlePostgresNotice } from "@/db/client";

describe("avisos do Postgres", () => {
  it("ignora NOTICE informativo das migrações", () => {
    const warnings: string[] = [];
    handlePostgresNotice(
      { severity: "NOTICE", message: 'schema "drizzle" already exists, skipping' },
      (message) => warnings.push(message),
    );
    expect(warnings).toEqual([]);
  });

  it("mantém avisos mais graves no log", () => {
    const warnings: string[] = [];
    handlePostgresNotice({ severity: "WARNING", message: "algo estranho" }, (message) =>
      warnings.push(message),
    );
    expect(warnings).toEqual(["Postgres WARNING: algo estranho"]);
  });
});
