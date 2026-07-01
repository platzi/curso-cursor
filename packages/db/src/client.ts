import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

const url = process.env.DATABASE_URL ?? "file:./local.db";

export const libsql = createClient({ url });
export const db = drizzle(libsql, { schema });
export type DB = typeof db;
export { schema };
