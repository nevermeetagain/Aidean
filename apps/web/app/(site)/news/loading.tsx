// 页面级加载骨架：导航期间立即给出结构化反馈，避免旧页面卡住零反馈。
// 纯静态 UI，不引 DB/业务模块。
// UX-29（CLS）：骨架几何对齐 PagePlaceholder（全宽容器 + 同内边距的页头卡），并以 min-h-screen
// 为正文预留高度——流式替换为真实页面时页脚始终在首屏之外，不再出现「短骨架 → 长页面」的整体下推。
// UX-14：去掉原 mx-auto max-w-6xl 窄容器，与页面同为全宽（避免骨架→页面宽度跳变）。
export default function Loading() {
  return (
    <main className="min-h-screen px-4 pb-8 pt-0 md:px-6 md:pb-10" aria-busy="true" aria-label="页面加载中">
      <div className="animate-pulse" aria-hidden="true">
        <div className="-mx-4 rounded-2xl border border-slate-200 bg-white px-6 py-10 md:-mx-6 md:px-10 md:py-12">
          <div className="h-[26px] w-28 rounded-full bg-muted" />
          <div className="mt-5 h-8 w-40 rounded-md bg-muted md:h-10" />
          <div className="mt-3 h-4 w-full max-w-2xl rounded bg-muted" />
          <div className="mt-2 h-4 w-2/3 max-w-xl rounded bg-muted" />
        </div>
        <div className="mt-10 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
          <div className="h-4 w-2/3 rounded bg-muted" />
        </div>
      </div>
    </main>
  );
}
