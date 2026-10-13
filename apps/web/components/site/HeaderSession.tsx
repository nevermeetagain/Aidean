"use client";

// 头部登录态槽位（M-PERF B2 配套改造）。
// 背景：/models/[slug] ISR 化后，渲染树中任何 cookies() 访问都会触发 Next 14
// 「static→dynamic at runtime」硬错误（非 PPR 下 Suspense 对 cookies 无动态洞机制）。
// 故登录态从 RSC（SiteHeader 内 getSession → cookies()）整体迁至客户端：
// 挂载后探测 /api/v1/auth/me（HttpOnly Cookie 随请求自动携带），按结果渲染菜单/登录入口。
// SSR 输出与加载态为同尺寸占位胶囊——静态壳可被 ISR 缓存，且无布局跳变。
//
// 导航性能优化（2026-10-09）：
// 原实现每次 site 页面挂载都 fetch /api/v1/auth/me——site 导航间重复请求。
// 改用 SWR 缓存：dedupingInterval=60s 内同 key 请求自动去重，跨页面导航复用缓存，
// revalidateOnFocus 在用户切回标签页时静默刷新登录态。
import useSWR from "swr";
import { useEffect } from "react";

import { refreshSession } from "../../lib/features/auth/client-refresh";

import { UserMenu } from "./UserMenu";

type SessionState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; nickname: string | null; tier: string | null };

const authFetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as {
    data?: { user?: { nickname?: string | null; tier?: string | null } };
  };
};

export function HeaderSession() {
  const { data, error } = useSWR("/api/v1/auth/me", authFetcher, {
    dedupingInterval: 60_000, // 60s 内同 key 请求去重——跨页面导航复用缓存
    revalidateOnFocus: true, // 用户切回标签页时静默刷新
    errorRetryCount: 1,
  });

  const state: SessionState = data
    ? {
        status: "authenticated",
        nickname: data.data?.user?.nickname ?? null,
        tier: data.data?.user?.tier ?? null,
      }
    : error
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
