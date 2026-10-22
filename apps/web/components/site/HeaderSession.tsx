"use client";

// 头部登录态槽位（M-PERF B2 配套改造）。
// 背景：/models/[slug] ISR 化后，渲染树中任何 cookies() 访问都会触发 Next 14
// 「static→dynamic at runtime」硬错误（非 PPR 下 Suspense 对 cookies 无动态洞机制）。
// 故登录态从 RSC（SiteHeader 内 getSession → cookies()）整体迁至客户端：
// 挂载后探测 /api/v1/auth/me（HttpOnly Cookie 随请求自动携带），按结果渲染菜单/登录入口。
// SSR 输出与加载态为同尺寸占位胶囊——静态壳可被 ISR 缓存，且无布局跳变。
//
// 导航性能优化（2026-10-09）：原每次挂载 fetch → 改 SWR 60s 去重。
// B11-06（2026-10-22，DEF-011-08 / Q-11-02=B）：SWR 改为全站单一会话 store（hooks/useSession）。
// 无提示 Cookie 的游客零请求定案匿名（不再每页 401），有提示时全站最多探测一次并缓存；
// 聚焦复核只在提示与已知态矛盾或已登录态过期时才发请求；跨标签登录/登出经 BroadcastChannel 同步。
import { useEffect } from "react";

import { useSession } from "../../hooks/useSession";
import { refreshSession } from "../../lib/features/auth/client-refresh";

import { UserMenu } from "./UserMenu";

type SessionState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; nickname: string | null; tier: string | null };

export function HeaderSession() {
  const session = useSession();

  const state: SessionState =
    session.status === "authenticated"
      ? { status: "authenticated", nickname: session.user?.nickname ?? null, tier: session.user?.tier ?? null }
      : session.status === "anonymous"
        ? { status: "anonymous" }
        : { status: "loading" };

  // 静默续期：access TTL 15min，10min 周期换发避免使用中被弹回登录页
  useEffect(() => {
    if (state.status !== "authenticated") return;
    const timer = setInterval(() => { void refreshSession(); }, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, [state.status]);

  if (state.status === "loading") {
    /* 与最终槽位（头像圆点）同尺寸的占位，避免注入跳变；徽章已按 D3 摘除 */
    return <div className="h-8 w-8 animate-pulse rounded-full bg-muted" aria-hidden="true" />;
  }

  if (state.status === "authenticated") {
    // [D3 裁决 2026-09-30]：等级仅保留 UserMenu 下拉一处展示；头部徽章摘除，
    // 加载占位宽度相应收窄（无徽章槽位）。
    return <UserMenu nickname={state.nickname} tier={state.tier} />;
  }

  return (
    <a
      href="/login"
      className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
    >
      登录
    </a>
  );
}
