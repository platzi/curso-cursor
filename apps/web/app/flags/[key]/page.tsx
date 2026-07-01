import Link from "next/link";
import { LogoutButton } from "@/app/dashboard/logout-button";

type FlagDetailPageProps = {
  params: Promise<{ key: string }>;
};

export default async function FlagDetailPage({ params }: FlagDetailPageProps) {
  const { key } = await params;

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
          <LogoutButton />
        </div>

        <h1 className="mt-4 text-2xl font-semibold">Flag: {key}</h1>
        <p className="mt-2 text-sm text-slate-400">
          Detalle de flag (spec 07).
        </p>
      </div>
    </main>
  );
}
