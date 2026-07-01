import { createMigratedTestDb } from "@ff/db";
import { createApp } from "../app.js";

export async function createTestApp() {
  const { db, close } = await createMigratedTestDb();
  return {
    app: createApp(db),
    db,
    close,
  };
}

export async function jsonRequest(
  app: ReturnType<typeof createApp>,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return app.request(`http://localhost${path}`, init);
}
