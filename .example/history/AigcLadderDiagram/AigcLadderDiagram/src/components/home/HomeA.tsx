"use client";

import { useMemo } from "react";
import { useApi, publicApiKeys } from "@/hooks/useApi";
import { HomeCarousel } from "@/components/home/HomeCarousel";
import Link from "next/link";
import { Rocket, BarChart3, GitCompare, FlaskConical, Cpu, ArrowUpRight, Layers, Zap, Sparkles, Compass, BookOpen } from "lucide-react";

const CAROUSEL_SLIDES = [
  { src: "/images/banners/reference1.webp", alt: "", href: "/aidean" },
  { src: "/images/banners/reference2.webp", alt: "", href: "http://36.134.158.50:10001/", external: true },
  { src: "/images/banners/reference3.webp", alt: "", href: "/sphere/ai-employee" },
  { src: "/images/banners/reference4.webp", alt: "", href: "/space/skills" },
];

export default function HomeA() {
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
    <div className="min-h-screen bg-slate-50">
      {/* BENTO GRID */}
      <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:grid-rows-6">
          {/* 宸︿笂锛氫富鏍囬 */}
          <div className="lg:col-span-5 lg:row-span-4">
            <div className="flex h-full flex-col justify-center rounded-3xl bg-slate-900 p-8 text-white lg:p-12">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Aidean 澶╂鍥惧钩鍙?              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">鍙戠幇<br />鏈€浣?AI 妯″瀷</h1>
              <p className="mt-4 max-w-sm text-lg leading-relaxed text-slate-400">
                鍏ㄩ潰璇勬祴銆佸缁村害瀵规瘮锛屽姪浣犲揩閫熸壘鍒版渶閫傚悎鐨?AI 瑙ｅ喅鏂规
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/aidean" className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-all hover:bg-slate-100">
                  <Rocket className="h-4 w-4" /> 绔嬪嵆浣撻獙
                </Link>
                <Link href="/compare" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm transition-all hover:bg-white/20">
                  杩涘叆瀵规瘮
                </Link>
              </div>
            </div>
          </div>

          {/* 鍙充笂锛氳疆鎾浘 */}
          <div className="lg:col-span-7 lg:row-span-4">
            <div className="h-full overflow-hidden rounded-3xl">
              <HomeCarousel slides={CAROUSEL_SLIDES} autoPlay autoPlayInterval={5000} className="h-full" />
            </div>
          </div>

          {/* 宸︿笅锛氭ā鍨嬫暟閲?*/}
          <div className="lg:col-span-3 lg:row-span-2">
            <div className="flex h-full flex-col justify-center rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Layers className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-slate-500">瑕嗙洊妯″瀷</span>
              </div>
              <div className="mt-3 text-4xl font-bold tracking-tight text-slate-900">{fmtCount(stats.modelCount, "200+")}</div>
              <div className="mt-1 text-xs text-slate-400">鎸佺画鏇存柊</div>
            </div>
          </div>

          {/* 涓笅锛氬彲鐢ㄥ伐鍏?*/}
          <div className="lg:col-span-3 lg:row-span-2">
            <div className="flex h-full flex-col justify-center rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Zap className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-slate-500">鍙敤宸ュ叿</span>
              </div>
              <div className="mt-3 text-4xl font-bold tracking-tight text-slate-900">{fmtCount(stats.toolCount, "10涓?")}</div>
              <div className="mt-1 text-xs text-slate-400">AI 生态聚合</div>
            </div>
          </div>

          {/* 鍙充笅1锛氬ぉ姊浘鍏ュ彛 */}
          <div className="lg:col-span-3 lg:row-span-2">
            <Link href="/aidean" className="group flex h-full flex-col justify-between rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 p-6 text-white transition-all hover:shadow-lg hover:shadow-indigo-200">
              <div className="flex items-center justify-between">
                <BarChart3 className="h-6 w-6" />
                <ArrowUpRight className="h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
              <div>
                <div className="text-lg font-semibold">模型天梯图</div>
                <div className="mt-1 text-sm text-indigo-100">性能 · 性价比 · 开源 · 移动端</div>
              </div>
            </Link>
          </div>

          {/* 鍙充笅2锛氬姣斿叆鍙?*/}
          <div className="lg:col-span-3 lg:row-span-2">
            <Link href="/compare" className="group flex h-full flex-col justify-between rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white transition-all hover:shadow-lg hover:shadow-amber-200">
              <div className="flex items-center justify-between">
                <GitCompare className="h-6 w-6" />
                <ArrowUpRight className="h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
              <div>
                <div className="text-lg font-semibold">瀵规瘮璇勬祴</div>
                <div className="mt-1 text-sm text-amber-100">多维度直观比较</div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 鍔熻兘鍏ュ彛 */}
      <section className="border-t border-slate-100 bg-white py-20">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">鎺㈢储鏇村</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard icon={<FlaskConical className="h-5 w-5" />} title="解决方案" desc="工具应用一键直达" href="/sphere/solutions" color="bg-sky-50 text-sky-600" />
            <FeatureCard icon={<Cpu className="h-5 w-5" />} title="AI 璧勬簮" desc="Agent MCP Skills" href="/space" color="bg-rose-50 text-rose-600" />
            <FeatureCard icon={<Compass className="h-5 w-5" />} title="鍏ラ棬鏁欑▼" desc="蹇€熺湅鎳傚ぉ姊浘" href="/docs/help" color="bg-teal-50 text-teal-600" />
            <FeatureCard icon={<BookOpen className="h-5 w-5" />} title="排行榜解读" desc="每周榜单分析" href="/space/news" color="bg-purple-50 text-purple-600" />
          </div>
        </div>
      </section>

      {/* 涓轰粈涔堥€夋嫨鎴戜滑 */}
      <section className="bg-slate-900 py-24 text-white">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">鏇村彲淇°€佹洿鍙瘮銆佹洿鍙敤</h2>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-8 lg:grid-cols-4">
            <WhyItem value="1,248+" label="瑕嗙洊妯″瀷" />
            <WhyItem value="10x" label="瀵规瘮鏁堢巼" />
            <WhyItem value="4 维" label="评分体系" />
            <WhyItem value="鍏嶈垂/浠樿垂" label="閫忔槑杈圭晫" />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc, href, color }: { icon: React.ReactNode; title: string; desc: string; href: string; color: string }) {
  return (
    <Link href={href} className="group flex items-start gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition-all hover:-translate-y-1 hover:shadow-md">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>{icon}</div>
      <div>
        <div className="font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-500">{desc}</div>
      </div>
    </Link>
  );
}

function WhyItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-2 text-sm text-slate-400">{label}</div>
    </div>
  );
}

