import { createApp } from "../app.js";

export function createTestApp() {
  return createApp();
}

export async function jsonRequest(
  app: ReturnType<typeof createApp>,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return app.request(`http://localhost${path}`, init);
}

export function extractSessionCookie(
  response: Response,
  cookieName = "ff_session",
): string | null {
  const setCookies = response.headers.getSetCookie?.() ?? [];
  if (setCookies.length === 0) {
    const raw = response.headers.get("set-cookie");
    if (!raw) {
      return null;
    }
    setCookies.push(raw);
  }

  for (const header of setCookies) {
    const match = header.match(new RegExp(`^${cookieName}=([^;]+)`));
    if (match?.[1]) {
      return `${cookieName}=${match[1]}`;
    }
  }
  return null;
}
