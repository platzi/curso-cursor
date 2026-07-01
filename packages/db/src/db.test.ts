import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "./schema.js";

const client = createClient({ url: "file::memory:?cache=shared" });
const db = drizzle(client, { schema });

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
});

afterAll(() => {
  client.close();
});

describe("db: flags", () => {
  it("escribe y lee una flag", async () => {
    const id = crypto.randomUUID();
    await db.insert(schema.flags).values({
      id,
      key: "test_flag",
      name: "Test Flag",
      type: "release",
      status: "draft",
      defaultValue: 0,
      failMode: "fail_closed",
    });
    const found = await db.query.flags.findFirst({ where: eq(schema.flags.key, "test_flag") });
    expect(found?.key).toBe("test_flag");
    expect(found?.defaultValue).toBe(0);
  });
});
