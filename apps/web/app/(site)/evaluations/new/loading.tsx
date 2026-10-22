/** /evaluations/new 加载骨架（浅色，无 opacity-0 首屏；容器与页面同为全宽 + 表单区 max-w-3xl） */
export default function Loading() {
  return (
    <main className="w-full px-4 py-14 md:px-6">
      <div className="max-w-3xl">
        <div className="h-7 w-48 rounded bg-slate-100" />
        <div className="mt-2 h-4 w-80 max-w-full rounded bg-slate-100" />
        <div className="mt-8 h-5 w-32 rounded bg-slate-100" />
        <div className="mt-3 h-10 w-full rounded-lg bg-slate-100" />
        <div className="mt-8 h-5 w-20 rounded bg-slate-100" />
        <div className="mt-3 h-32 w-full rounded-lg bg-slate-100" />
        <div className="mt-8 h-12 w-full rounded-lg bg-slate-100" />
      </div>
    </main>
  );
}
