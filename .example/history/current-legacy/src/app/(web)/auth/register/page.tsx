"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { BasicPage } from "@/components/common/BasicPage";
import { AuthLogo } from "@/components/auth/AuthLogo";

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.trim().length > 3 && password.length >= 6, [email, password]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, nickname: nickname.trim() || undefined }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(String(data?.error || "注册失败"));
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <AuthLogo />
      </div>
      <BasicPage title="注册" description="使用邮箱与密码创建账号。" />

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
          <div className="text-xs font-semibold text-slate-600">昵称（可选）</div>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            type="text"
            autoComplete="nickname"
            placeholder="例如：Aidean"
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-600">密码</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
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
          {loading ? "注册中..." : "注册"}
        </button>
      </form>

      <div className="text-sm">
        已有账号？{" "}
        <Link className="underline" href="/auth/login">
          去登录
        </Link>
      </div>
    </div>
  );
}
