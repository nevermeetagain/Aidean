/**
 * AdminPageTabs — 管理端「页内 Tab」导航条（服务端组件，零客户端状态）。
 *
 * UX-26 裁定 7（/admin/configs ?tab=）与裁定 8（兼容矩阵 ?tab=）共用：
 * - 每个 Tab 是指向 `?tab=<key>` 的链接 → 天然可深链、可刷新、可分享，浏览器前进/后退可用；
 * - 当前 Tab 由页面从 searchParams 解析（非法值回落首个 Tab），仅渲染该 Tab 的编辑器/面板，
 *   避免单页一次铺开全部表单（/admin/configs 原 404 个交互元素）。
 * - 主色走 border-primary / text-primary（随主题切换，UX-25）。
 */
import Link from "next/link";

export interface AdminPageTab {
  key: string;
  label: string;
}

/** 解析 ?tab=：不在白名单内回落首个 Tab。 */
export function resolveAdminTab(raw: string | string[] | undefined, tabs: readonly AdminPageTab[]): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return tabs.some((t) => t.key === v) ? (v as string) : tabs[0].key;
}

export function AdminPageTabs({
  basePath,
  tabs,
  current,
  label,
  testId,
}: {
  basePath: string;
  tabs: readonly AdminPageTab[];
  current: string;
  /** 导航条无障碍名称 */
  label: string;
  testId?: string;
}) {
  return (
    <nav aria-label={label} data-testid={testId} className="flex flex-wrap gap-1 border-b border-slate-200">
      {tabs.map((t) => {
        const active = t.key === current;
        return (
          <Link
            key={t.key}
            href={`${basePath}?tab=${t.key}`}
            scroll={false}
            aria-current={active ? "page" : undefined}
            data-testid={testId ? `${testId}-${t.key}` : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              active ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
