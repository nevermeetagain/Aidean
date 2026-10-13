"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Chrome, ChevronDown, Eye, EyeOff, MessageCircle, QrCode } from "lucide-react";

import { useSiteLang } from "@/lib/siteLang";
import { useSiteTheme } from "@/lib/siteTheme";

export type AuthMode = "login" | "register";

export function SiteAuthModal({
  open,
  initialMode = "login",
  onClose,
}: {
  open: boolean;
  initialMode?: AuthMode;
  onClose: () => void;
}) {
  const { theme } = useSiteTheme();
  const { lang } = useSiteLang();
  // 强制浅色模式 - 根据需求 v1.6，禁止深色风格
  const isDark = false;

  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authShowPassword, setAuthShowPassword] = useState(false);
  const [authNickname, setAuthNickname] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAuthMode(initialMode);
    setAuthError(null);
    setAuthLoading(false);
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const TEXT = useMemo(() => {
    const zh = {
      title: "欢迎使用 Aidean",
      login: "账号登录",
      register: "账号注册",
      email: "邮箱",
      password: "密码",
      nickname: "昵称（可选）",
      forgot: "忘记密码？",
      otherWays: "其他方式登录",
      toLogin: "去登录",
      toRegister: "去注册",
      close: "关闭",
      submitLogin: "登录",
      submitRegister: "注册",
      wechat: "微信扫码",
      google: "Google",
      qq: "QQ",
      subtitle: "使用邮箱登录/注册，解锁收藏与对比能力。",
    };
    const en = {
      title: "Welcome to Aidean",
      login: "Sign in",
      register: "Sign up",
      email: "Email",
      password: "Password",
      nickname: "Nickname (optional)",
      forgot: "Forgot password?",
      otherWays: "Other methods",
      toLogin: "Sign in",
      toRegister: "Sign up",
      close: "Close",
      submitLogin: "Sign in",
      submitRegister: "Create account",
      wechat: "WeChat",
      google: "Google",
      qq: "QQ",
      subtitle: "Sign in/up with email to unlock favorites and compare.",
    };
    const ja = {
      title: "Aidean へようこそ",
      login: "ログイン",
      register: "登録",
      email: "メール",
      password: "パスワード",
      nickname: "ニックネーム（任意）",
      forgot: "パスワードを忘れた",
      otherWays: "他の方法",
      toLogin: "ログイン",
      toRegister: "登録",
      close: "閉じる",
      submitLogin: "ログイン",
      submitRegister: "登録",
      wechat: "WeChat",
      google: "Google",
      qq: "QQ",
      subtitle: "メールでログイン/登録して機能を解放。",
    };

    if (lang === "en") return en;
    if (lang === "ja") return ja;
    return zh;
  }, [lang]);

  const classPrimarySolid = `${theme.buttonBg} ${theme.buttonText} ${theme.buttonHover} shadow-sm ring-1 ${theme.selectRing}`;

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={() => onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={TEXT.title}
    >
      <div
        className={`w-full max-w-[420px] rounded-2xl p-5 shadow-2xl ring-1 ${
          isDark ? "bg-slate-950 ring-slate-800" : "bg-white ring-slate-200"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={`text-base font-bold leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>{TEXT.title}</div>
            <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{TEXT.subtitle}</div>
          </div>
          <button
            type="button"
            onClick={() => onClose()}
            className={`shrink-0 rounded-lg px-2 py-1 text-xs ring-1 transition-colors ${
              isDark ? "ring-slate-800 text-slate-300 hover:bg-white/5" : "ring-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {TEXT.close}
          </button>
        </div>

        <div className="mt-4">
          <div
            className={`relative grid grid-cols-2 rounded-xl ring-1 ${
              isDark ? "bg-slate-900/40 ring-slate-800" : "bg-slate-50 ring-slate-200"
            }`}
            role="tablist"
            aria-label="auth tabs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={authMode === "login"}
              onClick={() => {
                setAuthError(null);
                setAuthMode("login");
              }}
              className={`relative h-11 rounded-xl text-sm font-semibold transition-colors ${
                authMode === "login"
                  ? isDark
                    ? "text-white"
                    : "text-slate-900"
                  : isDark
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {TEXT.login}
              {authMode === "login" && <span className={`absolute bottom-1 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full ${theme.navIndicator}`} />}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authMode === "register"}
              onClick={() => {
                setAuthError(null);
                setAuthMode("register");
              }}
              className={`relative h-11 rounded-xl text-sm font-semibold transition-colors ${
                authMode === "register"
                  ? isDark
                    ? "text-white"
                    : "text-slate-900"
                  : isDark
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {TEXT.register}
              {authMode === "register" && <span className={`absolute bottom-1 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full ${theme.navIndicator}`} />}
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <div className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>{TEXT.email}</div>
            <input
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              className={`h-11 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 ${theme.primaryRing} ${
                isDark
                  ? "border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-600"
                  : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white"
              }`}
            />
          </div>

          {authMode === "register" && (
            <div className="space-y-1">
              <div className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>{TEXT.nickname}</div>
              <input
                value={authNickname}
                onChange={(e) => setAuthNickname(e.target.value)}
                type="text"
                autoComplete="nickname"
                placeholder={lang === "en" ? "Optional" : "可选"}
                className={`h-11 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 ${theme.primaryRing} ${
                  isDark
                    ? "border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-600"
                    : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white"
                }`}
              />
            </div>
          )}

          <div className="space-y-1">
            <div className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>{TEXT.password}</div>
            <div className="relative">
              <input
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                type={authShowPassword ? "text" : "password"}
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                placeholder={authMode === "register" ? (lang === "en" ? "At least 6 chars" : "至少 6 位") : (lang === "en" ? "Enter password" : "请输入密码")}
                className={`h-11 w-full rounded-xl border px-3 pr-11 text-sm focus:outline-none focus:ring-2 ${theme.primaryRing} ${
                  isDark
                    ? "border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-600"
                    : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white"
                }`}
              />
              <button
                type="button"
                onClick={() => setAuthShowPassword((v) => !v)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1 transition-colors ${
                  isDark
                    ? "ring-slate-800 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    : "ring-slate-200 text-slate-400 hover:bg-white hover:text-slate-600"
                }`}
                aria-label={authShowPassword ? "隐藏密码" : "显示密码"}
              >
                {authShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            className={`mt-1 inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${classPrimarySolid}`}
            disabled={authLoading}
            onClick={() => {
              if (authLoading) return;
              setAuthError(`${authMode === "login" ? TEXT.submitLogin : TEXT.submitRegister}：仅 UI 占位，暂未接入后端`);
            }}
          >
            {authLoading ? "..." : authMode === "login" ? TEXT.submitLogin : TEXT.submitRegister}
          </button>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setAuthError(lang === "en" ? "Password reset not available" : "暂未开放找回密码功能")}
              className={`${isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"}`}
            >
              {TEXT.forgot}
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthError(null);
                setAuthMode(authMode === "login" ? "register" : "login");
              }}
              className={`font-semibold ${theme.primaryText}`}
            >
              {authMode === "login" ? TEXT.toRegister : TEXT.toLogin}
            </button>
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-3">
              <div className={`h-px flex-1 ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
              <div className={`text-[11px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>{TEXT.otherWays}</div>
              <div className={`h-px flex-1 ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAuthError(lang === "en" ? "WeChat: UI only" : "微信扫码登录：仅 UI 占位，暂未接入")}
                className={`group inline-flex h-11 items-center justify-center gap-2 rounded-xl ring-1 transition-colors ${
                  isDark
                    ? "bg-slate-900 text-slate-200 ring-slate-800 hover:bg-slate-900/70"
                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <QrCode className={`h-4 w-4 ${theme.primaryText}`} />
                <span className="text-xs font-semibold">{TEXT.wechat}</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthError(lang === "en" ? "Google: UI only" : "Google 登录：仅 UI 占位，暂未接入")}
                className={`group inline-flex h-11 items-center justify-center gap-2 rounded-xl ring-1 transition-colors ${
                  isDark
                    ? "bg-slate-900 text-slate-200 ring-slate-800 hover:bg-slate-900/70"
                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <Chrome className="h-4 w-4 text-slate-500 group-hover:text-slate-700" />
                <span className="text-xs font-semibold">{TEXT.google}</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthError(lang === "en" ? "QQ: UI only" : "QQ 登录：仅 UI 占位，暂未接入")}
                className={`group inline-flex h-11 items-center justify-center gap-2 rounded-xl ring-1 transition-colors ${
                  isDark
                    ? "bg-slate-900 text-slate-200 ring-slate-800 hover:bg-slate-900/70"
                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <MessageCircle className="h-4 w-4 text-slate-500 group-hover:text-slate-700" />
                <span className="text-xs font-semibold">{TEXT.qq}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {authError && <div className="text-sm text-red-600">{authError}</div>}
        </div>
      </div>
    </div>,
    document.body
  );
}
