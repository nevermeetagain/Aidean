"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { BasicPage } from "@/components/common/BasicPage";

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.trim().length > 3 && password.length >= 1, [email, password]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(String(data?.error || "登录失败"));
        return;
      }
      router.push("/demo/demo5");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <BasicPage title="登录" description="使用邮箱与密码登录。" />

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-600">邮箱</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-600">密码</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            placeholder="至少 6 位"
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "登录中..." : "登录"}
        </button>

        <div className="text-xs text-slate-500">
          个人项目可用的第三方登录：
          <div className="mt-1 space-y-1">
            <div>GitHub / Google：可用（需创建 OAuth 应用并配置环境变量，后续接入绑定）。</div>
            <div>微信：网页扫码登录通常需要微信开放平台企业资质；但“公众号内网页授权”可用于微信内打开的场景。</div>
          </div>
        </div>
      </form>

      <div className="text-sm">
        还没有账号？{" "}
        <Link className="underline" href="/auth/register">
          去注册
        </Link>
      </div>
    </div>
  );
}
