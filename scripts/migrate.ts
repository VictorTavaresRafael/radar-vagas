import { createDbFromEnv } from "@/db/client";
import { getEnv } from "@/lib/env";
import { loadDotEnv } from "./load-env";

loadDotEnv();
const handle = createDbFromEnv(getEnv());
try {
  await handle.migrate();
  console.log(`Migrações aplicadas (${handle.kind}).`);
} finally {
  await handle.close();
}
