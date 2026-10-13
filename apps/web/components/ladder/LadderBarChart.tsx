"use client";

/**
 * 天梯柱状图视图（Task L.4.2 / M-LADDER T2.5 排行化适配）：
 * rows 展平为各厂商最高综合分 Top12 → 现改为综合分 Top12 模型直出（排行口径一致）。
 * - EChartWrapper 经 next/dynamic 异步加载（echarts 不入公共 bundle）；
 *   依赖 @aidean/ui EChartWrapper（T-5.1.2 已修正 workspace 依赖）；
 * - echarts 无法解析 CSS 变量，柱色默认从 getComputedStyle 读取 --primary；
 *   每柱着色优先用该模型厂商品牌色（vendorBrandColor）；
 * - 点击柱体跳转对应模型详情（canvas 无语义 DOM，router.push 为妥协项）。
 */
import type { ECInstanceLike } from "@aidean/ui/charts";
import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { LadderRankEntry } from "../../lib/features/ladder/types";
import type { LadderPageType } from "../../stores/ladderStore";

const EChartWrapper = dynamic(
  () => import("@aidean/ui/charts").then((mod) => mod.EChartWrapper),
  {
    ssr: false,
    loading: () => <div className="h-[360px] w-full animate-pulse rounded-lg bg-muted" />,
  }
);

const TOP_N = 12;

interface ModelBar {
  name: string;
  score: number;
  modelId: string;
  slug: string | null;
  color: string | null;
}

function topModelBars(entries: LadderRankEntry[]): ModelBar[] {
  return entries.slice(0, TOP_N).map((entry) => ({
    name: entry.modelName,
    score: entry.score.composite,
    modelId: entry.modelId,
    slug: entry.slug,
    color: entry.vendorBrandColor,
  }));
}

interface LadderBarChartProps {
  entries: LadderRankEntry[];
  /**
   * 榜单类型（WP-FE01）：stations 榜的「条目」是 API 站点而非模型，不存在模型详情页，
   * 故不注册点击跳转（避免落到 /models/<stationId> 的「该模型暂未收录」死链）。
   */
  pageType?: LadderPageType;
}

export function LadderBarChart({ entries, pageType = "models" }: LadderBarChartProps) {
  const router = useRouter();
  const bars = useMemo(() => topModelBars(entries), [entries]);
  const [primaryColor] = useState(() => {
    try {
      return getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#4f46e5";
    } catch {
      return "#4f46e5";
    }
  });

  // onReady 仅挂载一次，经 ref 持有最新映射避免 stale closure
  const barsRef = useRef(bars);
  barsRef.current = bars;

  const option = useMemo<Record<string, unknown>>(
    () => ({
      grid: { left: 16, right: 16, top: 24, bottom: 8, containLabel: true },
      tooltip: {
        trigger: "item",
        formatter: (params: { data?: { value?: number } }) => {
          const value = typeof params?.data?.value === "number" ? params.data.value : "-";
          return `综合分：${value}`;
        },
      },
      xAxis: {
        type: "category",
        data: bars.map((bar) => bar.name),
        axisLabel: { rotate: 30, interval: 0, color: "#475569", fontSize: 11 },
        axisTick: { alignWithLabel: true },
      },
      yAxis: { type: "value", min: 0, max: 100 },
      series: [
        {
          name: "综合分 Top12",
          type: "bar",
          barMaxWidth: 42,
          data: bars.map((bar) => ({
            value: bar.score,
            name: bar.name,
            modelId: bar.modelId,
            slug: bar.slug,
            itemStyle: { color: bar.color || primaryColor, borderRadius: [4, 4, 0, 0] },
          })),
        },
      ],
    }),
    [bars, primaryColor]
  );

  function handleReady(instance: ECInstanceLike) {
    // stations 榜无模型详情页 → 不注册跳转（见 props.pageType 说明）
    if (pageType === "stations") return;
    // canvas 内无语义 DOM，无法 Link 化（预取妥协项，M-PERF A4 验收注记）；
    // 点击跳转 slug 优先回退 modelId。
    instance.on?.("click", (params) => {
      const data = params?.data as { modelId?: string; slug?: string | null } | undefined;
      const target = data?.slug ?? data?.modelId;
      if (target) router.push(`/models/${target}`);
    });
  }

  if (!bars.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
        暂无数据
      </div>
    );
  }

  return (
    <div className="h-[380px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-sm)]">
      <EChartWrapper option={option} className="h-full" onReady={handleReady} />
    </div>
  );
}
