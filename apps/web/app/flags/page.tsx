import Link from "next/link";
import { redirect } from "next/navigation";
import { FlagsList } from "@/components/flags/flags-list";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { ApiError, getFlags } from "@/lib/api";
import { isFlagStatus } from "@/types/flags";
import type { FlagStatus } from "@/types/flags";

type FlagsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

function parseStatusFilter(value: string | undefined): FlagStatus | undefined {
  if (!value) {
    return undefined;
  }
  return isFlagStatus(value) ? value : undefined;
}

export default async function FlagsPage({ searchParams }: FlagsPageProps) {
  const { status: rawStatus } = await searchParams;
  const statusFilter = parseStatusFilter(rawStatus);

  let flags;
  try {
    flags = await getFlags(statusFilter);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/login");
    }
    throw error;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Feature Flags</h1>
            <p className="mt-1 text-sm text-slate-400">
              Listado de flags del sistema
            </p>
          </div>
          <div className="flex items-center gap-3">
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
          <FlagsList initialFlags={flags} initialStatus={statusFilter} />
        </section>
      </div>
    </main>
  );
}
