/** /evaluations/new 加载骨架（浅色，无 opacity-0 首屏） */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-14 md:px-6">
      <div className="h-7 w-48 rounded bg-slate-100" />
      <div className="mt-2 h-4 w-80 rounded bg-slate-100" />
      <div className="mt-8 h-5 w-32 rounded bg-slate-100" />
      <div className="mt-3 flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-full bg-slate-100" />
        ))}
      </div>
      <div className="mt-8 h-5 w-20 rounded bg-slate-100" />
      <div className="mt-3 h-32 w-full rounded-lg bg-slate-100" />
      <div className="mt-8 h-12 w-full rounded-lg bg-slate-100" />
    </main>
  );
}
