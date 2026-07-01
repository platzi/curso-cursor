import type { CreateFlagInput, Flag, FlagStatus, UpdateFlagPatch } from "@/types/flags";
import type { CreateRuleInput, TargetingRule } from "@/types/rules";

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

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (
      data !== null &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
  } catch {
    // ignore parse errors
  }
  return `Request failed (${response.status})`;
}

export async function getFlag(key: string): Promise<Flag> {
  const response = await apiFetch(`/flags/${encodeURIComponent(key)}`);

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return (await response.json()) as Flag;
}

export async function createFlag(input: CreateFlagInput): Promise<Flag> {
  const response = await apiFetch("/flags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return (await response.json()) as Flag;
}

export async function updateFlag(key: string, patch: UpdateFlagPatch): Promise<Flag> {
  const response = await apiFetch(`/flags/${encodeURIComponent(key)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return (await response.json()) as Flag;
}

export async function getRules(flagId: string): Promise<TargetingRule[]> {
  const response = await apiFetch(
    `/flags/${encodeURIComponent(flagId)}/rules`,
  );

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new ApiError("Invalid rules response", 500);
  }

  return data as TargetingRule[];
}

export async function createRule(
  flagId: string,
  input: CreateRuleInput,
): Promise<TargetingRule> {
  const response = await apiFetch(
    `/flags/${encodeURIComponent(flagId)}/rules`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return (await response.json()) as TargetingRule;
}

export async function deleteRule(flagId: string, ruleId: string): Promise<void> {
  const response = await apiFetch(
    `/flags/${encodeURIComponent(flagId)}/rules/${encodeURIComponent(ruleId)}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }
}
