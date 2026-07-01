import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StatusControl } from "@/components/flags/status-control";
import { StatusBadge } from "@/components/flags/status-badge";
import { TargetingRulesSection } from "@/components/flags/targeting-rules-section";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { ApiError, getFlag } from "@/lib/api";

type FlagDetailPageProps = {
  params: Promise<{ key: string }>;
};

export default async function FlagDetailPage({ params }: FlagDetailPageProps) {
  const { key } = await params;

  let flag;
  try {
    flag = await getFlag(key);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        redirect("/login");
      }
      if (error.status === 404) {
        notFound();
      }
    }
    throw error;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link
            href="/flags"
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            ← Volver al listado
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href={`/flags/${flag.key}/edit`}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium hover:bg-slate-700"
            >
              Editar
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold">{flag.key}</h1>
          <StatusBadge status={flag.status} />
        </div>
        <p className="mt-2 text-lg text-slate-200">{flag.name}</p>
        {flag.description ? (
          <p className="mt-2 text-sm text-slate-400">{flag.description}</p>
        ) : null}

        <dl className="mt-8 grid gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Tipo</dt>
            <dd>{flag.type}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">default_value</dt>
            <dd>{flag.default_value ? "true" : "false"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">fail_mode</dt>
            <dd>{flag.fail_mode}</dd>
          </div>
        </dl>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-lg font-medium">Ciclo de vida</h2>
          <div className="mt-4">
            <StatusControl flagKey={flag.key} status={flag.status} />
          </div>
        </section>

        <section className="mt-8">
          <TargetingRulesSection flagId={flag.id} />
        </section>
      </div>
    </main>
  );
}
