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
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-slate-400">
            Sesión activa como <span className="text-sky-400">{session.username}</span>
          </p>
        </div>
        <LogoutButton />
      </div>

      <section className="mx-auto mt-10 max-w-3xl rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-medium">Feature Flags</h2>
        <p className="mt-2 text-sm text-slate-400">
          Panel de gestión (specs posteriores). Has iniciado sesión correctamente.
        </p>
      </section>
    </main>
  );
}
