import { serve } from "@hono/node-server";
import { db } from "@ff/db";
import { createApp } from "./app.js";

export const app = createApp(db);

const port = Number(process.env.PORT ?? 3001);

if (process.env.NODE_ENV !== "test") {
  const server = serve({ fetch: app.fetch, port }, (info) => {
    console.log(`API escuchando en http://localhost:${info.port}`);
  });

  process.on("SIGINT", () => {
    server.close();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    server.close((err) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      process.exit(0);
    });
  });
}
