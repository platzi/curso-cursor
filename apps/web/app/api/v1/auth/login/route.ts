import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";

function forwardSetCookie(upstream: Response, response: NextResponse): void {
  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    for (const cookie of setCookies) {
      response.headers.append("set-cookie", cookie);
    }
    return;
  }
  const raw = upstream.headers.get("set-cookie");
  if (raw) {
    response.headers.set("set-cookie", raw);
  }
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  const upstream = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const data: unknown = await upstream.json().catch(() => null);
  const response = NextResponse.json(data, { status: upstream.status });
  forwardSetCookie(upstream, response);
  return response;
}
