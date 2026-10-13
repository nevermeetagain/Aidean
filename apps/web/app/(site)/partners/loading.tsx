// 页面级加载骨架：导航期间立即给出结构化反馈，避免旧页面卡住零反馈。
// 纯静态 UI，不引 DB/业务模块；结构对齐 (site)/loading.tsx 的正文容器宽度。
export default function Loading() {
  return (
    <main className="px-4 py-14 md:px-6" aria-busy="true" aria-label="页面加载中">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="h-8 w-44 rounded-md bg-muted" />
        <div className="h-4 w-80 max-w-full rounded bg-muted" />
        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
          <div className="h-4 w-2/3 rounded bg-muted" />
        </div>
      </div>
    </main>
  );
}
