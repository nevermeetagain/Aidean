// /models 专用加载骨架（WP-FE01 §全局体验：loading/skeleton）。
// 与 /models 最终布局同构：无页头（v1.7 起页面壳已移除），首屏直达工具栏 + 矩阵容器；
// 内边距对齐该页实际值（pb-6 pt-0），避免骨架切换时的高度跳变。
// 纯静态 UI；仅消费既有令牌类。
export default function ModelsLoading() {
  return (
    <main className="px-4 pb-6 pt-0 md:px-6" aria-busy="true" aria-label="模型天梯图加载中">
      <div className="animate-pulse motion-reduce:animate-none" aria-hidden="true">
        {/* 工具栏三行制 */}
        <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3.5">
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
