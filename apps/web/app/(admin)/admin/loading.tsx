// 后台管理端导航骨架 —— 修复「点击侧边栏→白屏等待完整 RSC」的主观「卡」。
// 背景：admin 各页均为 force-dynamic（鉴权/实时数据，正确不预取），<Link> 客户端导航时须等完整
// RSC 往返（实测热态文档 TTFB ~90-175ms、冷/首次编译更高）才提交新页；此前无任何 loading 边界，
// 导航期间 layout 的 <main> 内容区保持旧页/空白零反馈。
// 【落位关键】本页真实路径为 app/(admin)/admin/<name>/page.tsx；骨架必须放在 admin 段（所有叶子页的
// 共同父段），而非 (admin) 分组根——分组根的 loading.tsx 位于 (admin)/layout 的 <children> 之上，点击
// 兄弟叶子页时该边界已挂载不会重新挂起，实测从不显示。放此处后侧边栏导航期即时给出结构化骨架（Playwright
// MutationObserver 复测：/admin/models、/providers、/users 导航期 skeletonDuringNav 均为 true）。
// 口径：纯静态 UI，不引 DB/业务模块/鉴权；不包 <main>（(admin)/layout 已提供），宽度对齐各管理页的 max-w-6xl。
// 形态按后台最常见的「标题 + 工具条 + 数据表」布局骨架，减少切换跳变。
export default function AdminLoading() {
  return (
    <div
      className="mx-auto max-w-6xl space-y-4"
      aria-busy="true"
      aria-label="管理内容加载中"
    >
      <div className="animate-pulse space-y-4 motion-reduce:animate-none" aria-hidden="true">
        {/* 页头：标题 + 副标题 */}
        <div className="space-y-2">
          <div className="h-6 w-40 rounded-md bg-slate-200" />
          <div className="h-3 w-72 max-w-full rounded bg-slate-100" />
        </div>

        {/* 工具条：搜索框 + 按钮 + 计数 */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-72 max-w-full rounded-md bg-slate-100" />
          <div className="h-9 w-20 rounded-md bg-slate-200" />
          <div className="ml-auto h-4 w-24 rounded bg-slate-100" />
        </div>

        {/* 数据表容器 */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-3">
            <div className="h-3 w-4 rounded bg-slate-100" />
            <div className="h-3 w-24 rounded bg-slate-100" />
            <div className="h-3 w-16 rounded bg-slate-100" />
            <div className="ml-auto h-3 w-16 rounded bg-slate-100" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-slate-50 px-4 py-3">
              <div className="h-4 w-4 rounded bg-slate-100" />
              <div className="h-4 w-40 rounded bg-slate-100" />
              <div className="h-4 w-20 rounded bg-slate-100" />
              <div className="ml-auto h-6 w-14 rounded-md bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
