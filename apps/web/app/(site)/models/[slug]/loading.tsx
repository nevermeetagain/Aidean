// 模型详情页专用加载骨架（M-PERF A2）。
// 与最终布局同构（面包屑 + 左 TOC 占位 + 右四节占位），消除骨架→内容的布局跳变（CLS）；
// 覆盖 (web)/loading.tsx 的通用兜底。纯静态 UI，不引 DB/业务模块。
export default function ModelDetailLoading() {
  return (
    <main
      className="px-4 py-14 md:px-6"
      aria-busy="true"
      aria-label="模型详情加载中"
    >
      <div className="animate-pulse space-y-8" aria-hidden="true">
        {/* 面包屑占位 */}
        <div className="h-4 w-64 max-w-full rounded bg-muted" />
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          {/* 左侧 TOC 占位（对齐 lg:w-44 sticky） */}
          <div className="hidden lg:block lg:w-44 lg:flex-shrink-0">
            <div className="space-y-3">
              <div className="h-4 w-20 rounded bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-4 w-16 rounded bg-muted" />
              <div className="h-4 w-20 rounded bg-muted" />
            </div>
          </div>
          {/* 右侧四节占位（对齐 space-y-12 节奏） */}
          <div className="min-w-0 flex-1 space-y-12">
            {[0, 1, 2].map((section) => (
              <div key={section} className="space-y-4">
                <div className="h-6 w-32 rounded bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-4 w-11/12 rounded bg-muted" />
                  <div className="h-4 w-3/5 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
