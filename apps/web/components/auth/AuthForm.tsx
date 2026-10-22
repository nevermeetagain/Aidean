"use client";

/**
 * 认证表单（Task A.3.2）：
 * - 邮箱/密码(/注册昵称)受控输入，提交前用 @aidean/shared 的 Login/RegisterSchema
 *   做客户端同源校验（契约唯一真源，本地仅做中文映射）；
 * - UX-18：表单 noValidate（不走浏览器原生气泡），客户端校验失败按字段在输入框下方行内红字提示
 *   （aria-invalid + aria-describedby），多个字段同时出错一并标出；
 * - POST /api/v1/auth/{login,register}，响应信封 code!==0 → 表单级红字展示 message 且保留输入；
 * - 登录成功回跳 redirect 参数（仅接受站内相对路径，防开放跳转），缺省 /user/console；
 * - 微信扫码块（AT-18.3.3 / D4 裁决）：探测 /api/v1/wechat/qrcode，enabled:true 才渲染，
 *   未启用时整块隐藏（不渲染占位），探测保留以便开通即回显。
 */
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { LoginSchema, RegisterSchema } from "@aidean/shared";
import { Button, Input } from "@aidean/ui";

import { isSafeInternalRedirect } from "../../lib/features/auth/redirect";
import { sessionStore } from "../../lib/features/auth/session-store";

type AuthField = "email" | "password" | "nickname";

interface AuthFormProps {
  mode: "login" | "register";
}

/** zod issue 的字段路径 → 中文提示（注册态密码规则 min(8)，登录态 min(1)） */
function localizedIssueMessage(fieldPath: string, isRegister: boolean): string {
  switch (fieldPath) {
    case "email":
      return "请输入有效的邮箱地址";
    case "password":
      return isRegister ? "密码至少需要 8 位" : "请输入密码";
    case "nickname":
      return "昵称需为 1-32 个字符";
    default:
      return "输入有误，请检查后重试";
  }
}

export function AuthForm({ mode }: AuthFormProps) {
  const isRegister = mode === "register";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AuthField, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  // 微信扫码通道探测结果：默认 disabled（SSR/首帧即占位，fetch 失败也回落占位）
  const [wechatEnabled, setWechatEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/wechat/qrcode")
      .then((res) => res.json())
      .then((body: { code?: number; data?: { enabled?: boolean } | null }) => {
        if (!cancelled && body.code === 0 && body.data?.enabled === true) {
          setWechatEnabled(true);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function clearFieldError(field: AuthField) {
    setFieldErrors((cur) => (cur[field] ? { ...cur, [field]: undefined } : cur));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    // 客户端 zod 同源校验（与服务端同一 schema）
    const parsed = isRegister
      ? RegisterSchema.safeParse({ email, password, nickname })
      : LoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      // 按字段收集（每字段取首条），行内展示；无法归属字段的问题落表单级提示
      const next: Partial<Record<AuthField, string>> = {};
      let general: string | null = null;
      for (const issue of parsed.error.issues) {
        const fieldPath = String(issue.path[0] ?? "");
        if (fieldPath === "email" || fieldPath === "password" || fieldPath === "nickname") {
          next[fieldPath] ??= localizedIssueMessage(fieldPath, isRegister);
        } else {
          general ??= localizedIssueMessage(fieldPath, isRegister);
        }
      }
      setFieldErrors(next);
      setError(general);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isRegister ? { email, password, nickname } : { email, password }
        ),
      });
      const body = (await res.json().catch(() => null)) as
        | { code?: number; message?: string; data?: { user?: unknown } | null }
        | null;
      if (!res.ok || !body || body.code !== 0) {
        // 错误信封行内展示；不清空 state → 输入保留
        setError(body?.message ?? "请求失败，请稍后重试");
        return;
      }

      // B11-06：通知全站会话 store（写提示 Cookie + 跨标签广播 login），其他标签页随之重新定案
      // 响应体自带 user 则直接定案；整页跳转在即，不再额外探测（probe:false）
      void sessionStore.markLoggedIn(body.data?.user, { probe: false });
      // 成功：redirect 仅接受站内相对路径（以单个 / 开头，拒绝 // 与外部 URL），缺省控制台
      const redirect = new URLSearchParams(window.location.search).get("redirect");
      // AUTH-01/RC-02：回跳校验收敛为共享 Contract（拒绝 // 与 /\ 及外部 URL，仅站内相对路径）
      window.location.href = isSafeInternalRedirect(redirect) ? redirect : "/user/console";
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[var(--shadow-md)]">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          {isRegister ? "创建账号" : "邮箱登录"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {isRegister ? "注册后即可使用筛选收藏与统一计费网关" : "登录后同步等级权益与余额"}
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4" data-testid="auth-form">
          {isRegister && (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">昵称</span>
              <Input
                name="nickname"
                type="text"
                required
                maxLength={32}
                autoComplete="nickname"
                placeholder="你的昵称"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  clearFieldError("nickname");
                }}
                invalid={!!fieldErrors.nickname}
                aria-describedby={fieldErrors.nickname ? "auth-nickname-error" : undefined}
                className="mt-1.5 rounded-xl px-3.5 py-2.5 text-slate-800 shadow-[var(--shadow-sm)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
              />
              {fieldErrors.nickname ? (
                <span id="auth-nickname-error" data-testid="field-error-nickname" className="mt-1 block text-xs text-red-600">
                  {fieldErrors.nickname}
                </span>
              ) : null}
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium text-slate-700">邮箱</span>
            <Input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
              invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "auth-email-error" : undefined}
              className="mt-1.5 rounded-xl px-3.5 py-2.5 text-slate-800 shadow-[var(--shadow-sm)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
            />
            {fieldErrors.email ? (
              <span id="auth-email-error" data-testid="field-error-email" className="mt-1 block text-xs text-red-600">
                {fieldErrors.email}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">密码</span>
            <Input
              name="password"
              type="password"
              required
              minLength={isRegister ? 8 : undefined}
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder={isRegister ? "至少 8 位字符" : "请输入密码"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError("password");
              }}
              invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "auth-password-error" : undefined}
              className="mt-1.5 rounded-xl px-3.5 py-2.5 text-slate-800 shadow-[var(--shadow-sm)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
            />
            {fieldErrors.password ? (
              <span id="auth-password-error" data-testid="field-error-password" className="mt-1 block text-xs text-red-600">
                {fieldErrors.password}
              </span>
            ) : null}
          </label>

          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="form-error">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            variant="primary"
            className="w-full rounded-xl px-4 py-2.5 font-semibold shadow-[var(--shadow-sm)] transition hover:-translate-y-px hover:shadow-[var(--shadow-md)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {submitting ? "提交中…" : isRegister ? "注 册" : "登 录"}
          </Button>
        </form>

        {/* 微信扫码块（AT-18.3.3 / D4 裁决 2026-09-30）：未启用时整块隐藏、不渲染任何
            占位元素；/api/v1/wechat/qrcode 探测保留，开通（enabled:true）即自动回显 */}
        {wechatEnabled && (
          <div className="mt-6 border-t border-slate-100 pt-5" data-testid="wechat-block">
            <div className="flex items-center gap-4">
              <div
                aria-label="微信扫码二维码占位"
                className="flex size-24 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs text-slate-400"
              >
                二维码
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">微信扫码登录</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 页脚链接：登录/注册互切 */}
      <p className="mt-5 text-center text-sm text-slate-500">
        {isRegister ? (
          <>
            已有账号？
            <Link href="/login" className="font-medium text-primary hover:underline">
              直接登录
            </Link>
          </>
        ) : (
          <>
            还没有账号？
            <Link href="/register" className="font-medium text-primary hover:underline">
              立即注册
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
