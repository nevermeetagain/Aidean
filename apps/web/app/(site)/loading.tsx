// (web) 路由组兜底加载骨架（M-PERF A1）。
// 作用：① 导航期间立即给出结构化反馈（此前无任何 loading.tsx，动态路由导航阻塞等待完整 RSC，
//         旧页面卡住零反馈）；② Next 14 对动态路由的 Link 预取只到最近的 loading.tsx 边界，
//         本文件是天梯表格 Link 化（A4）预取收益的前提。
// 口径：纯静态 UI，不引 DB/业务模块；结构对齐 PagePlaceholder 的正文容器宽度。
export default function WebLoading() {
  return (
    <main
      className="px-4 py-14 md:px-6"
      aria-busy="true"
      aria-label="页面加载中"
    >
      <div className="animate-pulse space-y-6" aria-hidden="true">
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
