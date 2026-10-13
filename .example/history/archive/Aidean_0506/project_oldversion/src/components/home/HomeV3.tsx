"use client";

import { useMemo } from "react";
import { useApi, publicApiKeys } from "@/hooks/useApi";
import { HomeCarousel } from "@/components/home/HomeCarousel";
import Link from "next/link";
import { Rocket, BarChart3, GitCompare, FlaskConical, Cpu, ArrowRight, Layers, Award, Zap, Target, RefreshCw, MousePointer } from "lucide-react";

const CAROUSEL_SLIDES = [
  { src: "images/banners/reference1.webp", alt: "AI模型性能天梯图", href: "/models" },
  { src: "images/banners/reference2.webp", alt: "模型评测体系", href: "http://36.134.158.50:10001/", external: true },
  { src: "images/banners/reference3.webp", alt: "数字分身", href: "/products/ai-employee" },
  { src: "images/banners/reference4.webp", alt: "Skill技能", href: "/resources/skills" },
];

interface HomeStats { modelCount: number; toolCount: number; solutionCount: number; appCount: number; }

export default function HomeV3() {
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
    <div className="flex flex-col">
      <section className="relative w-full bg-white">
        <div className="mx-auto max-w-[1920px] px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="grid items-center gap-16 lg:grid-cols-[0.5fr_1fr]">
            <div className="flex flex-col items-start">
              <div className="text-sm font-medium tracking-wide text-slate-400 uppercase">Aidean</div>
              <h1 className="mt-6 text-5xl font-light tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
                发现最佳<br /><span className="font-semibold">AI 模型</span>
              </h1>
              <p className="mt-8 max-w-sm text-lg leading-relaxed text-slate-500">
                全面评测、多维度对比，助你快速找到最适合的 AI 解决方案
              </p>
              <div className="mt-12 flex flex-wrap items-center gap-4">
                <Link href="/models" className="group inline-flex items-center gap-2 rounded-lg bg-slate-900 px-8 py-4 text-sm font-medium text-white transition-all hover:bg-slate-800 hover:shadow-lg">
                  <Rocket className="h-4 w-4" /> 立即体验
                </Link>
                <Link href="/compare" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-8 py-4 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50">
                  进入对比
                </Link>
              </div>
            </div>
            <div className="min-w-0">
              <HomeCarousel slides={CAROUSEL_SLIDES} autoPlay autoPlayInterval={5000} className="rounded-2xl shadow-xl" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 lg:grid-cols-4">
            <StatItemV3 value={fmtCount(stats.modelCount, "200+")} label="覆盖模型" />
            <StatItemV3 value={fmtCount(stats.toolCount, "10万+")} label="可用工具" />
            <StatItemV3 value={fmtCount(stats.solutionCount, "1000+")} label="解决方案" />
            <StatItemV3 value={fmtCount(stats.appCount, "3+")} label="专属应用" />
          </div>
        </div>
      </section>

      <section className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-light tracking-tight text-slate-900 sm:text-4xl">核心<span className="font-semibold">功能</span></h2>
              <p className="mt-4 text-lg text-slate-500">从天梯图到资源生态，一站式 AI 选型平台</p>
            </div>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
            <ActionCardV3 title="模型天梯图" description="查看大模型性能排名，对比选择最优模型" href="/models" icon={<BarChart3 className="h-5 w-5" />} />
            <ActionCardV3 title="对比评测" description="多维度对比不同模型，找到最适合的方案" href="/compare" icon={<GitCompare className="h-5 w-5" />} />
            <ActionCardV3 title="公开解决方案" description="工具应用一键直达，优质方案更快落地" href="/products/solutions" icon={<FlaskConical className="h-5 w-5" />} />
            <ActionCardV3 title="AI资源" description="Agent、MCP、Skills资源集合" href="/resources" icon={<Cpu className="h-5 w-5" />} />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50/30 py-24 sm:py-32">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-light tracking-tight text-slate-900 sm:text-4xl">内容<span className="font-semibold">/案例</span></h2>
              <p className="mt-4 max-w-2xl text-lg text-slate-500">从入门到进阶，把怎么看懂天梯图和怎么选模型讲清楚。</p>
            </div>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ContentCardV3 tag="教程" title="如何读懂性能天梯图：先看维度，再看差距" desc="入门指南：理解评分维度、筛选逻辑和自定义排序公式。" href="/docs/help" />
            <ContentCardV3 tag="排行榜解读" title="本周 Top5 变化：为什么某模型突然上升" desc="周报形式解读榜单变化，分析模型优势与短板。" href="/resources/news" />
            <ContentCardV3 tag="精选测评" title="长文本：5 个模型在 100K 上下文的差异" desc="用统一问题对比多模型回答，直观看差异。" href="/evaluation" />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-light tracking-tight text-slate-900 sm:text-4xl">专属<span className="font-semibold">服务</span></h2>
            <p className="mt-4 text-lg text-slate-500">为选型与落地而设计</p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <ServiceCardV3 title="企业咨询" items={["选型建议与落地路线", "成本评估与预算建议", "评测方案设计"]} icon={<Target className="h-5 w-5" />} />
            <ServiceCardV3 title="私有化/内网" items={["数据与模型更可控", "内网部署与权限", "合规与审计"]} icon={<Zap className="h-5 w-5" />} />
            <ServiceCardV3 title="定制服务" items={["自定义榜单与指标", "行业场景模板", "专属看板与报表"]} icon={<RefreshCw className="h-5 w-5" />} />
            <ServiceCardV3 title="连接生态" items={["MCP、Skills、Agent 资源聚合", "推荐组合与实践路径", "试用计费与一键配置"]} icon={<MousePointer className="h-5 w-5" />} />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50/30 py-24 sm:py-32">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-light tracking-tight text-slate-900 sm:text-4xl">为什么选择<span className="font-semibold">我们</span></h2>
            <p className="mt-4 text-lg text-slate-500">更可信、更可比、更可用</p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <WhyCardV3 title="覆盖广" value="1,248+" desc="持续更新模型数据" />
            <WhyCardV3 title="对比快" value="10x" desc="更快扫清差异" />
            <WhyCardV3 title="规则清" value="4 维" desc="权重可解释" />
            <WhyCardV3 title="边界明" value="免费/付费" desc="按次扣费透明" />
          </div>
        </div>
      </section>
    </div>
  );
}

function StatItemV3({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div className="text-3xl font-semibold text-slate-900">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{label}</div>
    </div>
  );
}

function ActionCardV3({ title, description, href, icon }: { title: string; description: string; href: string; icon: React.ReactNode; }) {
  return (
    <Link href={href} className="group flex flex-col bg-white p-8 transition-all hover:bg-slate-50">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-slate-900 group-hover:text-white">
        {icon}
      </div>
      <h3 className="mt-6 text-lg font-medium text-slate-900">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{description}</p>
      <div className="mt-6 inline-flex items-center text-sm font-medium text-slate-900">
        立即查看<ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function ContentCardV3({ tag, title, desc, href }: { tag: string; title: string; desc: string; href: string; }) {
  return (
    <Link href={href} className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-8 transition-all hover:border-slate-200 hover:shadow-lg">
      <span className="inline-flex w-fit items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{tag}</span>
      <h3 className="mt-6 text-lg font-medium text-slate-900 transition-colors group-hover:text-slate-700">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{desc}</p>
      <div className="mt-6 inline-flex items-center text-sm font-medium text-slate-900">
        查看详情<ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function ServiceCardV3({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode; }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-8">
      <div className="flex items-center gap-4">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{icon}</div>
        <h3 className="text-lg font-medium text-slate-900">{title}</h3>
      </div>
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm text-slate-500">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />{item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WhyCardV3({ title, value, desc }: { title: string; value: string; desc: string; }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-8 text-center transition-all hover:shadow-lg">
      <div className="text-3xl font-semibold text-slate-900">{value}</div>
      <div className="mt-3 text-sm font-medium text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{desc}</div>
    </div>
  );
}
