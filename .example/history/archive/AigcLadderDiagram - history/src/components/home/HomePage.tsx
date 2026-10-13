"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  Bookmark,
  ChevronDown,
  GitCompare,
  Headphones,
  LineChart,
  Mail,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSiteTheme } from "@/lib/siteTheme";

const KB_LINK = "http://36.134.158.50:10001/";

type Vendor = "OpenAI" | "Anthropic" | "Google" | "字节跳动" | "百度";

type Row = {
  score: number;
  models: Partial<Record<Vendor, string>>;
};

const VENDORS: Vendor[] = ["OpenAI", "Anthropic", "Google", "字节跳动", "百度"];

const SAMPLE_ROWS: Row[] = [
  { score: 92, models: { OpenAI: "GPT-4o" } },
  { score: 91, models: { Anthropic: "Claude 3 Opus", Google: "Gemini 1.5 Pro Ultra" } },
  { score: 90, models: {} },
  { score: 89, models: { Google: "Gemini 1.5 Pro" } },
  { score: 88, models: { Anthropic: "Claude 3 Sonnet", "字节跳动": "豆包 4.0" } },
  { score: 87, models: { OpenAI: "GPT-3.5 Turbo" } },
  { score: 86, models: { Google: "Gemini 1.5 Flash", 百度: "文心一言 4.0" } },
];

type BoardKey = "performance" | "cost" | "open" | "mobile";

const BOARD_OPTIONS: { key: BoardKey; label: string; title: string }[] = [
  { key: "performance", label: "大模型性能天梯图", title: "大模型性能天梯图" },
  { key: "cost", label: "大模型性价比天梯图", title: "大模型性价比天梯图" },
  { key: "open", label: "大模型开源天梯图", title: "大模型开源天梯图" },
  { key: "mobile", label: "手机端大模型天梯图", title: "手机端大模型天梯图" },
];

export function HomePage() {
  const { theme, resolvedMode } = useSiteTheme();
  // 强制浅色模式 - 根据需求 v1.6
const isDark = false;

  const [boardOpen, setBoardOpen] = useState(false);
  const [board, setBoard] = useState<BoardKey>("performance");
  const [edition, setEdition] = useState<"pro" | "app">("pro");
  const [view, setView] = useState<"table" | "chart">("table");

  const boardTitle = useMemo(() => {
    return BOARD_OPTIONS.find((x) => x.key === board)?.title ?? "大模型性能天梯图";
  }, [board]);

  const updateDate = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  return (
    <div className="w-full">
      <section className={`relative ${isDark ? "bg-slate-950" : theme.bg}`}>
        <HeroCarousel isDark={isDark} />

        <div className="mx-auto max-w-[1920px] px-4 pb-12 pt-8 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="min-w-0">
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isDark ? "bg-white/5 text-white/80" : "bg-black/5 text-black/70"}`}>
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Data Newsroom
              </div>
              <h1 className={`mt-4 text-3xl font-semibold tracking-tight sm:text-4xl ${isDark ? "text-white" : "text-slate-900"}`}>
                {boardTitle}
              </h1>
              <div className={`mt-3 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                扫一眼对比模型，做出更好的选择。
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <StatCard title="覆盖模型" value="1,248" foot="+23 本周新增" isDark={isDark} />
                <StatCard title="评分维度" value="12" foot="综合全面" isDark={isDark} />
                <StatCard title="榜单数量" value="4" foot="持续扩展" isDark={isDark} />
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="relative w-full" onMouseEnter={() => setBoardOpen(true)} onMouseLeave={() => setBoardOpen(false)}>
                <button
                  type="button"
                  onClick={() => setBoardOpen((v) => !v)}
                  className={`inline-flex h-11 w-full items-center justify-between rounded-xl px-4 text-sm font-semibold ring-1 transition-colors ${
                    isDark
                      ? "bg-slate-900 text-slate-100 ring-slate-800 hover:bg-slate-900/70"
                      : "bg-white text-slate-900 ring-slate-200 hover:bg-slate-50"
                  }`}
                  aria-label="更多榜单"
                >
                  更多榜单
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${boardOpen ? "rotate-180" : ""} ${isDark ? "text-slate-400" : "text-slate-500"}`}
                    aria-hidden
                  />
                </button>

                {boardOpen && (
                  <div
                    className={`absolute right-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl ring-1 shadow-xl ${
                      isDark ? "bg-slate-900 ring-slate-800" : "bg-white ring-slate-200"
                    }`}
                    role="menu"
                    aria-label="榜单列表"
                  >
                    {BOARD_OPTIONS.map((opt) => {
                      const active = opt.key === board;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            setBoard(opt.key);
                            setBoardOpen(false);
                          }}
                          className={`relative w-full px-4 py-3 text-left text-sm transition-colors ${
                            isDark
                              ? active
                                ? "bg-white/5 text-white"
                                : "text-slate-200 hover:bg-white/5"
                              : active
                                ? "bg-slate-50 text-slate-900"
                                : "text-slate-700 hover:bg-slate-50"
                          }`}
                          role="menuitem"
                        >
                          {active && <span className={`absolute left-0 top-0 h-full w-1 ${theme.navIndicator}`} aria-hidden />}
                          <div className="font-semibold">{opt.label}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={`w-full text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>更新日期：{updateDate}</div>

              <a
                className={`inline-flex w-full items-center gap-2 text-xs underline-offset-4 hover:underline ${
                  isDark ? "text-slate-300" : "text-slate-700"
                }`}
                href="mailto:164093410@qq.com?subject=%E6%95%B0%E6%8D%AE%E7%BA%A0%E9%94%99"
              >
                <Mail className="h-4 w-4" aria-hidden />
                纠错：164093410@qq.com
              </a>

              <Link href="/compare" className="w-full">
                <Button variant="ghost" className={`w-full justify-between ${isDark ? "text-slate-100 hover:bg-white/5" : ""}`}>
                  开始对比
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1920px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-900"}`}>全场景能力矩阵</div>
            <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              先看清楚你能用它做什么，再深入到每个模块。
            </div>
          </div>
          <a
            href="#pricing"
            className={`hidden text-xs font-semibold underline-offset-4 hover:underline sm:inline-flex ${
              isDark ? "text-slate-200" : "text-slate-700"
            }`}
          >
            直接查看会员对比 →
          </a>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard title="天梯图" desc="榜单/筛选/排序一体化" meta="性能·性价比·开源·手机端" isDark={isDark} />
          <FeatureCard title="模型详情" desc="参数、基准与历史测评" meta="结构化信息卡" isDark={isDark} />
          <FeatureCard title="对比" desc="多模型关键指标对照" meta="参数表格对比" isDark={isDark} />
          <FeatureCard title="内容/案例" desc="教程、榜单解读、精选测评" meta="内容驱动理解" isDark={isDark} />
          <FeatureCard title="专属服务" desc="企业咨询、私有化与定制" meta="更快落地" isDark={isDark} />
          <FeatureCard title="会员权益" desc="免费与付费边界清晰" meta="余额制/按次" isDark={isDark} />
        </div>

        <div className="mt-8">
          <div className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-900"}`}>立即体验：天梯图预览</div>
          <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            这里是交互预览区（完整体验建议进入“模型”页）。
          </div>

          <div className={`mt-4 rounded-2xl ring-1 ${isDark ? "bg-slate-950 ring-slate-800" : "bg-white ring-slate-200"}`}>
            <div className={`flex flex-wrap items-center gap-2 px-4 py-4 ${isDark ? "border-b border-slate-800" : "border-b border-slate-200"}`}>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEdition("pro")}
                  className={`h-10 rounded-xl px-4 text-sm font-semibold ring-1 transition-colors ${
                    edition === "pro"
                      ? `${theme.buttonBg} ${theme.buttonText}`
                      : isDark
                        ? "bg-slate-900 text-slate-200 ring-slate-800 hover:bg-slate-900/70"
                        : "bg-slate-50 text-slate-700 ring-slate-200 hover:bg-slate-100"
                  }`}
                >
                  专业版
                </button>
                <button
                  type="button"
                  onClick={() => setEdition("app")}
                  className={`h-10 rounded-xl px-4 text-sm font-semibold ring-1 transition-colors ${
                    edition === "app"
                      ? `${theme.buttonBg} ${theme.buttonText}`
                      : isDark
                        ? "bg-slate-900 text-slate-200 ring-slate-800 hover:bg-slate-900/70"
                        : "bg-slate-50 text-slate-700 ring-slate-200 hover:bg-slate-100"
                  }`}
                >
                  应用版
                </button>
              </div>

              <div className={`mx-2 hidden h-6 w-px sm:block ${isDark ? "bg-slate-800" : "bg-slate-200"}`} aria-hidden />

              <div className="flex flex-wrap items-center gap-2">
                <FilterChip label="类型" isDark={isDark} />
                <FilterChip label="协议" isDark={isDark} />
                <FilterChip label="开源" isDark={isDark} />
                <FilterChip label="测评集" isDark={isDark} />
                <FilterChip label="标签" isDark={isDark} />
                <FilterChip label="时间" isDark={isDark} />
                <FilterChip label="排序" isDark={isDark} />
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setView("table")}
                  className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold ring-1 transition-colors ${
                    view === "table"
                      ? `${theme.primaryLight} ${theme.primaryText} ring-transparent`
                      : isDark
                        ? "bg-transparent text-slate-300 ring-slate-800 hover:bg-white/5"
                        : "bg-transparent text-slate-700 ring-slate-200 hover:bg-slate-50"
                  }`}
                  aria-label="视图：排行榜"
                >
                  <LineChart className="h-4 w-4" aria-hidden />
                  排行榜
                </button>
                <button
                  type="button"
                  onClick={() => setView("chart")}
                  className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold ring-1 transition-colors ${
                    view === "chart"
                      ? `${theme.primaryLight} ${theme.primaryText} ring-transparent`
                      : isDark
                        ? "bg-transparent text-slate-300 ring-slate-800 hover:bg-white/5"
                        : "bg-transparent text-slate-700 ring-slate-200 hover:bg-slate-50"
                  }`}
                  aria-label="视图：柱状图"
                >
                  <BarChart3 className="h-4 w-4" aria-hidden />
                  柱状图
                </button>
              </div>
            </div>

            <div className="p-4">
              {view === "table" ? <MatrixPreviewTable isDark={isDark} /> : <BarPreview isDark={isDark} />}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1920px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <div className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-900"}`}>内容 / 案例</div>
            <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              用可读的教程与解读，让你更快理解榜单和差异。
            </div>
          </div>
        </div>

        <ContentCases isDark={isDark} />
      </section>

      <section className="mx-auto max-w-[1920px] px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <div className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-900"}`}>为什么选择我们</div>
          <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            从“数据可信度”到“落地效率”，给你可复用的决策依据。
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="覆盖广" value="1,248" foot="持续更新" isDark={isDark} />
          <MetricCard title="对比快" value="10x" foot="更快扫清差异" isDark={isDark} />
          <MetricCard title="规则清" value="4 维" foot="权重可解释" isDark={isDark} />
          <MetricCard title="边界明" value="免费/付费" foot="按次扣费" isDark={isDark} />
        </div>
      </section>

      <section id="services" className="mx-auto max-w-[1920px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-900"}`}>专属服务</div>
            <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              针对企业场景提供更可控、更快速的落地路径。
            </div>
          </div>
          <a
            href="mailto:164093410@qq.com?subject=%E4%B8%93%E5%B1%9E%E6%9C%8D%E5%8A%A1%E5%92%A8%E8%AF%A2"
            className={`hidden text-xs font-semibold underline-offset-4 hover:underline sm:inline-flex ${
              isDark ? "text-slate-200" : "text-slate-700"
            }`}
          >
            联系我们 →
          </a>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ServiceCard title="企业咨询" items={["选型建议与落地路线", "成本评估与预算建议", "评测方案设计"]} isDark={isDark} />
          <ServiceCard title="私有化/内网" items={["数据与模型更可控", "内网部署与权限", "合规与审计"]} isDark={isDark} />
          <ServiceCard title="定制服务" items={["自定义榜单与指标", "行业场景模板", "专属看板与报表"]} isDark={isDark} />
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-[1920px] px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <div className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-900"}`}>会员权益（免费 vs 付费）</div>
          <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            基础数据免费，增值服务按次扣费（余额制）。
          </div>
        </div>

        <div className={`mt-4 overflow-hidden rounded-2xl ring-1 ${isDark ? "bg-slate-950 ring-slate-800" : "bg-white ring-slate-200"}`}>
          <div className={`grid grid-cols-[180px_repeat(3,minmax(220px,1fr))] text-xs font-semibold ${isDark ? "border-b border-slate-800 text-slate-300" : "border-b border-slate-200 text-slate-700"}`}>
            <div className="px-4 py-3">能力</div>
            <div className="px-4 py-3">未登录</div>
            <div className="px-4 py-3">免费用户（已登录）</div>
            <div className="px-4 py-3">付费用户（有余额）</div>
          </div>

          <div className={isDark ? "divide-y divide-slate-800" : "divide-y divide-slate-200"}>
            <PricingRow label="浏览天梯图（所有类型）" yes={[true, true, true]} isDark={isDark} />
            <PricingRow label="筛选/排序（含自定义公式）" yes={[true, true, true]} isDark={isDark} />
            <PricingRow label="查看模型详情" yes={[true, true, true]} isDark={isDark} />
            <PricingRow label="查看历史测评数据" yes={[true, true, true]} isDark={isDark} />
            <PricingRow label="收藏夹" yes={[false, true, true]} isDark={isDark} />
            <PricingRow label="余额充值" yes={[false, true, true]} isDark={isDark} />
            <PricingRow label="实际对比测评（¥2/模型/次）" yes={[false, false, true]} isDark={isDark} />
            <PricingRow label="MCP/Skill/Agent 试用（按次扣费）" yes={[false, false, true]} isDark={isDark} />
            <PricingRow label="线上开发环境（按时长扣费）" yes={[false, false, true]} isDark={isDark} />
          </div>
        </div>

        <div className={`mt-3 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          说明：本表为当前阶段的产品边界摘要，最终以站内“定价方案”页为准。
        </div>
      </section>

      <RightBottomDock isDark={isDark} />
    </div>
  );
}

type HeroSlide = {
  title: string;
  desc: string;
  imageSrc: string;
};

const HERO_SLIDES: HeroSlide[] = [
  {
    title: "扫一眼就能选模型",
    desc: "把性能、价格与场景放到同一个决策视图里。",
    imageSrc: "/images/banners/reference1.webp",
  },
  {
    title: "榜单、筛选、排序一体化",
    desc: "默认基准排序，也支持自定义公式排序。",
    imageSrc: "/images/banners/reference2.webp",
  },
  {
    title: "从资讯到案例",
    desc: "用教程与榜单解读，把差异讲清楚。",
    imageSrc: "/images/banners/reference3.webp",
  },
  {
    title: "企业场景更快落地",
    desc: "咨询、私有化与定制服务，少走弯路。",
    imageSrc: "/images/banners/reference4.webp",
  },
];

function HeroCarousel({ isDark }: { isDark: boolean }) {
  const [active, setActive] = useState(0);
  const [imageOk, setImageOk] = useState<Record<number, boolean>>(() => ({}));

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((v) => (v + 1) % HERO_SLIDES.length);
    }, 6500);

    return () => window.clearInterval(id);
  }, []);

  const slide = HERO_SLIDES[active];
  const showImage = imageOk[active] !== false;

  return (
    <div className="relative">
      <div className="relative h-[260px] w-full overflow-hidden sm:h-[320px] lg:h-[380px]">
        <div
          className={`absolute inset-0 ${
            isDark
              ? "bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.25),transparent_55%),linear-gradient(to_bottom,rgba(2,6,23,1),rgba(2,6,23,0.92))]"
              : "bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_55%),linear-gradient(to_bottom,rgba(248,250,252,1),rgba(248,250,252,0.92))]"
          }`}
        />

        {showImage && (
          <img
            key={slide.imageSrc}
            src={slide.imageSrc}
            alt={slide.title}
            className={`absolute inset-0 h-full w-full object-cover ${isDark ? "opacity-20" : "opacity-25"}`}
            onError={() => setImageOk((prev) => ({ ...prev, [active]: false }))}
          />
        )}

        <div className="absolute inset-0">
          <div className="mx-auto flex h-full max-w-[1920px] items-end px-4 pb-8 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <div className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Aidean · 首页</div>
              <div className={`mt-2 text-2xl font-semibold tracking-tight sm:text-3xl ${isDark ? "text-white" : "text-slate-900"}`}>
                {slide.title}
              </div>
              <div className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{slide.desc}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1920px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          {HERO_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActive(idx)}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                idx === active
                  ? isDark
                    ? "bg-white"
                    : "bg-slate-900"
                  : isDark
                    ? "bg-white/25 hover:bg-white/40"
                    : "bg-slate-900/20 hover:bg-slate-900/30"
              }`}
              aria-label={`切换到第 ${idx + 1} 张`}
            />
          ))}
        </div>

        <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>自动轮播 · {active + 1}/{HERO_SLIDES.length}</div>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  desc,
  meta,
  isDark,
}: {
  title: string;
  desc: string;
  meta: string;
  isDark: boolean;
}) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${isDark ? "bg-slate-950 ring-slate-800" : "bg-white ring-slate-200"}`}>
      <div className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{title}</div>
      <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>{desc}</div>
      <div className={`mt-3 text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>{meta}</div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  foot,
  isDark,
}: {
  title: string;
  value: string;
  foot: string;
  isDark: boolean;
}) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${isDark ? "bg-slate-950 ring-slate-800" : "bg-white ring-slate-200"}`}>
      <div className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>{title}</div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${isDark ? "text-white" : "text-slate-900"}`}>{value}</div>
      <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>{foot}</div>
    </div>
  );
}

function ServiceCard({ title, items, isDark }: { title: string; items: string[]; isDark: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${isDark ? "bg-slate-950 ring-slate-800" : "bg-white ring-slate-200"}`}>
      <div className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{title}</div>
      <div className="mt-3 space-y-2">
        {items.map((x) => (
          <div key={x} className={`flex items-start gap-2 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            <span className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full ${isDark ? "bg-white/10" : "bg-black/5"}`}>
              <Check className="h-3 w-3" aria-hidden />
            </span>
            <span className="leading-5">{x}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingRow({
  label,
  yes,
  isDark,
}: {
  label: string;
  yes: [boolean, boolean, boolean];
  isDark: boolean;
}) {
  return (
    <div className="grid grid-cols-[180px_repeat(3,minmax(220px,1fr))] text-sm">
      <div className={`px-4 py-3 text-xs font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{label}</div>
      {yes.map((v, idx) => (
        <div key={idx} className={`px-4 py-3 text-xs ${isDark ? "text-slate-300" : "text-slate-700"}`}>
          {v ? "✅" : "—"}
        </div>
      ))}
    </div>
  );
}

type ContentTab = "教程" | "排行榜解读" | "精选测评";

function ContentCases({ isDark }: { isDark: boolean }) {
  const [tab, setTab] = useState<ContentTab>("教程");

  const data = useMemo(() => {
    const common = {
      教程: [
        { title: "如何读懂性能天梯图：先看维度，再看差距", tag: "入门" },
        { title: "自定义排序公式怎么写：3 个常用模板", tag: "技巧" },
        { title: "如何用天梯图做选型报告（模板）", tag: "模板" },
      ],
      排行榜解读: [
        { title: "本周 Top5 变化：为什么某模型突然上升", tag: "周报" },
        { title: "性价比榜单解读：如何兼顾速度与价格", tag: "解读" },
        { title: "开源榜单解读：开源 ≠ 低门槛", tag: "解读" },
      ],
      精选测评: [
        { title: "长文本：5 个模型在 100K 上下文的差异", tag: "长文本" },
        { title: "代码生成：同题不同解的可维护性比较", tag: "Coding" },
        { title: "多模态推理：图像理解的真实差距", tag: "多模态" },
      ],
    } satisfies Record<ContentTab, { title: string; tag: string }[]>;

    return common[tab];
  }, [tab]);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["教程", "排行榜解读", "精选测评"] as ContentTab[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`h-10 rounded-xl px-4 text-sm font-semibold ring-1 transition-colors ${
              tab === k
                ? isDark
                  ? "bg-white/10 text-white ring-transparent"
                  : "bg-slate-900 text-white ring-transparent"
                : isDark
                  ? "bg-slate-950 text-slate-200 ring-slate-800 hover:bg-white/5"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {data.map((x) => (
          <div key={x.title} className={`rounded-2xl p-4 ring-1 ${isDark ? "bg-slate-950 ring-slate-800" : "bg-white ring-slate-200"}`}>
            <div className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${isDark ? "bg-white/10 text-slate-200" : "bg-black/5 text-slate-700"}`}>
              {x.tag}
            </div>
            <div className={`mt-3 text-sm font-semibold leading-6 ${isDark ? "text-slate-100" : "text-slate-900"}`}>{x.title}</div>
            <div className={`mt-3 text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>查看详情 →</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  foot,
  isDark,
}: {
  title: string;
  value: string;
  foot: string;
  isDark: boolean;
}) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${isDark ? "bg-slate-950 ring-slate-800" : "bg-white ring-slate-200"}`}>
      <div className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>{title}</div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${isDark ? "text-white" : "text-slate-900"}`}>{value}</div>
      <div className={`mt-1 text-xs ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>{foot}</div>
    </div>
  );
}

function FilterChip({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <button
      type="button"
      className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold ring-1 transition-colors ${
        isDark
          ? "bg-slate-900 text-slate-200 ring-slate-800 hover:bg-slate-900/70"
          : "bg-slate-50 text-slate-700 ring-slate-200 hover:bg-slate-100"
      }`}
      aria-label={label}
    >
      {label}
      <ChevronDown className={`h-4 w-4 ${isDark ? "text-slate-400" : "text-slate-500"}`} aria-hidden />
    </button>
  );
}

function MatrixPreviewTable({ isDark }: { isDark: boolean }) {
  return (
    <div className={`overflow-hidden rounded-2xl ring-1 ${isDark ? "bg-slate-950 ring-slate-800" : "bg-white ring-slate-200"}`}>
      <div className={`grid grid-cols-[100px_repeat(5,minmax(0,1fr))] text-xs font-semibold ${isDark ? "border-b border-slate-800 text-slate-300" : "border-b border-slate-200 text-slate-700"}`}>
        <div className="px-4 py-3">基准评分</div>
        {VENDORS.map((v) => (
          <div key={v} className="px-4 py-3">
            {v}
          </div>
        ))}
      </div>

      <div className={isDark ? "divide-y divide-slate-800" : "divide-y divide-slate-200"}>
        {SAMPLE_ROWS.map((row) => (
          <div key={row.score} className="grid grid-cols-[100px_repeat(5,minmax(0,1fr))] text-sm">
            <div className={`px-4 py-3 font-semibold tabular-nums ${isDark ? "text-slate-100" : "text-slate-900"}`}>{row.score}</div>
            {VENDORS.map((v) => (
              <div key={v} className={`px-4 py-3 ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                <span className="block truncate">{row.models[v] ?? ""}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function BarPreview({ isDark }: { isDark: boolean }) {
  const items = [
    { name: "OpenAI", v: 92 },
    { name: "Anthropic", v: 91 },
    { name: "Google", v: 89 },
    { name: "字节跳动", v: 88 },
    { name: "百度", v: 86 },
  ];

  return (
    <div className={`rounded-2xl p-4 ring-1 ${isDark ? "bg-slate-950 ring-slate-800" : "bg-white ring-slate-200"}`}>
      <div className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>预览：柱状图视图</div>
      <div className="mt-4 space-y-3">
        {items.map((it) => (
          <div key={it.name} className="grid grid-cols-[92px_1fr_48px] items-center gap-3">
            <div className={`text-xs font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>{it.name}</div>
            <div className={`h-2 overflow-hidden rounded-full ${isDark ? "bg-slate-900" : "bg-slate-100"}`}>
              <div className={`h-2 ${isDark ? "bg-emerald-500" : "bg-emerald-600"}`} style={{ width: `${Math.min(100, it.v)}%` }} />
            </div>
            <div className={`text-right text-xs font-bold tabular-nums ${isDark ? "text-slate-100" : "text-slate-900"}`}>{it.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewsCard({ title, items, isDark }: { title: string; items: string[]; isDark: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${isDark ? "bg-slate-950 ring-slate-800" : "bg-white ring-slate-200"}`}>
      <div className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-900"}`}>{title}</div>
      <div className="mt-3 space-y-2">
        {items.map((x) => (
          <div key={x} className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            {x}
          </div>
        ))}
      </div>
    </div>
  );
}

function EntryCard({ title, desc, href, isDark }: { title: string; desc: string; href: string; isDark: boolean }) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl p-4 ring-1 transition-colors ${
        isDark
          ? "bg-slate-950 ring-slate-800 hover:bg-slate-900/60"
          : "bg-white ring-slate-200 hover:bg-slate-50"
      }`}
      aria-label={title}
    >
      <div className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{title}</div>
      <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>{desc}</div>
      <div className={`mt-3 text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
        进入
        <ArrowRight className="ml-1 inline h-3.5 w-3.5" aria-hidden />
      </div>
    </Link>
  );
}

function EntryCardExternal({
  title,
  desc,
  href,
  isDark,
}: {
  title: string;
  desc: string;
  href: string;
  isDark: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group rounded-2xl p-4 ring-1 transition-colors ${
        isDark
          ? "bg-slate-950 ring-slate-800 hover:bg-slate-900/60"
          : "bg-white ring-slate-200 hover:bg-slate-50"
      }`}
      aria-label={title}
    >
      <div className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{title}</div>
      <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>{desc}</div>
      <div className={`mt-3 text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
        打开
        <ArrowRight className="ml-1 inline h-3.5 w-3.5" aria-hidden />
      </div>
    </a>
  );
}

function RightBottomDock({ isDark }: { isDark: boolean }) {
  return (
    <div className="fixed bottom-5 right-5 z-40">
      <div className={`w-[72px] overflow-hidden rounded-2xl ring-1 shadow-lg ${isDark ? "bg-slate-950 ring-slate-800" : "bg-white ring-black/10"}`}>
        <DockButton label="收藏" icon={<Bookmark className="h-4 w-4" />} isDark={isDark} />
        <DockButton label="对比" icon={<GitCompare className="h-4 w-4" />} isDark={isDark} />
        <DockButton label="客服" icon={<Headphones className="h-4 w-4" />} isDark={isDark} />
      </div>
    </div>
  );
}

function DockButton({ label, icon, isDark }: { label: string; icon: ReactNode; isDark: boolean }) {
  return (
    <button
      type="button"
      className={`flex h-14 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 ${
        isDark
          ? "text-slate-200 hover:bg-white/5 focus-visible:ring-white/30"
          : "text-black/80 hover:bg-black/5 focus-visible:ring-black/30"
      }`}
      aria-label={label}
    >
      {icon}
      {label}
    </button>
  );
}
