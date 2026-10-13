"use client";

/**
 * 客户端静默刷新（浏览器侧）。
 *
 * 背景：access token TTL 15min（COOKIE_ACCESS maxAge 对齐），refresh 7 天；
 * 服务端 /api/v1/auth/refresh 存在但此前无任何客户端调用 —— 用户每 15 分钟
 * 必然被 middleware 弹回登录页（refresh cookie 明明有效）。
 *
 * 安全约束：refresh 是一次性轮换（rotated 代被复用 = 重放攻击 → 整链撤销）。
 * 因此必须防「两处同时换发」：同 tab 用模块级单飞；跨 tab 用 localStorage
 * 时间锁（5s 窗口，best-effort —— 读写在同 tab 内原子，跨 tab 极小概率碰撞时
 * 后到方放弃本次刷新，等下一次 401/周期再试）。
 */

const REFRESH_LOCK_KEY = "aidean.refresh.lock";
const REFRESH_LOCK_WINDOW_MS = 5000;

let refreshInflight: Promise<boolean> | null = null;

/** 静默刷新登录态。返回是否刷新成功（false = 锁被占/刷新失败，调用方保持原状）。 */
export function refreshSession(): Promise<boolean> {
  if (refreshInflight) return refreshInflight;
  refreshInflight = (async () => {
    try {
      if (typeof localStorage !== "undefined") {
        const now = Date.now();
        const lockAt = Number(localStorage.getItem(REFRESH_LOCK_KEY) ?? 0);
        if (Number.isFinite(lockAt) && now - lockAt < REFRESH_LOCK_WINDOW_MS) {
          return false; // 其他 tab 刚刷新过，本轮放弃
        }
        localStorage.setItem(REFRESH_LOCK_KEY, String(now));
      }
      const res = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        credentials: "same-origin",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshInflight = null;
    }
  })();
  return refreshInflight;
}
