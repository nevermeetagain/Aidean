"use client";

/**
 * 管理端退出登录按钮（Phase 1 外壳配套）：调 POST /api/v1/auth/logout 后回登录页。
 * 独立小组件避免整个顶栏客户端化（'use client' 只放叶子，工程约定）。
 */
export function AdminLogoutButton() {
  function handleLogout(): void {
    fetch("/api/v1/auth/logout", { method: "POST" })
      .catch(() => undefined)
      .finally(() => {
        window.location.href = "/admin/login";
      });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
    >
      退出登录
    </button>
  );
}
