"use client";

import { useEffect, useState } from "react";
import { HomeCarousel } from "@/components/home/HomeCarousel";
import Link from "next/link";
import { Rocket } from "lucide-react";
import { systemApi, modelsApi, toolsApi, isSuccess } from "@/lib/api/client";

const CAROUSEL_SLIDES = [
  {
    src: "/images/banners/reference1.webp",
    alt: "AI模型性能天梯图 - 全面对比各大模型性能",
    href: "/models",
  },
  {
    src: "/images/banners/reference2.webp",
    alt: "模型评测体系 - 多维度专业评测",
    href: "http://36.134.158.50:10001/",
    external: true,
  },
  {
    src: "/images/banners/reference3.webp",
    alt: "实时数据更新 - 每日更新模型数据",
    href: "/products/ai-employee",
  },
  {
    src: "/images/banners/reference4.webp",
    alt: "智能选型助手 - 帮助选择最适合的AI模型",
    href: "/resources/skills",
  },
];

interface HomeStats {
  modelCount: number;
  toolCount: number;
  solutionCount: number;
  appCount: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<HomeStats | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const [statsRes, modelsRes, skillsRes, mcpRes, agentsRes, apiStationsRes] =
          await Promise.all([
            systemApi.stats(),
            modelsApi.list({ page: 1, limit: 1 }),
            toolsApi.skills({ page: 1, limit: 1 }),
            toolsApi.mcp({ page: 1, limit: 1 }),
            toolsApi.agents({ page: 1, limit: 1 }),
            toolsApi.apiStations({ page: 1, limit: 1 }),
          ]);

        const modelTotal = isSuccess(modelsRes) ? (modelsRes.meta?.total || 0) : 0;
        const skillsTotal = isSuccess(skillsRes) ? (skillsRes.meta?.total || 0) : 0;
        const mcpTotal = isSuccess(mcpRes) ? (mcpRes.meta?.total || 0) : 0;
        const agentsTotal = isSuccess(agentsRes) ? (agentsRes.meta?.total || 0) : 0;
        const apiStationsTotal = isSuccess(apiStationsRes) ? (apiStationsRes.meta?.total || 0) : 0;

        setStats({
          modelCount: modelTotal,
          toolCount: skillsTotal + mcpTotal + agentsTotal + apiStationsTotal,
          solutionCount: isSuccess(statsRes) ? (statsRes.data?.models?.active || 0) : 0,
          appCount: 3,
        });
      } catch {
        setStats({ modelCount: 0, toolCount: 0, solutionCount: 0, appCount: 3 });
      }
    }
    loadStats();
  }, []);

  const fmtCount = (n: number, fallback: string) => n > 0 ? `${n}+` : fallback;

  return (
    <div className="flex flex-col pt-16">
      <section className="w-full bg-[#DBDFF9] py-10">
        <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[0.75fr_1.5fr]">
            <div className="min-w-0 h-full flex flex-col justify-center lg:justify-self-center lg:max-w-md">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                AI驱动的解决方案
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                矩阵评测详尽对比，定制员工由你心意
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-8">
                <Link
                  href="/models"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  <Rocket className="h-4 w-4" />
                  立即体验
                </Link>
                <Link
                  href="/compare"
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-white"
                >
                  进入对比
                </Link>
              </div>
            </div>

            <div className="min-w-0">
              <HomeCarousel
                slides={CAROUSEL_SLIDES}
                autoPlay={true}
                autoPlayInterval={5000}
                className="shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="w-full border-t border-b border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            <StatItem value={fmtCount(stats?.modelCount ?? 0, "200+")} label="覆盖模型" />
            <StatItem value={fmtCount(stats?.toolCount ?? 0, "10万+")} label="可用工具" />
            <StatItem value={fmtCount(stats?.solutionCount ?? 0, "1000+")} label="解决方案" />
            <StatItem value={stats?.appCount?.toString() ?? "3"} label="专属应用" />
          </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="w-full py-8">
        <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <QuickActionCard
              title="模型天梯图"
              description="查看大模型性能排名，对比选择最优模型"
              href="/models"
              icon="📊"
            />
            <QuickActionCard
              title="对比评测"
              description="多维度对比不同模型，找到最适合的方案"
              href="/compare"
              icon="⚖️"
            />
            <QuickActionCard
              title="公开解决方案"
              description="工具应用一键直达，优质方案更快落地"
              href="/products/solutions"
              icon="🧪"
            />
            <QuickActionCard
              title="AI资源"
              description="Agent、MCP、Skills资源集合"
              href="/resources"
              icon="🤖"
            />
          </div>
        </div>
      </section>

      <section className="w-full py-10">
        <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="text-xs font-semibold text-slate-500">内容 / 案例</div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">教程、排行榜解读、精选测评</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                从入门到进阶，把“怎么看懂天梯图”和“怎么选模型”讲清楚。
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Link
              href="/docs/help"
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-blue-300"
            >
              <div className="text-sm font-semibold text-slate-900">教程</div>
              <div className="mt-2 text-sm text-slate-600">快速上手：筛选、排序、开源标记、模型详情。</div>
              <div className="mt-4 text-sm font-medium text-blue-600">查看教程</div>
            </Link>
            <Link
              href="/resources/news"
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-blue-300"
            >
              <div className="text-sm font-semibold text-slate-900">排行榜解读</div>
              <div className="mt-2 text-sm text-slate-600">每周解读 TOP 变化与代表性模型的优势短板。</div>
              <div className="mt-4 text-sm font-medium text-blue-600">查看解读</div>
            </Link>
            <Link
              href="/evaluation"
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-blue-300"
            >
              <div className="text-sm font-semibold text-slate-900">精选测评</div>
              <div className="mt-2 text-sm text-slate-600">用统一问题对比多模型回答，直观看差异。</div>
              <div className="mt-4 text-sm font-medium text-blue-600">进入测评</div>
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full border-t border-slate-200 bg-slate-50 py-12">
        <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold text-slate-500">专属服务</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">为选型与落地而设计</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>多维评测口径统一，避免“看起来强但不适用”</li>
                <li>模型详情页提供关键参数与成本提示</li>
                <li>支持收藏、对比与纠错反馈闭环</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold text-slate-500">拓展服务</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">连接 Agent / MCP / Skills 生态</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>工具与插件发现：MCP、Skills、Agent 资源聚合</li>
                <li>面向不同场景的推荐组合与实践路径</li>
                <li>后续支持：试用计费、环境与工作流一键配置</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-12">
        <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
          <div className="text-xs font-semibold text-slate-500">为什么选择我们</div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">更可信、更可比、更可用</h2>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">统一口径</div>
              <div className="mt-2 text-sm text-slate-600">同一维度、同一展示方式，避免信息噪声。</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">多维分析</div>
              <div className="mt-2 text-sm text-slate-600">性能、上下文、速度、价格多维度直观对比。</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">持续更新</div>
              <div className="mt-2 text-sm text-slate-600">模型迭代快，我们用稳定机制保持榜单可用。</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">可操作性强</div>
              <div className="mt-2 text-sm text-slate-600">收藏/对比/纠错/测评入口，形成闭环决策。</div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

function QuickActionCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-blue-300 hover:shadow-md"
    >
      <div className="mb-4 text-3xl">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900">
        {title}
      </h3>
      <p className="text-sm text-slate-600">{description}</p>
      <div className="mt-4 flex items-center text-sm font-medium text-blue-600">
        立即查看
        <svg
          className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </Link>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-blue-600">
        {value}
      </div>
      <div className="mt-1 text-sm text-slate-600">
        {label}
      </div>
    </div>
  );
}
