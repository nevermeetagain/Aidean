"use client";
import { Button } from "@aidean/ui";

import { sessionStore } from "../../lib/features/auth/session-store";
import { tierShortLabelOf } from "../../lib/features/user/tier";

/**
 * 用户菜单（Task A.3.3）：头部头像圆点 + details 下拉。
 * 仅承担交互（退出登录调 POST /api/v1/auth/logout 后回首页）；昵称等取数在 SiteHeader 服务端完成。
 * [D3 裁决 2026-09-30]：等级展示唯一保留点（下拉首行「等级：X」）；
 * 头部徽章（TierBadge）已由 HeaderSession 摘除，等级短名经 tier.ts 单源。
 */

interface UserMenuProps {
  /** 用户昵称（可空）；渲染为首字圆点，空则回退「用」 */
  nickname: string | null;
  /** 账户等级（可空；下拉首行展示） */
  tier?: string | null;
}

export function UserMenu({ nickname, tier }: UserMenuProps) {
  const initial = nickname?.trim()?.[0] ?? "用";

  function handleLogout(): void {
    fetch("/api/v1/auth/logout", { method: "POST" })
      .catch(() => undefined)
      .finally(() => {
        // B11-06：会话 store 置匿名 + 删提示 Cookie + 跨标签广播 logout（其他标签页零请求同步）
        sessionStore.markLoggedOut();
        window.location.href = "/";
      });
  }

  return (
    <details className="relative [&::-webkit-details-marker]:hidden">
      <summary
        aria-label="用户菜单"
        title={nickname ?? undefined}
        className="flex size-8 cursor-pointer list-none select-none items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
      >
        {initial}
      </summary>
      <div className="absolute right-0 top-full z-20 mt-2 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
        {tier ? (
          <p className="border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
            等级：<span className="font-semibold text-slate-800">{tierShortLabelOf(tier)}</span>
          </p>
        ) : null}
        <a
          href="/user/console"
          className="block px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
        >
          控制台
        </a>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
        >
          退出登录
        </Button>
      </div>
    </details>
  );
}
