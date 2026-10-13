"use client";

import { useMemo } from "react";
import { useApi, publicApiKeys } from "@/hooks/useApi";
import Link from "next/link";
import { Rocket, BarChart3, GitCompare, FlaskConical, Cpu, ArrowDown, Layers, Zap, Sparkles, Compass } from "lucide-react";

export default function HomeC() {
  const { data: statsData } = useApi<{
    models: { total: number; active: number };
    tools: { total: number; skills: number; mcps: number; agents: number };
  }>(publicApiKeys.stats());

  const stats = useMemo(() => ({
    modelCount: statsData?.models?.total ?? 0,
    toolCount: statsData?.tools?.total ?? 0,
  }), [statsData]);

  const fmtCount = (n: number, fallback: string) => (n > 0 ? `${n.toLocaleString()}+` : fallback);

  return (
    <div className="min-h-screen">
      {/* SCREEN 1: Full-screen dark Hero */}
      <section className="relative flex h-screen flex-col items-center justify-center bg-slate-950 text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-indigo-600/20 blur-[120px]" />
          <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-[120px]" />
        </div>
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/60 backdrop-blur-sm">
            <Sparkles className="h-4 w-4" /> Aidean
          </div>
          <h1 className="mt-8 text-6xl font-bold tracking-tight sm:text-7xl lg:text-8xl">
            发现最佳<br />
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">AI 模型</span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-lg text-white/50">
            全面评测、多维度对比，助你快速找到最适合的 AI 解决方案
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/models" className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-slate-950 transition-all hover:bg-white/90">
              <Rocket className="h-4 w-4" /> 立即体验
            </Link>
            <Link href="/compare" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-4 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10">
              进入对比
            </Link>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ArrowDown className="h-6 w-6 text-white/30" />
        </div>
      </section>

      {/* SCREEN 2: Full-screen stats */}
      <section className="flex h-screen items-center bg-white">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            <FullScreenStat value={fmtCount(stats.modelCount, "200+")} label="覆盖模型" icon={<Layers className="h-8 w-8" />} />
            <FullScreenStat value={fmtCount(stats.toolCount, "10万+")} label="可用工具" icon={<Zap className="h-8 w-8" />} />
            <FullScreenStat value="1000+" label="解决方案" icon={<FlaskConical className="h-8 w-8" />} />
            <FullScreenStat value="4维" label="评分体系" icon={<Compass className="h-8 w-8" />} />
          </div>
        </div>
      </section>
      {/* SCREEN 3 */}
      <section className="flex h-screen items-center bg-slate-50">
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <h2 className="mb-16 text-center text-3xl font-bold tracking-tight text-slate-900">核心功能</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <ImmersiveCard icon={<BarChart3 className="h-8 w-8" />} title="模型天梯图" desc="性能 性价比 开源 移动端" href="/models" color="bg-gradient-to-br from-indigo-500 to-violet-600" />
            <ImmersiveCard icon={<GitCompare className="h-8 w-8" />} title="对比评测" desc="多维度直观比较" href="/compare" color="bg-gradient-to-br from-amber-500 to-orange-500" />
            <ImmersiveCard icon={<FlaskConical className="h-8 w-8" />} title="解决方案" desc="工具应用一键直达" href="/products/solutions" color="bg-gradient-to-br from-emerald-500 to-teal-500" />
            <ImmersiveCard icon={<Cpu className="h-8 w-8" />} title="AI 资源" desc="Agent MCP Skills" href="/resources" color="bg-gradient-to-br from-rose-500 to-pink-500" />
          </div>
        </div>
      </section>

      {/* SCREEN 4 */}
      <section className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">更可信 更可比 更可用</h2>
          <p className="mx-auto mt-6 max-w-lg text-lg text-white/50">加入 Aidean，开启你的 AI 模型选型之旅</p>
          <Link href="/models" className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-slate-950 transition-all hover:bg-white/90">
            <Rocket className="h-4 w-4" /> 立即开始
          </Link>
        </div>
      </section>
    </div>
  );
}

function FullScreenStat({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">{icon}</div>
      <div className="mt-6 text-5xl font-bold tracking-tight text-slate-900">{value}</div>
      <div className="mt-2 text-sm font-medium text-slate-500">{label}</div>
    </div>
  );
}

function ImmersiveCard({ icon, title, desc, href, color }: { icon: React.ReactNode; title: string; desc: string; href: string; color: string }) {
  return (
    <Link href={href} className={"group flex flex-col items-center rounded-3xl p-8 text-white transition-all hover:shadow-xl hover:-translate-y-1 " + color}>
      <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">{icon}</div>
      <div className="mt-6 text-xl font-bold">{title}</div>
      <div className="mt-2 text-sm text-white/80">{desc}</div>
    </Link>
  );
}
