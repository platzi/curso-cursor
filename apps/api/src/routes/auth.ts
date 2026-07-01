import { Hono } from "hono";
import { getAuthConfig } from "../config/auth.js";
import { clearSession, readSession, revokeSession, writeSession } from "../lib/session.js";

type LoginBody = {
  username?: unknown;
  password?: unknown;
};

function parseLoginBody(body: unknown): { username: string; password: string } | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const { username, password } = body as LoginBody;
  if (typeof username !== "string" || typeof password !== "string") {
    return null;
  }
  if (username.length === 0 || password.length === 0) {
    return null;
  }
  return { username, password };
}

export function createAuthRouter(): Hono {
  const auth = new Hono();

  auth.post("/login", async (c) => {
    const body: unknown = await c.req.json().catch(() => null);
    const credentials = parseLoginBody(body);
    if (!credentials) {
      return c.json({ error: "invalid_credentials" }, 401);
    }

    const config = getAuthConfig();
    if (
      credentials.username !== config.demoUsername ||
      credentials.password !== config.demoPassword
    ) {
      return c.json({ error: "invalid_credentials" }, 401);
    }

    await writeSession(c, credentials.username);
    return c.json({ authenticated: true, username: credentials.username });
  });

  auth.post("/logout", async (c) => {
    const session = await readSession(c);
    if (session) {
      revokeSession(session);
    }
    clearSession(c);
    return c.json({ authenticated: false });
  });

  auth.get("/me", async (c) => {
    const session = await readSession(c);
    if (!session) {
      return c.json({ error: "unauthorized" }, 401);
    }
    return c.json({ authenticated: true, username: session.username });
  });

  return auth;
}
