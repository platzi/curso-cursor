import Link from "next/link";
import { CreateFlagForm } from "@/components/flags/create-flag-form";
import { LogoutButton } from "@/app/dashboard/logout-button";

export default function NewFlagPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <Link
            href="/flags"
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            ← Volver al listado
          </Link>
          <LogoutButton />
        </div>

        <h1 className="mt-4 text-2xl font-semibold">Nueva feature flag</h1>
        <p className="mt-1 text-sm text-slate-400">
          Crea una flag con status inicial draft
        </p>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <CreateFlagForm />
        </section>
      </div>
    </main>
  );
}
