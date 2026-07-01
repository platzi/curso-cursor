export default function FlagsLoading() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-800" />
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-12 text-center text-slate-400">
          Cargando flags…
        </div>
      </div>
    </main>
  );
}
