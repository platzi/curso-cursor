import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LogoutButton } from "./logout-button";
import { API_URL, SESSION_COOKIE_NAME } from "@/lib/api";

type MeResponse = {
  authenticated: boolean;
  username: string;
};

async function getSession(): Promise<MeResponse | null> {
  const cookieHeader = (await headers()).get("cookie");
  if (!cookieHeader?.includes(SESSION_COOKIE_NAME)) {
    return null;
  }

  const res = await fetch(`${API_URL}/api/v1/auth/me`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  return res.json() as Promise<MeResponse>;
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0d1f17] via-[#0a0f0d] to-black px-6 py-10 text-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-block h-6 w-6 rotate-45 rounded-md bg-[#05a460]" aria-hidden />
            <span className="text-lg font-bold">Feature Flags</span>
          </div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-slate-400">
            Sesión activa como <span className="font-medium text-[#05a460]">{session.username}</span>
          </p>
        </div>
        <LogoutButton />
      </div>

      <section className="mx-auto mt-10 max-w-3xl rounded-xl border border-white/10 bg-black/40 p-6">
        <h2 className="text-lg font-medium">Feature Flags</h2>
        <p className="mt-2 text-sm text-slate-400">
          Panel de gestión (specs posteriores). Has iniciado sesión correctamente.
        </p>
      </section>
    </main>
  );
}
