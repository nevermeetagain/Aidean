/**
 * 统计报表图表 option 纯函数 builder（WF-22 / AT-22.2.3）：
 * data → echarts option 的纯转换，不触碰 DOM/状态，可独立单测；
 * 颜色由调用方经 getComputedStyle 读取 CSS 变量后注入（echarts 不解析 var()）。
 */
import type { UsageStatsDailyPoint, UsageStatsModelRow } from "@aidean/shared";

type ChartOption = Record<string, unknown>;

/** 每日趋势（双轴：Tokens 左轴 / 花费 元 右轴） */
export function buildDailyTrendOption(
  daily: UsageStatsDailyPoint[],
  colors: { primary: string; accent: string },
  animation: boolean
): ChartOption {
  return {
    animation,
    tooltip: { trigger: "axis" },
    legend: { data: ["Tokens", "花费（元）"], bottom: 0, icon: "roundRect", itemHeight: 3 },
    grid: { left: 56, right: 56, top: 36, bottom: 44 },
    xAxis: { type: "category", data: daily.map((p) => p.day.slice(5)), boundaryGap: false },
    yAxis: [
      { type: "value", name: "Tokens", splitLine: { lineStyle: { opacity: 0.4 } } },
      { type: "value", name: "元", splitLine: { show: false } },
    ],
    series: [
      {
        name: "Tokens",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: daily.map((p) => p.tokens),
        itemStyle: { color: colors.primary },
        areaStyle: { opacity: 0.08 },
      },
      {
        name: "花费（元）",
        type: "line",
        smooth: true,
        showSymbol: false,
        yAxisIndex: 1,
        data: daily.map((p) => Number(p.quotaYuan)),
        itemStyle: { color: colors.accent },
      },
    ],
  };
}

/** 模型 TopN 横向条形（数组反转使 Top1 渲染在最上方） */
export function buildModelRankOption(
  models: UsageStatsModelRow[],
  primaryColor: string,
  animation: boolean
): ChartOption {
  const sorted = [...models].reverse();
  return {
    animation,
    tooltip: { trigger: "axis" },
    grid: { left: 8, right: 28, top: 10, bottom: 10, containLabel: true },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: sorted.map((m) => m.model) },
    series: [
      {
        name: "Tokens",
        type: "bar",
        barMaxWidth: 16,
        data: sorted.map((m) => m.tokens),
        itemStyle: { color: primaryColor, borderRadius: [0, 4, 4, 0] },
      },
    ],
  };
}
