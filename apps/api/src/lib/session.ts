import type { Context } from "hono";
import {
  deleteCookie,
  getSignedCookie,
  setSignedCookie,
} from "hono/cookie";
import { getAuthConfig } from "../config/auth.js";

export type SessionPayload = {
  username: string;
  iat: number;
};

const revokedSessions = new Set<string>();

function sessionKey(payload: SessionPayload): string {
  return `${payload.username}:${payload.iat}`;
}

export function revokeSession(payload: SessionPayload): void {
  revokedSessions.add(sessionKey(payload));
}

/** Solo para tests — resetea revocaciones entre casos. */
export function clearRevokedSessions(): void {
  revokedSessions.clear();
}

export function serializeSession(payload: SessionPayload): string {
  return JSON.stringify(payload);
}

export function parseSession(value: string): SessionPayload | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "username" in parsed &&
      "iat" in parsed &&
      typeof parsed.username === "string" &&
      typeof parsed.iat === "number"
    ) {
      return { username: parsed.username, iat: parsed.iat };
    }
    return null;
  } catch {
    return null;
  }
}

export async function readSession(
  c: Context,
): Promise<SessionPayload | null> {
  const config = getAuthConfig();
  const raw = await getSignedCookie(
    c,
    config.sessionSecret,
    config.sessionCookieName,
  );

  if (raw === false || raw === undefined) {
    return null;
  }

  const session = parseSession(raw);
  if (session && revokedSessions.has(sessionKey(session))) {
    return null;
  }

  return session;
}

export async function writeSession(
  c: Context,
  username: string,
): Promise<void> {
  const config = getAuthConfig();
  const payload = serializeSession({ username, iat: Date.now() });

  await setSignedCookie(
    c,
    config.sessionCookieName,
    payload,
    config.sessionSecret,
    {
      httpOnly: true,
      secure: config.secure,
      sameSite: "Lax",
      path: "/",
      maxAge: config.cookieMaxAge,
    },
  );
}

export function clearSession(c: Context): void {
  const config = getAuthConfig();
  deleteCookie(c, config.sessionCookieName, { path: "/" });
}
