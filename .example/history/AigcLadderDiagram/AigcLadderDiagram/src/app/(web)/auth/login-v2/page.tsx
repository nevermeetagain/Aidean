"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { X, Mail, Lock, User, Eye, EyeOff, Github, Chrome, Rocket } from "lucide-react";

export default function LoginV2() {
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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left - Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -left-20 h-[400px] w-[400px] rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-white/20 blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3">
            <img src="/images/icons/logo.svg" alt="Aidean" className="h-10 w-10 brightness-0 invert" />
            <span className="text-2xl font-bold text-white">Aidean</span>
          </div>
        </div>
        <div className="relative space-y-6">
          <h1 className="text-4xl font-black text-white leading-tight">发现最佳<br />AI 模型</h1>
          <p className="text-lg text-white/70 max-w-md">全面评测、多维度对比，助你快速找到最适合的 AI 解决方案</p>
          <div className="flex gap-6 text-white/60 text-sm">
            <div><span className="text-2xl font-bold text-white block">200+</span>覆盖模型</div>
            <div><span className="text-2xl font-bold text-white block">10万+</span>可用工具</div>
            <div><span className="text-2xl font-bold text-white block">1000+</span>解决方案</div>
          </div>
        </div>
        <div className="relative text-sm text-white/40">&copy; {new Date().getFullYear()} Aidean. All rights reserved.</div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <Link href="/" className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors z-10">
          <X className="h-5 w-5" />
        </Link>
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden text-center">
            <img src="/images/icons/logo.svg" alt="Aidean" className="mx-auto h-10 w-10 mb-3" />
            <h2 className="text-xl font-bold text-slate-900">Aidean</h2>
          </div>
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-slate-900">{tab === "login" ? "欢迎回来" : "创建账号"}</h2>
            <p className="mt-1 text-sm text-slate-500">{tab === "login" ? "登录以继续使用所有功能" : "注册以体验AI模型天梯图"}</p>
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
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="name@example.com" className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all" />
              </div>
            </div>

            {tab === "register" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">昵称（可选）</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input value={nickname} onChange={(e) => setNickname(e.target.value)} type="text" placeholder="你的昵称" className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all" />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPwd ? "text" : "password"} autoComplete={tab === "login" ? "current-password" : "new-password"} placeholder={tab === "register" ? "至少 6 位" : "输入密码"} className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

            <button type="submit" disabled={!canSubmit || loading} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all">
              <Rocket className="h-4 w-4" />
              {loading ? "处理中..." : tab === "login" ? "登录" : "创建账号"}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-slate-50 px-3 text-slate-400">第三方登录</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 transition-colors"><Github className="h-4 w-4" />GitHub</button>
              <button type="button" className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 transition-colors"><Chrome className="h-4 w-4" />Google</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
