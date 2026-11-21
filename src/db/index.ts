import "server-only";
import { getEnv } from "@/lib/env";
import { createDbFromEnv, type Db, type DbHandle } from "./client";

interface DbCache {
  handle: DbHandle;
  ready: Promise<void>;
}

// O cache fica no globalThis para sobreviver ao hot reload do `next dev`,
// que reavalia os módulos e abriria um PGlite novo sobre o mesmo diretório.
const globalCache = globalThis as typeof globalThis & { __radarDb?: DbCache };

/**
 * Banco do painel. No PGlite as migrações rodam na primeira consulta para o
 * `npm run dev` funcionar sem passo extra; no Postgres elas ficam a cargo do
 * `npm run db:migrate` / `npm run collect`.
 */
export async function getDb(): Promise<Db> {
  if (!globalCache.__radarDb) {
    const handle = createDbFromEnv(getEnv());
    const ready = handle.kind === "pglite" ? handle.migrate() : Promise.resolve();
    globalCache.__radarDb = { handle, ready };
  }
  await globalCache.__radarDb.ready;
  return globalCache.__radarDb.handle.db;
}
