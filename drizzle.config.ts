import { defineConfig } from "drizzle-kit";

// Só `drizzle-kit generate` é usado: as migrações são aplicadas pelo próprio app
// (scripts/migrate.ts), que funciona igual no PGlite e no Postgres.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
