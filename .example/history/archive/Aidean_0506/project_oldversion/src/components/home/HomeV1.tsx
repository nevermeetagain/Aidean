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
  TrendingUp,
  BookOpen,
  Award,
  Layers,
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

export default function HomeV1() {
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
      {/* ====== Section 1: Hero ====== */}
      <section className="relative w-full overflow-hidden bg-gradient-to-br from-[#6366f1] via-[#8b5cf6] to-[#a78bfa]">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-[1920px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[0.6fr_1fr]">
            <div className="flex flex-col items-start">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm ring-1 ring-white/20">
                <TrendingUp className="h-4 w-4" />
                AI 模型天梯图平台
              </div>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                发现最佳
                <br />
                AI 模型
              </h1>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-indigo-100">
                全面评测、多维度对比，助你快速找到最适合的 AI 解决方案
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/models"
                  className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-indigo-600 shadow-lg transition-all hover:bg-indigo-50 hover:shadow-xl hover:-translate-y-0.5"
                >
                  <Rocket className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                  立即体验
                </Link>
                <Link
                  href="/compare"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/30 backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  进入对比
                </Link>
              </div>
            </div>

            <div className="min-w-0">
              <HomeCarousel slides={CAROUSEL_SLIDES} autoPlay autoPlayInterval={5000} className="rounded-2xl shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ====== Section 2: Stats ====== */}
      <section className="relative z-10 -mt-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-2 gap-4 rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-100 lg:grid-cols-4 lg:p-8">
            <StatItem value={fmtCount(stats.modelCount, "200+")} label="覆盖模型" icon={<Layers className="h-5 w-5" />} />
            <StatItem value={fmtCount(stats.toolCount, "10万+")} label="可用工具" icon={<Cpu className="h-5 w-5" />} />
            <StatItem value={fmtCount(stats.solutionCount, "1000+")} label="解决方案" icon={<Award className="h-5 w-5" />} />
            <StatItem value={fmtCount(stats.appCount, "3+")} label="专属应用" icon={<FlaskConical className="h-5 w-5" />} />
          </div>
        </div>
      </section>

      {/* ====== Section 3: Quick Actions ====== */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">核心功能</h2>
            <p className="mt-3 text-lg text-slate-500">从天梯图到资源生态，一站式 AI 选型平台</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <ActionCard
              title="模型天梯图"
              description="查看大模型性能排名，对比选择最优模型"
              href="/models"
              icon={<BarChart3 className="h-6 w-6" />}
              color="bg-indigo-50 text-indigo-600"
            />
            <ActionCard
              title="对比评测"
              description="多维度对比不同模型，找到最适合的方案"
              href="/compare"
              icon={<GitCompare className="h-6 w-6" />}
              color="bg-violet-50 text-violet-600"
            />
            <ActionCard
              title="公开解决方案"
              description="工具应用一键直达，优质方案更快落地"
              href="/products/solutions"
              icon={<FlaskConical className="h-6 w-6" />}
              color="bg-fuchsia-50 text-fuchsia-600"
            />
            <ActionCard
              title="AI资源"
              description="Agent、MCP、Skills资源集合"
              href="/resources"
              icon={<Cpu className="h-6 w-6" />}
              color="bg-blue-50 text-blue-600"
            />
          </div>
        </div>
      </section>

      {/* ====== Section 4: Content / Cases ====== */}
      <section className="border-t border-slate-100 bg-slate-50/50 py-16 sm:py-20">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">内容 / 案例</div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">教程、排行榜解读、精选测评</h2>
              <p className="mt-3 max-w-2xl text-lg text-slate-500">从入门到进阶，把“怎么看懂天梯图”和“怎么选模型”讲清楚。</p>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ContentCard
              tag="教程"
              title="如何读懂性能天梯图：先看维度，再看差距"
              desc="入门指南：理解评分维度、筛选逻辑和自定义排序公式。"
              href="/docs/help"
            />
            <ContentCard
              tag="排行榜解读"
              title="本周 Top5 变化：为什么某模型突然上升"
              desc="周报形式解读榜单变化，分析模型优势与短板。"
              href="/resources/news"
            />
            <ContentCard
              tag="精选测评"
              title="长文本：5 个模型在 100K 上下文的差异"
              desc="用统一问题对比多模型回答，直观看差异。"
              href="/evaluation"
            />
          </div>
        </div>
      </section>

      {/* ====== Section 5: Services ====== */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">专属服务</div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">为选型与落地而设计</h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ServiceCard
              title="企业咨询"
              items={["选型建议与落地路线", "成本评估与预算建议", "评测方案设计"]}
              icon={<Target className="h-6 w-6" />}
            />
            <ServiceCard
              title="私有化/内网"
              items={["数据与模型更可控", "内网部署与权限", "合规与审计"]}
              icon={<Zap className="h-6 w-6" />}
            />
            <ServiceCard
              title="定制服务"
              items={["自定义榜单与指标", "行业场景模板", "专属看板与报表"]}
              icon={<RefreshCw className="h-6 w-6" />}
            />
            <ServiceCard
              title="连接生态"
              items={["MCP、Skills、Agent 资源聚合", "推荐组合与实践路径", "试用计费与一键配置"]}
              icon={<MousePointer className="h-6 w-6" />}
            />
          </div>
        </div>
      </section>

      {/* ====== Section 6: Why Choose Us ====== */}
      <section className="border-t border-slate-100 bg-gradient-to-b from-white to-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">为什么选择我们</div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">更可信、更可比、更可用</h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <WhyCard title="覆盖广" value="1,248+" desc="持续更新模型数据" icon={<Layers className="h-5 w-5" />} />
            <WhyCard title="对比快" value="10x" desc="更快扫清差异" icon={<GitCompare className="h-5 w-5" />} />
            <WhyCard title="规则清" value="4 维" desc="权重可解释" icon={<BarChart3 className="h-5 w-5" />} />
            <WhyCard title="边界明" value="免费/付费" desc="按次扣费透明" icon={<Award className="h-5 w-5" />} />
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─────────── 子组件 ─────────── */

function StatItem({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">{icon}</div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
      <div className="mt-1 text-sm font-medium text-slate-500">{label}</div>
    </div>
  );
}

function ActionCard({
  title,
  description,
  href,
  icon,
  color,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-indigo-200"
    >
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>{icon}</div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
      <div className="mt-4 inline-flex items-center text-sm font-semibold text-indigo-600 transition-colors group-hover:text-indigo-700">
        立即查看
        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function ContentCard({ tag, title, desc, href }: { tag: string; title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-indigo-200"
    >
      <span className="inline-flex w-fit items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
        {tag}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-slate-900 transition-colors group-hover:text-indigo-600">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{desc}</p>
      <div className="mt-4 inline-flex items-center text-sm font-semibold text-indigo-600">
        查看详情
        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function ServiceCard({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700">{icon}</div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WhyCard({ title, value, desc, icon }: { title: string; value: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-100 transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">{icon}</div>
      <div className="mt-3 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{desc}</div>
    </div>
  );
}
