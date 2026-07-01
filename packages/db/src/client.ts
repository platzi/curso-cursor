import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

const defaultUrl = process.env.DATABASE_URL ?? "file:./local.db";

export function createDb(url: string = defaultUrl): {
  client: Client;
  db: ReturnType<typeof drizzle<typeof schema>>;
} {
  const client = createClient({ url });
  const db = drizzle(client, { schema });
  return { client, db };
}

const { client: libsql, db } = createDb();
export { libsql, db };
export type DB = typeof db;
export { schema };
