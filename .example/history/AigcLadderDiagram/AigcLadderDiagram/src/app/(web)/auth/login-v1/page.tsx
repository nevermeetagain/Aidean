"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { X, Mail, Lock, Eye, EyeOff, Github, Chrome } from "lucide-react";

export default function LoginV1() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (tab === "login") return email.trim().length > 3 && password.length >= 1;
    return email.trim().length > 3 && password.length >= 6;
  }, [tab, email, password]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      const endpoint = tab === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
      const body = tab === "login" ? { email, password } : { email, password, nickname: nickname.trim() || undefined };
      const res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) { setError(String(data?.error || "操作失败")); return; }
      router.push("/");
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100">
        <Link href="/" className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <X className="h-5 w-5" />
        </Link>

        <div className="mb-6 text-center">
          <img src="/images/icons/logo.svg" alt="Aidean" className="mx-auto h-10 w-10 mb-3" />
          <h2 className="text-xl font-bold text-slate-900">欢迎来到 Aidean</h2>
          <p className="mt-1 text-sm text-slate-500">AI 模型天梯图平台</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            <button type="button" onClick={() => { setTab("login"); setError(null); }} className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${tab === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>登录</button>
            <button type="button" onClick={() => { setTab("register"); setError(null); }} className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${tab === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>注册</button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">邮箱</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="name@example.com" className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all" />
            </div>
          </div>

          {tab === "register" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">昵称（可选）</label>
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} type="text" placeholder="你的昵称" className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all" />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPwd ? "text" : "password"} autoComplete={tab === "login" ? "current-password" : "new-password"} placeholder={tab === "register" ? "至少 6 位" : "输入密码"} className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

          <button type="submit" disabled={!canSubmit || loading} className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all">
            {loading ? "处理中..." : tab === "login" ? "登录" : "注册"}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400">或使用第三方登录</span></div>
          </div>
          <div className="flex justify-center gap-4">
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors" title="GitHub"><Github className="h-5 w-5" /></button>
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors" title="Google"><Chrome className="h-5 w-5" /></button>
          </div>
        </form>
      </div>
    </div>
  );
}
