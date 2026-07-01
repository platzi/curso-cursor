import Link from "next/link";
import { redirect } from "next/navigation";
import { HistoryList } from "@/components/history/history-list";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { ApiError, getAuditLog, getFlags } from "@/lib/api";

type HistoryPageProps = {
  searchParams: Promise<{ flag?: string }>;
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const { flag: flagKey } = await searchParams;

  let entries;
  let flagKeys: string[];

  try {
    const [auditEntries, flags] = await Promise.all([
      getAuditLog(flagKey),
      getFlags(),
    ]);
    entries = auditEntries;
    flagKeys = flags.map((flag) => flag.key);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/login");
    }
    throw error;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Historial de auditoría</h1>
            <p className="mt-1 text-sm text-slate-400">
              Registro append-only de cambios en flags y reglas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/flags"
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              Flags
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              Dashboard
            </Link>
            <LogoutButton />
          </div>
        </div>

        <section className="mt-8">
          <HistoryList
            initialEntries={entries}
            initialFlagKey={flagKey}
            flagKeys={flagKeys}
          />
        </section>
      </div>
    </main>
  );
}
