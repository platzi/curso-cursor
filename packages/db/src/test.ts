import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createDb, type DB } from "./client.js";

const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../drizzle",
);

export async function createMigratedTestDb(
  url = "file::memory:?cache=shared",
): Promise<{ db: DB; close: () => void }> {
  const { client, db } = createDb(url);
  await migrate(db, { migrationsFolder });
  return {
    db,
    close: () => {
      client.close();
    },
  };
}
