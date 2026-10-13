"use client";

/**
 * 管理端两级手风琴侧边栏（rebuild-admin-console-and-harden-auth Phase 1）：
 * - 组→子项两级结构，组头点击手风琴展开/收起；整条侧边栏可收起为纯图标
 *   （title + aria-label 提供可访问名），收起状态持久化 localStorage；
 * - 当前路由高亮（usePathname 前缀匹配）；键盘可达（原生 button/link）。
 * 需求 4：多层级、支持展开/缩起。
 * 视觉口径（UI 重构）：浅色冷色——白底侧栏 + slate 分层 + 主色高亮，与深色旧版观感切割。
 *
 * R-49/R-50/R-51：新增 API站点、评估管理、公告管理 三个 admin 板块入口。
 * S2 可配置菜单：导航数据由 (admin)/layout 注入（getAdminNav 取 NavigationMenu scope=ADMIN），本组件不再硬编码 GROUPS。
 * 图标以 iconPath（SVG d 串）驱动；iconPath 为空时用通用圆点兜底。
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import type { AdminNavVM, NavGroupVM, NavLeafVM } from "../../lib/admin-navigation-core";

/* 内联线性图标（24 viewBox，stroke 继承 currentColor）；iconPath 为空时用通用圆点兜底，保证收起态仍可见可点。 */
const FALLBACK_ICON_PATH = "M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0";
function NavIcon({ path, className }: { path: string | null; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={path ?? FALLBACK_ICON_PATH} />
    </svg>
  );
}

const COLLAPSED_KEY = "aidean-admin-sidebar-collapsed";
const OPEN_GROUPS_KEY = "aidean-admin-open-groups";

// 展平组内所有可导航 href（直接叶 + 各小节的子叶），供路由命中判定与收起态图标列使用。
function allHrefs(group: NavGroupVM): string[] {
  const direct = group.leaves.map((l) => l.href).filter((h): h is string => !!h);
  const viaSections = (group.sections ?? []).flatMap((s) => (s.children ?? []).map((c) => c.href).filter((h): h is string => !!h));
  return [...direct, ...viaSections];
}

// 组内全部可导航叶（直接叶 + 小节子叶），收起态图标列扁平化用。
function renderableLeaves(group: NavGroupVM): NavLeafVM[] {
  return [...group.leaves, ...(group.sections ?? []).flatMap((s) => s.children ?? [])];
}

// 当前路由命中的分组下标：任意可导航叶 href 相等或以 `href + "/"` 为前缀；概览 /admin 不属任何分组，返回 -1
function groupIndexForPath(groups: NavGroupVM[], pathname: string): number {
  const path = pathname.replace(/\/$/, "") || "/";
  for (let i = 0; i < groups.length; i++) {
    for (const href of allHrefs(groups[i])) {
      if (path === href || path.startsWith(href + "/")) return i;
    }
  }
  return -1;
}

/* 单个可导航叶（level2 直接叶 depth=0 / level3 小节子叶 depth=1 更深缩进）。href 由建树保证存在。 */
function LeafLink({ leaf, depth, pathname }: { leaf: NavLeafVM; depth: 0 | 1; pathname: string }) {
  const href = leaf.href as string;
  const active = pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`mx-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
        depth === 0 ? "pl-6" : "pl-10 text-[13px]"
      } ${active ? `${ACTIVE_CLS} font-medium` : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
    >
      <NavIcon path={leaf.iconPath} className="h-4 w-4 shrink-0" />
      {leaf.label}
    </Link>
  );
}

const ACTIVE_CLS = "bg-primary/10 text-primary";
const IDLE_CLS = "text-slate-500 hover:bg-slate-100 hover:text-slate-800";

export function AdminSidebar({ nav, forceExpanded = false }: { nav: AdminNavVM; forceExpanded?: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<number[]>([0, 1]);
  const headingId = useId();

  useEffect(() => {
    // 抽屉态（forceExpanded）忽略收起存档，恒为展开；桌面态才恢复 localStorage
    if (!forceExpanded && localStorage.getItem(COLLAPSED_KEY) === "1") setCollapsed(true);
    try {
      const saved = JSON.parse(localStorage.getItem(OPEN_GROUPS_KEY) ?? "null");
      if (Array.isArray(saved)) setOpenGroups(saved.filter((n) => typeof n === "number"));
    } catch {
      // 无存档或损坏：维持默认 [0, 1]
    }
  }, [forceExpanded]);

  // 路由命中当前分组则并入展开态（不写存档）：保证冷启动/直访深层页（如 /admin/orders）时当前项在 DOM 内
  useEffect(() => {
    const gi = groupIndexForPath(nav.groups, pathname);
    if (gi >= 0) setOpenGroups((prev) => (prev.includes(gi) ? prev : [...prev, gi]));
  }, [pathname, nav.groups]);

  function toggleCollapsed(): void {
    setCollapsed((prev) => {
      localStorage.setItem(COLLAPSED_KEY, prev ? "0" : "1");
      return !prev;
    });
  }

  function toggleGroup(i: number): void {
    setOpenGroups((prev) => {
      const next = prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i];
      localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <nav
      aria-label="管理导航"
      className={`flex h-full flex-col border-r border-slate-200 bg-white text-slate-600 transition-[width] duration-200 ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      {/* 品牌位 + 收起开关 */}
      <div className={`flex h-12 shrink-0 items-center border-b border-slate-100 ${collapsed ? "justify-center" : "justify-between px-3.5"}`}>
        {!collapsed ? (
          <span className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aidean-logo.png" alt="Aidean" width={72} height={20} className="h-4 w-auto" />
            <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-semibold text-primary">Admin</span>
          </span>
        ) : null}
        {!forceExpanded ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
            aria-expanded={!collapsed}
            title={collapsed ? "展开侧边栏" : "收起侧边栏"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d={collapsed ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {/* 概览：独立置顶（展开态全宽链接 / 收起态纯图标）；/admin 精确匹配避免与子页误高亮 */}
        {(() => {
          const ov = nav.overview;
          if (!ov) return null;
          const active = pathname === "/admin" || pathname === "/admin/";
          return collapsed ? (
            <div className="flex justify-center py-1">
              <Link
                href={ov.href as string}
                title={ov.label}
                aria-label={ov.label}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                  active ? ACTIVE_CLS : IDLE_CLS
                }`}
              >
                <NavIcon path={ov.iconPath} className="h-5 w-5" />
              </Link>
            </div>
          ) : (
            <div className="px-2 pb-1">
              <Link
                href={ov.href as string}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? `${ACTIVE_CLS} font-medium` : IDLE_CLS
                }`}
              >
                <NavIcon path={ov.iconPath} className="h-4 w-4 shrink-0" />
                {ov.label}
              </Link>
            </div>
          );
        })()}
        {nav.groups.map((group, gi) => {
          const open = openGroups.includes(gi);
          const groupActive = allHrefs(group).some((h) => pathname.startsWith(h));
          return (
            <div key={group.label}>
              {collapsed ? (
                /* 收起态：仅图标纵列（直接叶 + 小节子叶扁平化） */
                <div className="flex flex-col items-center py-1" role="group" aria-label={group.label}>
                  {renderableLeaves(group).map((leaf) => {
                    const href = leaf.href as string;
                    const active = pathname.startsWith(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        title={leaf.label}
                        aria-label={leaf.label}
                        aria-current={active ? "page" : undefined}
                        className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                          active ? ACTIVE_CLS : IDLE_CLS
                        }`}
                      >
                        <NavIcon path={leaf.iconPath} className="h-5 w-5" />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => toggleGroup(gi)}
                    aria-expanded={open}
                    aria-controls={`${headingId}-g${gi}`}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                      groupActive ? "text-primary" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {group.label}
                    <svg
                      viewBox="0 0 12 12"
                      className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path d="M2.5 4.5L6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {open && (
                    <div id={`${headingId}-g${gi}`} className="pb-1">
                      {/* level2 直接叶 */}
                      {group.leaves.map((leaf) => (
                        <LeafLink key={leaf.href as string} leaf={leaf} depth={0} pathname={pathname} />
                      ))}
                      {/* level2 小节 → level3 叶（三级） */}
                      {(group.sections ?? []).map((section) => {
                        const secActive = !!section.href && pathname.startsWith(section.href);
                        return (
                          <div key={section.label}>
                            {section.href ? (
                              <Link
                                href={section.href}
                                aria-current={secActive ? "page" : undefined}
                                className={`mx-2 mt-1 flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                                  secActive ? "text-primary" : "text-slate-400 hover:text-slate-600"
                                }`}
                              >
                                <NavIcon path={section.iconPath} className="h-4 w-4 shrink-0" />
                                {section.label}
                              </Link>
                            ) : (
                              <div className="mx-2 mt-1 flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                <NavIcon path={section.iconPath} className="h-4 w-4 shrink-0" />
                                {section.label}
                              </div>
                            )}
                            {(section.children ?? []).map((child) => (
                              <LeafLink key={child.href as string} leaf={child} depth={1} pathname={pathname} />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* 底部：环境标识（非交互） */}
      <div className={`shrink-0 border-t border-slate-100 py-3 ${collapsed ? "text-center" : "px-4"}`}>
        <p className={`text-[10px] leading-4 text-slate-400 ${collapsed ? "hidden" : ""}`}>
          Aidean Console
          <br />
          内部系统 · 请勿外传
        </p>
        {collapsed ? <span className="text-[10px] text-slate-400">AC</span> : null}
      </div>
    </nav>
  );
}
