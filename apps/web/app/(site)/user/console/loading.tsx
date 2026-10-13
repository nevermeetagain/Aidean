// /user/console 专用加载骨架（WP-FE01 §全局体验；redesign-console-workspace 同步）。
// 与最终布局同构：产品化页头 + 三张核心信息卡 + 五标签工作区骨架。
// 内边距对齐页头零间距约定（pb-14 pt-0）。纯静态 UI；仅消费既有令牌类。
export default function ConsoleLoading() {
  return (
    <main className="px-4 pb-14 pt-0 md:px-6" aria-busy="true" aria-label="控制台加载中">
      <div className="animate-pulse motion-reduce:animate-none" aria-hidden="true">
        {/* 产品化页头（与 PagePlaceholder 同构） */}
        <div className="relative -mx-4 overflow-hidden rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-[var(--shadow-sm)] md:-mx-6 md:px-10 md:py-10">
          <div className="h-6 w-32 rounded-full bg-muted" />
          <div className="mt-5 h-9 w-48 rounded-md bg-muted" />
        </div>

        {/* 三张核心信息卡 */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((card) => (
            <div key={card} className="h-28 rounded-lg border border-[var(--border)] bg-[var(--card)]" />
          ))}
        </div>

        {/* 五标签工作区 */}
        <div className="mt-6 flex gap-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-1">
          {[0, 1, 2, 3, 4].map((tab) => (
            <div key={tab} className="h-9 w-24 shrink-0 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="h-5 w-24 rounded bg-muted" />
          <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
          <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
        </div>
      </div>
    </main>
  );
}
