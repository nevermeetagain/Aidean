"use client";

/**
 * 管理端登录表单（rebuild-admin-console-and-harden-auth Phase 1）：
 * - 与前台 AuthForm 共用契约（LoginSchema + POST /api/v1/auth/login），但视觉独立：
 *   浅色冷色居中卡，无微信扫码块、无前台导航（需求 1/2/10）；
 * - 成功跳 redirect 参数（仅站内相对路径，拒绝 // 与外部 URL），缺省 /admin。
 * 视觉（UI 重构）：白卡 + 冷灰输入 + 主色按钮 + 焦点环；交互与契约不变。
 */
import { useEffect, useState, type FormEvent } from "react";

import { LoginSchema } from "@aidean/shared";

import { isSafeInternalRedirect } from "../../lib/features/auth/redirect";
import { Input } from "@aidean/ui";


export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // ?denied=1：已登录但角色不足（(admin)/layout 守卫带回），提示权限不足
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("denied") === "1") {
      setDenied(true);
    }
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const field = String(parsed.error.issues[0]?.path[0] ?? "");
      setError(field === "email" ? "请输入有效的邮箱地址" : "请输入密码");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json().catch(() => null)) as
        | { code?: number; message?: string }
        | null;
      if (!res.ok || !body || body.code !== 0) {
        setError(body?.message ?? "请求失败，请稍后重试");
        return;
      }
      const redirect = new URLSearchParams(window.location.search).get("redirect");
      // AUTH-01/RC-02：回跳校验收敛为共享 Contract（拒绝 // 与 /\ 及外部 URL，仅站内相对路径）
      window.location.href = isSafeInternalRedirect(redirect) ? redirect : "/admin";
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-[var(--shadow-lg)]"
      data-testid="admin-login-card"
    >
      <div className="flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/aidean-logo.png" alt="Aidean" className="h-8 w-auto" />
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Admin Console
        </p>
        <h1 className="mt-1.5 text-lg font-semibold text-slate-900">管理控制台登录</h1>
      </div>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4" data-testid="admin-login-form">
        <label className="block">
          <span className="text-xs font-medium text-slate-500">邮箱</span>
          <Input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="admin@aidean.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-500">密码</span>
          <Input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {denied && !error && (
          <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700" data-testid="admin-login-denied">
            权限不足：该控制台仅限管理员账号访问
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="admin-login-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-[var(--shadow-sm)] transition hover:-translate-y-px hover:shadow-[var(--shadow-md)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {submitting ? "登录中…" : "登 录"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-400">
        仅限管理员账号 · 非法访问将被记录
      </p>
    </div>
  );
}
