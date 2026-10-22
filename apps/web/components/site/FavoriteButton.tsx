"use client";

/**
 * FavoriteButton —— 收藏切换按钮（TASK-023 · 契约⑥「收藏按钮」五态）。
 *
 * 五态（data-testid 为 e2e 断言锚，见 contracts/06-ux-states.contract.ts）：
 *   fav-toggle 未收藏（空心星·"收藏"）/ fav-active 已收藏（实心星·"已收藏"）/
 *   fav-pending 提交中（disabled + aria-busy）/ fav-login 未登录（点击跳 /login?redirect）/
 *   fav-error 失败（回滚乐观态 + 短暂提示）。
 * 受控面：`favorites.enabled=false` → 整块隐藏（useFavoritesEnabled）。
 * 定位：父级须为相对定位容器；size=sm（天梯卡片浮钮）/ md（详情页常规按钮）。
 * 状态与后端交互全部委托 useFavoriteToggle（模块级 store，跨页一致）。
 */
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Star } from "lucide-react";

import { Button } from "@aidean/ui";
import type { FavoriteRefType } from "@aidean/shared";
import { useFavoriteToggle, useFavoritesEnabled } from "../../hooks/useFavorites";

interface Props {
  refType: FavoriteRefType;
  refId: string;
  /** 无障碍名称（模型/站台名），用于 aria-label */
  name: string;
  size?: "sm" | "md";
}

/** 未登录点击 → 跳登录并携带站内回跳路径（AuthForm 侧 isSafeInternalRedirect 复核） */
function gotoLogin(pathname: string) {
  const redirect = encodeURIComponent(pathname + (typeof window !== "undefined" ? window.location.search : ""));
  window.location.href = `/login?redirect=${redirect}`;
}

export function FavoriteButton({ refType, refId, name, size = "md" }: Props) {
  const enabled = useFavoritesEnabled();
  const pathname = usePathname();
  const { active, pending, authed, toggle } = useFavoriteToggle(refType, refId);
  const [error, setError] = useState<string | null>(null);

  // 受控关闭：不渲染（契约⑥ forbidden 之外的「隐藏」要求）
  if (!enabled) return null;

  const testId = !authed ? "fav-login" : pending ? "fav-pending" : active ? "fav-active" : "fav-toggle";
  const label = !authed ? "登录后收藏" : active ? "已收藏" : "收藏";

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    const res = await toggle();
    if (res.needLogin) {
      gotoLogin(pathname);
      return;
    }
    if (!res.ok && res.message) {
      setError(res.message);
      window.setTimeout(() => setError(null), 2600);
    }
  }

  if (size === "sm") {
    return (
      <>
        <button
          type="button"
          data-testid={testId}
          aria-label={`${active ? "取消收藏" : "收藏"}：${name}`}
          aria-busy={pending}
          disabled={pending}
          onClick={handleClick}
          className={
            "flex h-5 w-5 items-center justify-center rounded-full border bg-white text-xs transition-colors " +
            (active
              ? "border-amber-300 text-amber-500 hover:text-amber-700"
              : "border-slate-200 text-slate-400 hover:text-amber-500")
          }
        >
          <Star className="h-3.5 w-3.5" fill={active ? "currentColor" : "none"} strokeWidth={2} />
        </button>
        {/* 失败态：sm 也暴露 fav-error 断言锚（sr-only 文本，不占布局） */}
        {error && (
          <span role="status" data-testid="fav-error" className="sr-only">
            {error}
          </span>
        )}
      </>
    );
  }

  return (
    <span className="relative inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        data-testid={testId}
        aria-busy={pending}
        disabled={pending}
        onClick={handleClick}
        variant={active ? "outline" : "ghost"}
        size="sm"
        className={
          active
            ? "border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400 hover:text-amber-800"
            : "border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700"
        }
      >
        <Star className="mr-1 h-4 w-4" fill={active ? "currentColor" : "none"} strokeWidth={2} />
        {pending ? "处理中…" : label}
      </Button>
      {error && (
        <span
          role="status"
          data-testid="fav-error"
          className="absolute right-0 top-full mt-1 whitespace-nowrap rounded bg-red-600 px-2 py-0.5 text-xs text-white shadow"
        >
          {error}
        </span>
      )}
    </span>
  );
}
