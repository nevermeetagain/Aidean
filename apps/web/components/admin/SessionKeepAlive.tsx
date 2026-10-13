"use client";

/**
 * 管理端会话保活（#59 配套）：admin 布局无前台 HeaderSession，长会话下
 * access cookie（15min TTL）过期后 middleware 会在下一次导航直接 307，
 * adminFetch 的 401 重试救不了导航本身。此组件在已进入管理端的会话内
 * 周期性静默换发 access token（10min < 15min TTL）。
 */
import { useEffect } from "react";

import { refreshSession } from "../../lib/features/auth/client-refresh";

export function SessionKeepAlive() {
  useEffect(() => {
    const timer = setInterval(() => { void refreshSession(); }, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  return null;
}
