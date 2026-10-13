/** /evaluations/[id] 详情加载骨架（浅色，窄屏可滚动占位） */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-14 md:px-6">
      <div className="h-7 w-56 rounded bg-slate-100" />
      <div className="mt-2 h-4 w-96 rounded bg-slate-100" />
      <div className="mt-6 flex gap-4 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-80 w-72 shrink-0 rounded-lg border border-slate-100 bg-white">
            <div className="h-10 border-b border-slate-100" />
            <div className="space-y-2 p-3">
              <div className="h-3 w-full rounded bg-slate-100" />
              <div className="h-3 w-11/12 rounded bg-slate-100" />
              <div className="h-3 w-4/5 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
