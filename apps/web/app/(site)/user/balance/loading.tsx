// /user/balance 专用加载骨架（WP-FE01 §全局体验：loading/skeleton）。
// 与最终布局同构：面包屑 + H1 + 钱包三卡 + 兑换码 + 充值面板 + 订单 + 消费记录 + 用量明细。
// 内边距对齐页头零间距约定（pb-14 pt-0）。纯静态 UI；仅消费既有令牌类。
export default function BalanceLoading() {
  return (
    <main className="px-4 pb-14 pt-0 md:px-6" aria-busy="true" aria-label="余额页加载中">
      <div className="animate-pulse motion-reduce:animate-none" aria-hidden="true">
        <div className="mb-8 h-4 w-52 rounded bg-muted" />
        <div className="h-8 w-20 rounded-md bg-muted" />

        {/* 钱包三卡 */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((card) => (
            <div key={card} className="h-28 rounded-lg border border-[var(--border)] bg-[var(--card)]" />
          ))}
        </div>

        {/* 兑换码 / 充值 / 订单 / 流水 / 用量明细 */}
        {[0, 1, 2, 3, 4].map((section) => (
          <div
            key={section}
            className="mt-8 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-5"
          >
            <div className="h-5 w-28 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-4/5 rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
          </div>
        ))}
      </div>
    </main>
  );
}
