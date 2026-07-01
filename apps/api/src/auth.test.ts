import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAuthConfig } from "./config/auth.js";
import { clearRevokedSessions } from "./lib/session.js";
import { createTestApp, extractSessionCookie, jsonRequest } from "./test/helpers.js";

describe("auth (spec 05)", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...envBackup,
      NODE_ENV: "test",
      DEMO_USERNAME: "admin",
      DEMO_PASSWORD: "demo123",
      SESSION_SECRET: "test-session-secret",
      SESSION_COOKIE_NAME: "ff_session",
    };
  });

  afterEach(() => {
    process.env = envBackup;
    clearRevokedSessions();
  });

  it("CA-05.1: login ok emite Set-Cookie HttpOnly", async () => {
    const app = createTestApp();
    const config = getAuthConfig();

    const res = await jsonRequest(app, "/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: config.demoUsername,
        password: config.demoPassword,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ authenticated: true, username: "admin" });

    const setCookies = res.headers.getSetCookie?.() ?? [];
    const raw = res.headers.get("set-cookie") ?? "";
    const cookieHeader = setCookies.join("; ") || raw;
    expect(cookieHeader).toContain(`${config.sessionCookieName}=`);
    expect(cookieHeader.toLowerCase()).toContain("httponly");
  });

  it("CA-05.2: login ko responde 401 sin Set-Cookie", async () => {
    const app = createTestApp();
    const config = getAuthConfig();

    const res = await jsonRequest(app, "/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: config.demoUsername,
        password: "wrong-password",
      }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_credentials" });

    const setCookies = res.headers.getSetCookie?.() ?? [];
    expect(setCookies.length).toBe(0);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("CA-05.3: ruta admin sin sesión responde 401", async () => {
    const app = createTestApp();
    const res = await jsonRequest(app, "/api/v1/flags");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("CA-05.4: ruta admin con sesión responde 200", async () => {
    const app = createTestApp();
    const config = getAuthConfig();

    const loginRes = await jsonRequest(app, "/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: config.demoUsername,
        password: config.demoPassword,
      }),
    });
    const cookie = extractSessionCookie(loginRes, config.sessionCookieName);
    expect(cookie).toBeTruthy();

    const res = await jsonRequest(app, "/api/v1/flags", {
      headers: { Cookie: cookie ?? "" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("CA-05.5: logout invalida la sesión", async () => {
    const app = createTestApp();
    const config = getAuthConfig();

    const loginRes = await jsonRequest(app, "/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: config.demoUsername,
        password: config.demoPassword,
      }),
    });
    const cookie = extractSessionCookie(loginRes, config.sessionCookieName);
    expect(cookie).toBeTruthy();

    const logoutRes = await jsonRequest(app, "/api/v1/auth/logout", {
      method: "POST",
      headers: { Cookie: cookie ?? "" },
    });
    expect(logoutRes.status).toBe(200);

    const afterLogout = await jsonRequest(app, "/api/v1/flags", {
      headers: { Cookie: cookie ?? "" },
    });
    expect(afterLogout.status).toBe(401);
  });

  it("CA-05.6: evaluate es público sin cookie", async () => {
    const app = createTestApp();

    const single = await jsonRequest(
      app,
      "/api/v1/flags/checkout_v2/evaluate?environment=production&user_id=u1",
    );
    expect(single.status).not.toBe(401);
    expect(single.status).toBe(200);

    const batch = await jsonRequest(app, "/api/v1/flags/evaluate-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: ["checkout_v2"], context: { user_id: "u1" } }),
    });
    expect(batch.status).not.toBe(401);
    expect(batch.status).toBe(200);
  });

  it("CA-05.7: cookie manipulada es rechazada", async () => {
    const app = createTestApp();
    const config = getAuthConfig();

    const tampered = `${config.sessionCookieName}=not-a-valid-signed-cookie`;
    const res = await jsonRequest(app, "/api/v1/flags", {
      headers: { Cookie: tampered },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });
});
