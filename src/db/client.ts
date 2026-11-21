import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "./schema";

/** Tipo comum aos dois drivers: repositórios não sabem se estão no PGlite ou no Postgres. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface DbHandle {
  readonly db: Db;
  readonly kind: "pglite" | "postgres";
  migrate(): Promise<void>;
  close(): Promise<void>;
}

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

/** PGlite em disco (`dataDir`) ou em memória (sem argumento), usado em dev e nos testes. */
export function createPgliteDb(dataDir?: string): DbHandle {
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzlePglite(client, { schema });
  return {
    db,
    kind: "pglite",
    migrate: () => migratePglite(db, { migrationsFolder: MIGRATIONS_FOLDER }),
    close: () => client.close(),
  };
}

export function createPostgresDb(url: string, serverless = false): DbHandle {
  // `prepare: false` é exigido pelo pooler de transações do Supabase. Em função
  // serverless, cada instância abre uma conexão só, para não esgotar o pooler.
  const client = postgres(url, { prepare: false, max: serverless ? 1 : 5 });
  const db = drizzlePostgres(client, { schema });
  return {
    db,
    kind: "postgres",
    migrate: () => migratePostgres(db, { migrationsFolder: MIGRATIONS_FOLDER }),
    close: () => client.end(),
  };
}

export interface DbEnv {
  readonly DATABASE_URL?: string | undefined;
  readonly PGLITE_DATA_DIR: string;
  readonly VERCEL?: string | undefined;
}

export function createDbFromEnv(env: DbEnv): DbHandle {
  return env.DATABASE_URL
    ? createPostgresDb(env.DATABASE_URL, Boolean(env.VERCEL))
    : createPgliteDb(env.PGLITE_DATA_DIR);
}
