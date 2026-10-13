"use client";

import { useMemo, useState, useEffect } from "react";
import { useApi, publicApiKeys } from "@/hooks/useApi";
import { HomeCarousel } from "@/components/home/HomeCarousel";
import Link from "next/link";
import {
  Rocket, BarChart3, GitCompare, FlaskConical, Cpu, ArrowRight,
  Sparkles, Layers, Award, Zap, Target, RefreshCw, MousePointer,
  BookOpen, Shield, Globe, Heart, MessageCircle,
  ChevronRight, Terminal, Database, HardHat, Leaf, Droplets,
  Sun, Wind, Flower2, TreePine,
} from "lucide-react";

const CAROUSEL_SLIDES = [
  { src: "/images/banners/reference1.webp", alt: "AI模型性能天梯图", href: "/aidean" },
  { src: "/images/banners/reference2.webp", alt: "模型评测体系", href: "http://36.134.158.50:10001/", external: true },
  { src: "/images/banners/reference3.webp", alt: "数字分身", href: "/sphere/ai-employee" },
  { src: "/images/banners/reference4.webp", alt: "Skill技能", href: "/space/skills" },
];

interface HomeStats { modelCount: number; toolCount: number; solutionCount: number; appCount: number; }

function TypewriterText({ text, className = "" }: { text: string; className?: string }) {
  const [display, setDisplay] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => { setDisplay(text.slice(0, i)); i++; if (i > text.length) clearInterval(timer); }, 80);
    return () => clearInterval(timer);
  }, [text]);
  useEffect(() => { const blink = setInterval(() => setShowCursor((v) => !v), 530); return () => clearInterval(blink); }, []);
  return (
    <span className={`font-mono ${className}`}>
      {display}
      <span className={`inline-block w-[3px] h-[1em] bg-cyan-400 ml-1 align-middle ${showCursor ? "opacity-100" : "opacity-0"}`} />
    </span>
  );
}

export default function HomeV7() {
  const { data: statsData } = useApi<{
    models: { total: number; active: number };
    users: { total: number };
    tools: { total: number; skills: number; mcps: number; agents: number };
  }>(publicApiKeys.stats());

  const stats: HomeStats = useMemo(() => ({
    modelCount: statsData?.models?.total ?? 0,
    toolCount: statsData?.tools?.total ?? 0,
    solutionCount: statsData?.models?.active ?? 0,
    appCount: (statsData?.tools?.skills ?? 0) + (statsData?.tools?.mcps ?? 0) + (statsData?.tools?.agents ?? 0),
  }), [statsData]);

  const fmtCount = (n: number, fallback: string) => (n > 0 ? `${n.toLocaleString()}+` : fallback);

  return (
    <div className="flex flex-col bg-slate-900">
      {/* ====== Hero ====== */}
      <section className="relative w-full overflow-hidden bg-slate-900">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 h-[500px] w-[500px] rounded-full bg-pink-500/10 blur-3xl" />
          <div className="absolute top-1/2 -right-20 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-[300px] w-[300px] rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }} />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[0.6fr_1fr]">
            <div className="flex flex-col items-start">
              <div className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500/20 to-cyan-500/20 px-4 py-1.5 text-sm font-medium text-pink-300 ring-1 ring-pink-500/30">
                <Sparkles className="h-4 w-4" />Aidean 三位一体 AI 平台
              </div>
              <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                <TypewriterText text="探索 AI 的无限可能" />
              </h1>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-slate-400">
                Aidean 天梯图、AideanSpace 工具生态、Sphere 知识大脑，助你快速构建 AI 生产力。
              </p>
              <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
                <Link href="/aidean" className="group rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-500/20 to-rose-500/10 p-4 text-left text-white transition-all hover:-translate-y-1 hover:border-pink-400/50 hover:bg-pink-500/20">
                  <div className="flex items-center gap-2 text-sm font-bold text-pink-300">
                    <Rocket className="h-4 w-4" />Aidean
                  </div>
                  <div className="mt-2 text-sm text-slate-300">模型榜单与选型决策</div>
                </Link>
                <Link href="/space" className="group rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 p-4 text-left text-white transition-all hover:-translate-y-1 hover:border-emerald-400/50 hover:bg-emerald-500/20">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                    <Terminal className="h-4 w-4" />AideanSpace
                  </div>
                  <div className="mt-2 text-sm text-slate-300">工具发现、筛选与试用</div>
                </Link>
                <Link href="/sphere" className="group rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/15 to-blue-500/10 p-4 text-left text-white transition-all hover:-translate-y-1 hover:border-cyan-400/50 hover:bg-cyan-500/20">
                  <div className="flex items-center gap-2 text-sm font-bold text-cyan-300">
                    <Database className="h-4 w-4" />Sphere
                  </div>
                  <div className="mt-2 text-sm text-slate-300">知识库、数字分身与咨询</div>
                </Link>
              </div>
            </div>
            <div className="min-w-0">
              <HomeCarousel slides={CAROUSEL_SLIDES} autoPlay autoPlayInterval={5000} className="rounded-2xl shadow-2xl shadow-black/50" />
            </div>
          </div>
        </div>
      </section>

      {/* ====== Stats ====== */}
      <section className="relative z-10 -mt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500/20 via-cyan-500/20 to-amber-500/20 p-px lg:grid-cols-4">
            <StatItemV7 value={fmtCount(stats.modelCount, "200+")} label="覆盖模型" />
            <StatItemV7 value={fmtCount(stats.toolCount, "10万+")} label="可用工具" />
            <StatItemV7 value={fmtCount(stats.solutionCount, "1000+")} label="解决方案" />
            <StatItemV7 value={fmtCount(stats.appCount, "3+")} label="专属应用" />
          </div>
        </div>
      </section>

      {/* ====== 核心功能矩阵 ====== */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400 ring-1 ring-cyan-500/30">
              <Zap className="h-3.5 w-3.5" />核心功能
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">一站式 AI 选型平台</h2>
            <p className="mt-3 text-lg text-slate-400">从天梯图到资源生态，从测评到落地，全链路覆盖</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCardV7 title="Aidean 天梯图" desc="查看大模型性能排名，对比选择最优模型" href="/aidean" icon={<BarChart3 className="h-6 w-6" />} gradient="from-pink-500 to-rose-400" />
            <FeatureCardV7 title="AideanSpace 资源" desc="Agent、MCP、Skills 资源集合，一键试用" href="/space" icon={<Cpu className="h-6 w-6" />} gradient="from-emerald-500 to-teal-400" />
            <FeatureCardV7 title="Sphere 知识库" desc="企业级 RAG 知识库，构建你的数字分身" href="/sphere" icon={<HardHat className="h-6 w-6" />} gradient="from-cyan-500 to-blue-400" />
            <FeatureCardV7 title="对比评测" desc="多维度对比不同模型，找到最适合的方案" href="/compare" icon={<GitCompare className="h-6 w-6" />} gradient="from-amber-500 to-orange-400" />
          </div>
        </div>
      </section>

      {/* ====== 扩展天梯图 ====== */}
      <section className="border-t border-slate-800 bg-slate-900/50 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400 ring-1 ring-purple-500/30">
              <Layers className="h-3.5 w-3.5" />扩展天梯图
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">不止大模型</h2>
            <p className="mt-3 text-lg text-slate-400">Skills、MCP、Agent、API站，全方位工具生态排名</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <LadderCardV7 title="Skills天梯图" desc="按下载量、评分、更新频率排名" href="/ladder/skill" icon={<Terminal className="h-5 w-5" />} color="text-pink-400" border="border-pink-500/30" />
            <LadderCardV7 title="MCP天梯图" desc="按使用量、稳定性、功能丰富度排名" href="/ladder/mcp" icon={<Database className="h-5 w-5" />} color="text-cyan-400" border="border-cyan-500/30" />
            <LadderCardV7 title="Agent天梯图" desc="按活跃度、任务完成率、评分排名" href="/ladder/agent" icon={<HardHat className="h-5 w-5" />} color="text-amber-400" border="border-amber-500/30" />
            <LadderCardV7 title="API站天梯图" desc="按稳定性、速度、价格竞争力排名" href="/ladder/api" icon={<Zap className="h-5 w-5" />} color="text-emerald-400" border="border-emerald-500/30" />
          </div>
        </div>
      </section>

      {/* ====== 内容/案例 ====== */}
      <section className="border-t border-slate-800 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-pink-500/10 px-3 py-1 text-xs font-bold text-pink-400 ring-1 ring-pink-500/30">
                <BookOpen className="h-3.5 w-3.5" />内容 / 案例
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-white">教程、排行榜解读、精选测评</h2>
              <p className="mt-3 max-w-2xl text-lg text-slate-400">从入门到进阶，把怎么看懂天梯图和怎么选模型讲清楚。</p>
            </div>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ContentCardV7 tag="教程" title="如何读懂性能天梯图：先看维度，再看差距" desc="入门指南：理解评分维度、筛选逻辑和自定义排序公式。" href="/docs/help" accent="bg-pink-500" />
            <ContentCardV7 tag="排行榜解读" title="本周 Top5 变化：为什么某模型突然上升" desc="周报形式解读榜单变化，分析模型优势与短板。" href="/space/news" accent="bg-cyan-500" />
            <ContentCardV7 tag="精选测评" title="长文本：5 个模型在 100K 上下文的差异" desc="用统一问题对比多模型回答，直观看差异。" href="/evaluation" accent="bg-amber-500" />
          </div>
        </div>
      </section>

      {/* ====== 专属服务 ====== */}
      <section className="border-t border-slate-800 bg-slate-900/50 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400 ring-1 ring-cyan-500/30">
              <Shield className="h-3.5 w-3.5" />专属服务
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white">为选型与落地而设计</h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ServiceCardV7 title="企业咨询" items={["选型建议与落地路线", "成本评估与预算建议", "评测方案设计"]} icon={<Target className="h-6 w-6" />} gradient="from-pink-500 to-rose-400" />
            <ServiceCardV7 title="私有化/内网" items={["数据与模型更可控", "内网部署与权限", "合规与审计"]} icon={<Shield className="h-6 w-6" />} gradient="from-cyan-500 to-blue-400" />
            <ServiceCardV7 title="定制服务" items={["自定义榜单与指标", "行业场景模板", "专属看板与报表"]} icon={<RefreshCw className="h-6 w-6" />} gradient="from-amber-500 to-orange-400" />
            <ServiceCardV7 title="连接生态" items={["MCP、Skills、Agent 资源聚合", "推荐组合与实践路径", "试用计费与一键配置"]} icon={<MousePointer className="h-6 w-6" />} gradient="from-emerald-500 to-teal-400" />
          </div>
        </div>
      </section>

      {/* ====== 为什么选择我们 ====== */}
      <section className="border-t border-slate-800 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/20">
              <Award className="h-3.5 w-3.5" />为什么选择我们
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white">更可信、更可比、更可用</h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <WhyCardV7 title="覆盖广" value="1,248+" desc="持续更新模型数据" icon={<Globe className="h-5 w-5" />} />
            <WhyCardV7 title="对比快" value="10x" desc="更快扫清差异" icon={<Zap className="h-5 w-5" />} />
            <WhyCardV7 title="规则清" value="4 维" desc="权重可解释" icon={<Layers className="h-5 w-5" />} />
            <WhyCardV7 title="边界明" value="免费/付费" desc="按次扣费透明" icon={<Shield className="h-5 w-5" />} />
          </div>
        </div>
      </section>

      {/* ====== 生态优势 ====== */}
      <section className="border-t border-slate-800 bg-slate-900/50 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30">
              <Leaf className="h-3.5 w-3.5" />生态优势
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white">像自然一样生长</h2>
            <p className="mt-3 text-lg text-slate-400">从发芽到成熟，每一步都有迹可循</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <EcoCardV7 title="统一口径" desc="同一维度、同一展示方式，避免信息噪声。" icon={<Wind className="h-5 w-5" />} phase="发芽期" color="text-emerald-400" />
            <EcoCardV7 title="多维分析" desc="性能、上下文、速度、价格多维度直观对比。" icon={<Droplets className="h-5 w-5" />} phase="成长期" color="text-cyan-400" />
            <EcoCardV7 title="持续更新" desc="模型迭代快，我们用稳定机制保持榜单可用。" icon={<Sun className="h-5 w-5" />} phase="成熟期" color="text-amber-400" />
            <EcoCardV7 title="可操作性强" desc="收藏/对比/纠错/测评入口，形成闭环决策。" icon={<Flower2 className="h-5 w-5" />} phase="收获期" color="text-pink-400" />
          </div>
        </div>
      </section>

      {/* ====== 合作伙伴/生态展示 ====== */}
      <section className="border-t border-slate-800 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/20">
              <TreePine className="h-3.5 w-3.5" />合作伙伴
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white">构建开放的 AI 生态</h2>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
            {["OpenAI", "Anthropic", "Google", "Meta", "DeepSeek", "Alibaba", "Baidu", "Tencent"].map((name) => (
              <div key={name} className="flex h-16 items-center justify-center rounded-xl bg-white/5 px-6 text-sm font-bold text-slate-400 ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-white">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== CTA ====== */}
      <section className="border-t border-slate-800 bg-gradient-to-br from-pink-500/10 via-cyan-500/10 to-amber-500/10 py-20 sm:py-28">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">准备好发现最佳 AI 模型了吗？</h2>
          <p className="mt-4 text-lg text-slate-400">立即体验，开启你的 AI 选型之旅</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/aidean" className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-cyan-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-pink-500/25 transition-all hover:shadow-xl hover:shadow-pink-500/40 hover:-translate-y-0.5">
              <Rocket className="h-5 w-5" />立即体验
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/docs/help" className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-8 py-4 text-base font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm transition-all hover:bg-white/10">
              <BookOpen className="h-5 w-5" />查看文档
            </Link>
          </div>
        </div>
      </section>

      {/* ====== Dock ====== */}
      <V7Dock />
    </div>
  );
}

/* ========== 子组件 ========== */

function StatItemV7({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center bg-white py-8 text-center">
      <div className="text-3xl font-black tracking-tight text-slate-900">{value}</div>
      <div className="mt-2 text-sm font-semibold text-slate-500">{label}</div>
    </div>
  );
}

function FeatureCardV7({ title, desc, href, icon, gradient }: { title: string; desc: string; href: string; icon: React.ReactNode; gradient: string }) {
  return (
    <Link href={href} className="group relative flex flex-col rounded-2xl bg-slate-800/50 p-6 shadow-sm ring-1 ring-slate-700 transition-all hover:-translate-y-2 hover:shadow-2xl hover:bg-slate-800">
      <div className={`absolute left-0 right-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${gradient}`} />
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg mb-4`}>
        {icon}
      </div>
      <h3 className="mt-2 text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{desc}</p>
      <div className="mt-4 inline-flex items-center text-sm font-bold text-slate-300 transition-colors group-hover:text-pink-400">
        立即查看<ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function LadderCardV7({ title, desc, href, icon, color, border }: { title: string; desc: string; href: string; icon: React.ReactNode; color: string; border: string }) {
  return (
    <Link href={href} className={`group block rounded-2xl bg-slate-800/50 p-6 shadow-sm ring-1 ring-slate-700 transition-all hover:-translate-y-1 hover:bg-slate-800 ${border.replace("border-", "hover:ring-")}`}>
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 ${color} mb-3`}>
        {icon}
      </div>
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{desc}</p>
      <div className="mt-3 inline-flex items-center text-sm font-medium text-slate-300 transition-colors group-hover:text-white">
        立即查看<ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function ContentCardV7({ tag, title, desc, href, accent }: { tag: string; title: string; desc: string; href: string; accent: string }) {
  return (
    <Link href={href} className="group relative flex flex-col rounded-2xl bg-slate-800/50 p-6 shadow-sm ring-1 ring-slate-700 transition-all hover:-translate-y-2 hover:shadow-2xl hover:bg-slate-800">
      <div className={`absolute bottom-0 left-0 top-0 w-1 rounded-l-2xl ${accent}`} />
      <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold text-white ${accent}`}>{tag}</span>
      <h3 className="mt-4 text-lg font-bold text-white transition-colors group-hover:text-pink-400">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{desc}</p>
      <div className="mt-4 inline-flex items-center text-sm font-bold text-slate-300 transition-colors group-hover:text-pink-400">
        查看详情<ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function ServiceCardV7({ title, items, icon, gradient }: { title: string; items: string[]; icon: React.ReactNode; gradient: string }) {
  return (
    <div className="relative flex flex-col rounded-2xl bg-slate-800/50 p-6 shadow-sm ring-1 ring-slate-700">
      <div className={`absolute left-0 right-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${gradient}`} />
      <div className="flex items-center gap-4">
        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
          {icon}
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm text-slate-400">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gradient-to-r ${gradient}`} />{item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WhyCardV7({ title, value, desc, icon }: { title: string; value: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-slate-800/50 p-6 text-center ring-1 ring-slate-700 transition-all hover:-translate-y-1 hover:bg-slate-800">
      <div className="text-emerald-400 mb-3">{icon}</div>
      <div className="text-3xl font-black bg-gradient-to-r from-pink-400 to-cyan-400 bg-clip-text text-transparent">{value}</div>
      <div className="mt-2 text-lg font-bold text-white">{title}</div>
      <div className="mt-1 text-sm text-slate-400">{desc}</div>
    </div>
  );
}

function EcoCardV7({ title, desc, icon, phase, color }: { title: string; desc: string; icon: React.ReactNode; phase: string; color: string }) {
  return (
    <div className="relative rounded-2xl bg-slate-800/50 p-6 shadow-sm ring-1 ring-slate-700 transition-all hover:-translate-y-1 hover:bg-slate-800">
      <div className={`absolute right-4 top-4 rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-semibold ${color}`}>{phase}</div>
      <div className={`mt-2 ${color}`}>{icon}</div>
      <div className="mt-3 text-base font-bold text-white">{title}</div>
      <div className="mt-1 text-sm text-slate-400">{desc}</div>
    </div>
  );
}

function V7Dock() {
  return (
    <div className="fixed bottom-5 right-5 z-40">
      <div className="flex flex-col gap-2">
        <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-slate-400 shadow-lg ring-1 ring-slate-700 transition-all hover:bg-slate-700 hover:text-white">
          <Heart className="h-4 w-4" />
        </button>
        <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-slate-400 shadow-lg ring-1 ring-slate-700 transition-all hover:bg-slate-700 hover:text-white">
          <GitCompare className="h-4 w-4" />
        </button>
        <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-cyan-500 text-white shadow-lg transition-all hover:shadow-xl hover:shadow-pink-500/30">
          <MessageCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
