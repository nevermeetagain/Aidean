// /ladder 专用加载骨架（WP-FE01 §全局体验：loading/skeleton）。
// 与最终布局同构（面包屑 + H1/副标题 + 右侧说明卡组 + 三行工具栏 + 矩阵容器），
// 消除骨架→内容的布局跳变（CLS）；容器内边距对齐页头零间距约定（pb-14 pt-0）。
// 纯静态 UI，不引 DB/业务模块；仅消费既有令牌类，不新增色值。
export default function LadderLoading() {
  return (
    <main className="px-4 pb-14 pt-0 md:px-6" aria-busy="true" aria-label="天梯图加载中">
      <div className="animate-pulse motion-reduce:animate-none" aria-hidden="true">
        {/* 面包屑 */}
        <div className="mb-8 h-4 w-48 rounded bg-muted" />

        {/* 页头 + 右侧说明卡组 */}
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <div className="h-8 w-56 rounded-md bg-muted" />
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-4 w-full max-w-2xl rounded bg-muted" />
          </div>
          <div className="flex w-full flex-col gap-3 lg:w-[340px]">
            <div className="h-20 rounded-lg border border-[var(--border)] bg-[var(--muted)]" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-24 rounded-lg border border-[var(--border)] bg-[var(--card)]" />
              <div className="h-24 rounded-lg border border-[var(--border)] bg-[var(--card)]" />
            </div>
          </div>
        </div>

        {/* 工具栏三行制 */}
        <div className="mt-10 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="h-8 w-64 rounded-lg bg-muted" />
            <div className="h-8 w-32 rounded-lg bg-muted" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="h-8 w-80 rounded-lg bg-muted" />
            <div className="h-8 w-40 rounded-lg bg-muted" />
          </div>
          <div className="h-4 w-52 rounded bg-muted" />
        </div>

        {/* 矩阵容器 */}
        <div className="mt-4 h-[420px] rounded-2xl border border-[var(--border)] bg-[var(--card)]" />
      </div>
    </main>
  );
}
