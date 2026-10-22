"use client";

/**
 * useSession —— 客户端会话 store 的 React 绑定（B11-06）。
 *
 * - 订阅 `lib/features/auth/session-store.ts` 的模块级单例（useSyncExternalStore；SSR/首帧恒 unknown，
 *   与 HeaderSession 的同尺寸占位一致，无水合失配）。
 * - 挂载即 `ensure()`：无提示 Cookie 的游客零请求定案匿名；有提示时全站最多一次 `/auth/me`（单飞 + 缓存）。
 * - 首个消费者挂载时安装跨标签（BroadcastChannel / storage）与聚焦复核监听，全局只装一次。
 */
import { useEffect, useSyncExternalStore } from "react";

import { sessionStore, type SessionSnapshot } from "../lib/features/auth/session-store";

export function useSession(): SessionSnapshot {
  const snap = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot, sessionStore.getServerSnapshot);
  useEffect(() => {
    sessionStore.connect();
    void sessionStore.ensure();
  }, []);
  return snap;
}

export { sessionStore };
