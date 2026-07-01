"use client";

type FlagsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function FlagsError({ reset }: FlagsErrorProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold">Feature Flags</h1>
        <div
          className="mt-8 rounded-xl border border-red-900/50 bg-red-950/30 px-6 py-8 text-center"
          role="alert"
        >
          <p className="text-red-300">
            No se pudieron cargar las feature flags. Inténtalo de nuevo.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    </main>
  );
}
