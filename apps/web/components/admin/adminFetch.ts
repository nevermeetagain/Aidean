"use client";

import { refreshSession } from "../../lib/features/auth/client-refresh";

/**
 * 管理端客户端 API 助手：统一信封 {code,message,data} 解包。
 * ok=false 时 message 为服务端文案（信封 code!==0）或网络失败文案。
 */
export interface EnvelopeResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  message: string | null;
}

export async function adminFetch<T>(url: string, init?: RequestInit): Promise<EnvelopeResult<T>> {
  try {
    const doFetch = () =>
      fetch(url, {
        ...init,
        headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
      });
    let res = await doFetch();
    // 401（access 过期）：静默刷新后重试一次，避免 15min TTL 把管理员弹回登录页
    if (res.status === 401) {
      const refreshed = await refreshSession();
      if (refreshed) {
        res = await doFetch();
      }
    }
    const body = (await res.json()) as { code?: number; message?: string; data?: T | null };
    if (res.ok && body.code === 0) {
      return { ok: true, status: res.status, data: body.data ?? null, message: null };
    }
    return { ok: false, status: res.status, data: null, message: body.message ?? `请求失败（${res.status}）` };
  } catch {
    return { ok: false, status: 0, data: null, message: "网络异常，请重试" };
  }
}

/** 信封形态（读侧类型收口） */
export type Envelope<T> = { code?: number; message?: string; data?: T | null };
