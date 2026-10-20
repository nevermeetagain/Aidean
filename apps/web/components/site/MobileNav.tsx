"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { NAV_ITEMS, type NavItem } from "../../lib/navigation";
import { GlobalSearch } from "./GlobalSearch";

/**
 * 移动端抽屉导航（<768px）。
 * 桌面端导航（SiteHeader 内 `hidden md:flex` 八项）保持 server 组件零 JS；
 * 本组件仅在 md 断点以下出现（整体 `md:hidden`），替换此前无功能的装饰汉堡占位。
 *
 * 行为契约：
 * - 汉堡按钮切换抽屉开合（aria-expanded / aria-controls 可达）；
 * - 点击任一导航项或路由变化（usePathname）自动收起，避免残留遮挡；
 * - 打开期间锁定 body 滚动，关闭（含 backdrop 点击）恢复；
 * - 数据源与桌面端同源：优先用 SiteHeader 传入的 items（已按功能开关过滤，TASK-018），
 *   缺省回落 lib/navigation.ts NAV_ITEMS（含产品二级子项），顺序/文案单一真源。
 */
export function MobileNav({ items = NAV_ITEMS }: { items?: readonly NavItem[] } = {}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // 路由变化 → 收起抽屉（点击链接后不残留遮挡新页面）
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 打开期间锁滚动，卸载/关闭恢复
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "关闭导航菜单" : "打开导航菜单"}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:text-primary"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open && (
        <>
          {/* backdrop：点击关闭 */}
          <div
            className="fixed inset-0 top-[64px] z-30 bg-slate-900/30"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <nav
            id="mobile-nav-panel"
            aria-label="移动端主导航"
            className="fixed inset-x-0 top-[64px] z-40 max-h-[calc(100dvh-64px)] overflow-y-auto border-b border-slate-200 bg-white px-4 py-3 shadow-xl"
          >
            {/* 移动端搜索入口（TASK-034，唯一搜索入口之二：桌面在 SiteHeader） */}
            <div className="mb-3 border-b border-slate-100 pb-3">
              <GlobalSearch variant="mobile" />
            </div>
            <ul className="flex flex-col">
              {items.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary"
                  >
                    {item.label}
                  </Link>
                  {/* 产品等有二级子项：缩进平铺子链接 */}
                  {item.children && (
                    <ul className="ml-3 border-l border-slate-200 pl-2">
                      {item.children.map((child) => (
                        <li key={child.key}>
                          <Link
                            href={child.href}
                            className="block rounded-lg px-3 py-2 text-[13px] text-slate-500 transition-colors hover:bg-slate-50 hover:text-primary"
                          >
                            {child.group ? (
                              <span className="text-slate-400">{child.group} · </span>
                            ) : null}
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
