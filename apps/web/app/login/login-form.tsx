"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function login(credentials?: { username: string; password: string }) {
    const loginUsername = credentials?.username ?? username;
    const loginPassword = credentials?.password ?? password;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });

      if (!res.ok) {
        setError("Credenciales inválidas");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const from = params.get("from") ?? "/dashboard";
      router.push(from.startsWith("/") ? from : "/dashboard");
      router.refresh();
    } catch {
      setError("No se pudo conectar con la API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0d1f17] via-[#0a0f0d] to-black px-4">
      <div className="w-full max-w-md" data-testid="login-form">
        <div className="mb-8 flex items-center gap-2">
          <span className="inline-block h-7 w-7 rotate-45 rounded-md bg-[#98ca3f]" aria-hidden />
          <span className="text-2xl font-bold text-white">Feature Flags</span>
        </div>

        <h1 className="mb-3 text-3xl font-bold text-white">Ingresa a tu cuenta</h1>
        <p className="mb-8 text-sm text-slate-400">
          Usa el usuario demo para continuar.
        </p>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            const formUsername = String(data.get("username") ?? "");
            const formPassword = String(data.get("password") ?? "");
            setUsername(formUsername);
            setPassword(formPassword);
            void login({ username: formUsername, password: formPassword });
          }}
        >
          <div>
            <label htmlFor="username" className="sr-only">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="Usuario"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-5 py-4 text-white placeholder-slate-500 outline-none transition focus:border-[#98ca3f] focus:ring-1 focus:ring-[#98ca3f]"
            />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Contraseña"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-5 py-4 text-white placeholder-slate-500 outline-none transition focus:border-[#98ca3f] focus:ring-1 focus:ring-[#98ca3f]"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#05a460] py-4 font-semibold text-black transition hover:bg-[#048a51] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Entrando…" : "Continuar"}
          </button>
        </form>
      </div>
    </main>
  );
}
