import { serve } from "@hono/node-server";
import { Hono } from "hono";

export const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

const port = Number(process.env.PORT ?? 3001);

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
