/** /evaluations 列表加载骨架（浅色；容器与页面同为全宽，避免骨架→页面宽度跳变） */
export default function Loading() {
  return (
    <main className="w-full px-4 py-14 md:px-6">
      <div className="w-full">
        <div className="h-8 w-40 rounded bg-slate-100" />
        <div className="mt-8 space-y-2 rounded-lg border border-slate-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-5 w-14 rounded-full bg-slate-100" />
              <div className="h-4 flex-1 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
