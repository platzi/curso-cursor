import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuthRouter } from "./routes/auth.js";
import { createAdminStubRouter, evaluateBatchStub, evaluateFlagStub } from "./routes/stubs.js";
import { requireAuth } from "./middleware/require-auth.js";

export function createApp(): Hono {
  const app = new Hono();

  app.use(
    "/api/*",
    cors({
      origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
      credentials: true,
    }),
  );

  app.get("/health", (c) => c.json({ status: "ok" }));

  const v1 = new Hono();

  v1.route("/auth", createAuthRouter());

  v1.get("/flags/:key/evaluate", evaluateFlagStub);
  v1.post("/flags/evaluate-batch", evaluateBatchStub);

  const protectedV1 = new Hono();
  protectedV1.use("*", requireAuth);
  protectedV1.route("/", createAdminStubRouter());
  v1.route("/", protectedV1);

  app.route("/api/v1", v1);

  return app;
}
