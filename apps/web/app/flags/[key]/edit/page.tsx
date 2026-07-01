import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EditFlagForm } from "@/components/flags/edit-flag-form";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { ApiError, getFlag } from "@/lib/api";

type EditFlagPageProps = {
  params: Promise<{ key: string }>;
};

export default async function EditFlagPage({ params }: EditFlagPageProps) {
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
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <Link
            href={`/flags/${flag.key}`}
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            ← Volver al detalle
          </Link>
          <LogoutButton />
        </div>

        <h1 className="mt-4 text-2xl font-semibold">Editar flag</h1>
        <p className="mt-1 font-mono text-sm text-slate-400">{flag.key}</p>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <EditFlagForm flag={flag} />
        </section>
      </div>
    </main>
  );
}
