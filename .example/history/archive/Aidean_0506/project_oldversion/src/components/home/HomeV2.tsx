"use client";

import { useMemo } from "react";
import { useApi, publicApiKeys } from "@/hooks/useApi";
import { HomeCarousel } from "@/components/home/HomeCarousel";
import Link from "next/link";
import {
  Rocket,
  BarChart3,
  GitCompare,
  FlaskConical,
  Cpu,
  ArrowRight,
  Sparkles,
  Layers,
  Award,
  Zap,
  Target,
  RefreshCw,
  MousePointer,
} from "lucide-react";

const CAROUSEL_SLIDES = [
  { src: "/images/banners/reference1.webp", alt: "AI模型性能天梯图", href: "/models" },
  { src: "/images/banners/reference2.webp", alt: "模型评测体系", href: "http://36.134.158.50:10001/", external: true },
  { src: "/images/banners/reference3.webp", alt: "数字分身", href: "/products/ai-employee" },
  { src: "/images/banners/reference4.webp", alt: "Skill技能", href: "/resources/skills" },
];

interface HomeStats {
  modelCount: number;
  toolCount: number;
  solutionCount: number;
  appCount: number;
}

export default function HomeV2() {
  const { data: statsData } = useApi<{
    models: { total: number; active: number };
    users: { total: number };
    tools: { total: number; skills: number; mcps: number; agents: number };
  }>(publicApiKeys.stats());

  const stats: HomeStats = useMemo(
    () => ({
      modelCount: statsData?.models?.total ?? 0,
      toolCount: statsData?.tools?.total ?? 0,
      solutionCount: statsData?.models?.active ?? 0,
      appCount: (statsData?.tools?.skills ?? 0) + (statsData?.tools?.mcps ?? 0) + (statsData?.tools?.agents ?? 0),
    }),
    [statsData]
  );

  const fmtCount = (n: number, fallback: string) => (n > 0 ? `${n.toLocaleString()}+` : fallback);

  return (
    <div className="flex flex-col">
      {/* ====== Section 1: Hero（深色沉浸式 + 几何装饰） ====== */}
      <section className="relative w-full overflow-hidden bg-slate-900">
        {/* 几何装饰 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 h-[500px] w-[500px] rounded-full bg-pink-500/10 blur-3xl" />
          <div className="absolute top-1/2 -right-20 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-[300px] w-[300px] rounded-full bg-amber-500/10 blur-3xl" />
          {/* 网格纹理 */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-[1920px] px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-[0.55fr_1fr]">
            {/* 左侧文案 */}
            <div className="flex flex-col items-start">
              <div className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500/20 to-cyan-500/20 px-4 py-1.5 text-sm font-medium text-pink-300 ring-1 ring-pink-500/30">
                <Sparkles className="h-4 w-4" />
                AI 模型天梯图平台
              </div>
              <h1 className="mt-8 text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
                发现
                <br />
                <span className="bg-gradient-to-r from-pink-400 via-cyan-400 to-amber-400 bg-clip-text text-transparent">
                  最佳 AI 模型
                </span>
              </h1>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-400">
                全面评测、多维度对比，助你快速找到最适合的 AI 解决方案
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href="/models"
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-cyan-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-500/25 transition-all hover:shadow-xl hover:shadow-pink-500/40 hover:-translate-y-0.5"
                >
                  <Rocket className="h-4 w-4" />
                  立即体验
                </Link>
                <Link
                  href="/compare"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-7 py-3.5 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm transition-all hover:bg-white/10"
                >
                  进入对比
                </Link>
              </div>
            </div>

            {/* 右侧轮播 */}
            <div className="min-w-0">
              <HomeCarousel slides={CAROUSEL_SLIDES} autoPlay autoPlayInterval={5000} className="rounded-2xl shadow-2xl shadow-black/50" />
            </div>
          </div>
        </div>
      </section>

      {/* ====== Section 2: Stats（深色条带） ====== */}
      <section className="relative z-10 -mt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500/20 via-cyan-500/20 to-amber-500/20 p-px lg:grid-cols-4">
            <StatItemV2 value={fmtCount(stats.modelCount, "200+")} label="覆盖模型" />
            <StatItemV2 value={fmtCount(stats.toolCount, "10万+")} label="可用工具" />
            <StatItemV2 value={fmtCount(stats.solutionCount, "1000+")} label="解决方案" />
            <StatItemV2 value={fmtCount(stats.appCount, "3+")} label="专属应用" />
          </div>
        </div>
      </section>

      {/* ====== Section 3: Quick Actions（大卡片 + 渐变边框） ====== */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">核心功能</h2>
            <p className="mt-4 text-xl text-slate-500">从天梯图到资源生态，一站式 AI 选型平台</p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <ActionCardV2
              title="模型天梯图"
              description="查看大模型性能排名，对比选择最优模型"
              href="/models"
              gradient="from-pink-500 to-rose-400"
            />
            <ActionCardV2
              title="对比评测"
              description="多维度对比不同模型，找到最适合的方案"
              href="/compare"
              gradient="from-cyan-500 to-blue-400"
            />
            <ActionCardV2
              title="公开解决方案"
              description="工具应用一键直达，优质方案更快落地"
              href="/products/solutions"
              gradient="from-amber-500 to-orange-400"
            />
            <ActionCardV2
              title="AI资源"
              description="Agent、MCP、Skills资源集合"
              href="/resources"
              gradient="from-emerald-500 to-teal-400"
            />
          </div>
        </div>
      </section>

      {/* ====== Section 4: Content / Cases ====== */}
      <section className="border-t border-slate-100 bg-slate-50/30 py-20 sm:py-28">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-pink-50 px-3 py-1 text-xs font-bold text-pink-600">
                <Sparkles className="h-3.5 w-3.5" />
                内容 / 案例
              </div>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900">教程、排行榜解读、精选测评</h2>
              <p className="mt-4 max-w-2xl text-lg text-slate-500">从入门到进阶，把“怎么看懂天梯图”和“怎么选模型”讲清楚。</p>
            </div>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <ContentCardV2
              tag="教程"
              title="如何读懂性能天梯图：先看维度，再看差距"
              desc="入门指南：理解评分维度、筛选逻辑和自定义排序公式。"
              href="/docs/help"
              accent="bg-pink-500"
            />
            <ContentCardV2
              tag="排行榜解读"
              title="本周 Top5 变化：为什么某模型突然上升"
              desc="周报形式解读榜单变化，分析模型优势与短板。"
              href="/resources/news"
              accent="bg-cyan-500"
            />
            <ContentCardV2
              tag="精选测评"
              title="长文本：5 个模型在 100K 上下文的差异"
              desc="用统一问题对比多模型回答，直观看差异。"
              href="/evaluation"
              accent="bg-amber-500"
            />
          </div>
        </div>
      </section>

      {/* ====== Section 5: Services ====== */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-600">
              <Zap className="h-3.5 w-3.5" />
              专属服务
            </div>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900">为选型与落地而设计</h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <ServiceCardV2
              title="企业咨询"
              items={["选型建议与落地路线", "成本评估与预算建议", "评测方案设计"]}
              icon={<Target className="h-6 w-6" />}
              gradient="from-pink-500 to-rose-400"
            />
            <ServiceCardV2
              title="私有化/内网"
              items={["数据与模型更可控", "内网部署与权限", "合规与审计"]}
              icon={<Zap className="h-6 w-6" />}
              gradient="from-cyan-500 to-blue-400"
            />
            <ServiceCardV2
              title="定制服务"
              items={["自定义榜单与指标", "行业场景模板", "专属看板与报表"]}
              icon={<RefreshCw className="h-6 w-6" />}
              gradient="from-amber-500 to-orange-400"
            />
            <ServiceCardV2
              title="连接生态"
              items={["MCP、Skills、Agent 资源聚合", "推荐组合与实践路径", "试用计费与一键配置"]}
              icon={<MousePointer className="h-6 w-6" />}
              gradient="from-emerald-500 to-teal-400"
            />
          </div>
        </div>
      </section>

      {/* ====== Section 6: Why Choose Us ====== */}
      <section className="border-t border-slate-100 bg-slate-900 py-20 sm:py-28">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/20">
              <Award className="h-3.5 w-3.5" />
              为什么选择我们
            </div>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-white">更可信、更可比、更可用</h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <WhyCardV2 title="覆盖广" value="1,248+" desc="持续更新模型数据" />
            <WhyCardV2 title="对比快" value="10x" desc="更快扫清差异" />
            <WhyCardV2 title="规则清" value="4 维" desc="权重可解释" />
            <WhyCardV2 title="边界明" value="免费/付费" desc="按次扣费透明" />
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─────────── 子组件 V2 ─────────── */

function StatItemV2({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center bg-white py-8 text-center">
      <div className="text-3xl font-black tracking-tight text-slate-900">{value}</div>
      <div className="mt-2 text-sm font-semibold text-slate-500">{label}</div>
    </div>
  );
}

function ActionCardV2({
  title,
  description,
  href,
  gradient,
}: {
  title: string;
  description: string;
  href: string;
  gradient: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100 transition-all hover:-translate-y-2 hover:shadow-2xl"
    >
      {/* 顶部渐变条 */}
      <div className={`absolute left-0 right-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${gradient}`} />
      <h3 className="mt-2 text-xl font-bold text-slate-900">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-500">{description}</p>
      <div className="mt-6 inline-flex items-center text-sm font-bold text-slate-900 transition-colors group-hover:text-pink-500">
        立即查看
        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function ContentCardV2({
  tag,
  title,
  desc,
  href,
  accent,
}: {
  tag: string;
  title: string;
  desc: string;
  href: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100 transition-all hover:-translate-y-2 hover:shadow-2xl"
    >
      {/* 左侧色条 */}
      <div className={`absolute bottom-0 left-0 top-0 w-1 rounded-l-2xl ${accent}`} />
      <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold text-white ${accent}`}>
        {tag}
      </span>
      <h3 className="mt-5 text-xl font-bold text-slate-900 transition-colors group-hover:text-pink-500">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-500">{desc}</p>
      <div className="mt-6 inline-flex items-center text-sm font-bold text-slate-900 transition-colors group-hover:text-pink-500">
        查看详情
        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function ServiceCardV2({
  title,
  items,
  icon,
  gradient,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <div className="relative flex flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
      <div className={`absolute left-0 right-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${gradient}`} />
      <div className="flex items-center gap-4">
        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
          {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      </div>
      <ul className="mt-6 space-y-4">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gradient-to-r ${gradient}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WhyCardV2({ title, value, desc }: { title: string; value: string; desc: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white/5 p-8 text-center ring-1 ring-white/10 transition-all hover:-translate-y-1 hover:bg-white/10">
      <div className="text-4xl font-black bg-gradient-to-r from-pink-400 to-cyan-400 bg-clip-text text-transparent">{value}</div>
      <div className="mt-3 text-lg font-bold text-white">{title}</div>
      <div className="mt-1 text-sm text-slate-400">{desc}</div>
    </div>
  );
}
