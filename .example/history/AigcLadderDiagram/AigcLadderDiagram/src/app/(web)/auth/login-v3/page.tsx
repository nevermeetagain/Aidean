"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { X, Mail, Lock, User, Eye, EyeOff, Github, Chrome, Sparkles } from "lucide-react";

export default function LoginV3() {
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
    <div className="relative min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 flex items-center justify-center p-4 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-100/50 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/3 w-[300px] h-[300px] bg-pink-100/30 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Link href="/" className="absolute -right-2 -top-2 rounded-full bg-white p-2 text-slate-400 hover:text-slate-600 shadow-lg ring-1 ring-slate-100 transition-colors z-10">
          <X className="h-4 w-4" />
        </Link>

        {/* Logo badge */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm px-5 py-2.5 shadow-sm ring-1 ring-slate-200/50 mb-4">
            <img src="/images/icons/logo.svg" alt="Aidean" className="h-6 w-6" />
            <span className="text-sm font-bold text-slate-800">Aidean</span>
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{tab === "login" ? "登录账号" : "注册新账号"}</h2>
          <p className="mt-2 text-sm text-slate-500">开启 AI 模型探索之旅</p>
        </div>

        {/* Card with glassmorphism */}
        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-7 shadow-2xl shadow-slate-200/60 ring-1 ring-white/80">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex gap-1 rounded-xl bg-slate-100/80 p-1">
              <button type="button" onClick={() => { setTab("login"); setError(null); }} className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${tab === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>登录</button>
              <button type="button" onClick={() => { setTab("register"); setError(null); }} className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${tab === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>注册</button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="name@example.com" className="h-12 w-full rounded-xl border-0 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-200 shadow-sm transition-all" />
              </div>
            </div>

            {tab === "register" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">昵称（可选）</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input value={nickname} onChange={(e) => setNickname(e.target.value)} type="text" placeholder="你的昵称" className="h-12 w-full rounded-xl border-0 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-200 shadow-sm transition-all" />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPwd ? "text" : "password"} autoComplete={tab === "login" ? "current-password" : "new-password"} placeholder={tab === "register" ? "至少 6 位" : "输入密码"} className="h-12 w-full rounded-xl border-0 bg-white pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-200 shadow-sm transition-all" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50/80 px-3 py-2 rounded-lg">{error}</div>}

            <button type="submit" disabled={!canSubmit || loading} className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 text-sm font-bold text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 hover:-translate-y-0.5 disabled:opacity-50 transition-all">
              {loading ? "处理中..." : tab === "login" ? "登录" : "注册"}
            </button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200/60" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white/70 px-3 text-slate-400 backdrop-blur-sm">其他方式</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-medium text-slate-600 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"><Github className="h-4 w-4" />GitHub</button>
              <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-medium text-slate-600 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"><Chrome className="h-4 w-4" />Google</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
