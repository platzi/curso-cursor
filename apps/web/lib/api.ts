import type { Flag, FlagStatus } from "@/types/flags";

export const API_URL = process.env.API_URL ?? "http://127.0.0.1:3001";
export const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? "ff_session";

const API_BASE_PATH = "/api/v1";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined") {
    return fetch(`${API_BASE_PATH}${normalizedPath}`, {
      ...init,
      credentials: "include",
    });
  }

  const { headers } = await import("next/headers");
  const cookieHeader = (await headers()).get("cookie") ?? "";

  return fetch(`${API_URL}${API_BASE_PATH}${normalizedPath}`, {
    ...init,
    headers: {
      ...init?.headers,
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    cache: "no-store",
  });
}

export async function getFlags(status?: FlagStatus): Promise<Flag[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await apiFetch(`/flags${query}`);

  if (!response.ok) {
    throw new ApiError(
      `Failed to fetch flags (${response.status})`,
      response.status,
    );
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new ApiError("Invalid flags response", 500);
  }

  return data as Flag[];
}
