import Link from "next/link";

/**
 * FeatureDisabled — 功能关闭态通用呈现（TASK-018 / 契约⑥「功能关闭态（全站通用）」forbidden 态）。
 *
 * 锚点：data-testid="feature-disabled"、主文案「该功能暂未开放」为 e2e 断言基准（06-ux-states.contract.ts）；
 * 附「返回首页」入口。由 4 个受控页（providers/models/ladder/evaluations-new）首行守卫
 * `if (!flags[code]) return <FeatureDisabled />` **内联渲染**。
 *
 * HTTP 状态说明（D-1，见 EVD-018）：锁定技术栈 next@15.0.0 未导出 forbidden()（page 侧设 HTTP 403 的一等机制缺失），
 * 故页面级以本组件内联呈现关闭态；严格对应语义由受控 API 层 requireFeature→50011→HTTP 403 承接（TASK-015）。
 * 页面级严格 403 待 Next≥15.1 forbidden() 或经 ADR 的 middleware 方案补齐（治理待决，不构成本卡谎称完成）。
 *
 * 视觉口径：与前台同令牌体系、永远浅色可读（需求 §五.1）；复用 primary/foreground/muted-foreground 令牌，
 * 三套浅色主题下对比度达标。可选 feature 为差异化文案预留入参（当前受控页未传，呈通用文案）。
 */
export function FeatureDisabled({ feature }: { feature?: string }) {
  return (
    <div
      data-testid="feature-disabled"
      className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-4 py-24 text-center"
    >
      <span
        aria-hidden="true"
        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round" />
        </svg>
      </span>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">该功能暂未开放</h1>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">
        {feature ? `「${feature}」` : "当前访问的功能"}已关闭或尚未上线，请稍后再来，或返回首页继续浏览。
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
      >
        返回首页
      </Link>
    </div>
  );
}
