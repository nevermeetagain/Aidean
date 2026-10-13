"use client";

/**
 * S8.2 移动端响应式抽屉（restructure-admin-nav-rbac-cms）。
 * - 小屏（< md）显示汉堡按钮，点击从左侧滑出 off-canvas 抽屉，内嵌 AdminSidebar（forceExpanded 恒展开）；
 * - 遮罩点击 / ESC / 路由变化均关闭抽屉；md 及以上由桌面常驻侧栏承担，本组件整体不显示。
 */
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import type { AdminNavVM } from "../../lib/admin-navigation-core";
import { AdminSidebar } from "./AdminSidebar";

export function AdminMobileNav({ nav }: { nav: AdminNavVM }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // 导航后自动关闭抽屉（移动端切换到目标页即收起）
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="打开导航菜单"
        aria-expanded={open}
        data-testid="admin-mobile-menu-toggle"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 md:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>

      <div
        className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
        data-testid="admin-mobile-drawer"
        data-open={open ? "1" : "0"}
      >
        <div
          className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <div
          className={`absolute left-0 top-0 h-full shadow-xl transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {open ? <AdminSidebar nav={nav} forceExpanded /> : null}
        </div>
      </div>
    </>
  );
}
