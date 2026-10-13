/**
 * S8.1 报表看板图表 option 纯函数 builder（可独立单测，不触碰 DOM/状态）。
 * 颜色由调用方经 getComputedStyle 读取 CSS 变量后注入（echarts 不解析 var()）。
 */
import type { AdminReportDailyPoint, AdminReportModelRow } from "@aidean/shared";

type ChartOption = Record<string, unknown>;

/** 时间×指标二维图：调用次数（柱，左轴）+ 消耗元/充值元（线，右轴）。 */
export function buildReportTrendOption(
  daily: AdminReportDailyPoint[],
  colors: { primary: string; accent: string },
  animation: boolean
): ChartOption {
  return {
    animation,
    tooltip: { trigger: "axis" },
    legend: { data: ["调用次数", "消耗（元）", "充值（元）"], bottom: 0, icon: "roundRect", itemHeight: 3 },
    grid: { left: 56, right: 56, top: 36, bottom: 44 },
    xAxis: { type: "category", data: daily.map((p) => p.day.slice(5)), boundaryGap: true },
    yAxis: [
      { type: "value", name: "次数", minInterval: 1, splitLine: { lineStyle: { opacity: 0.4 } } },
      { type: "value", name: "元", splitLine: { show: false } },
    ],
    series: [
      {
        name: "调用次数",
        type: "bar",
        barMaxWidth: 18,
        data: daily.map((p) => p.calls),
        itemStyle: { color: colors.primary, borderRadius: [4, 4, 0, 0] },
      },
      {
        name: "消耗（元）",
        type: "line",
        smooth: true,
        showSymbol: false,
        yAxisIndex: 1,
        data: daily.map((p) => Number(p.quotaYuan)),
        itemStyle: { color: colors.accent },
      },
      {
        name: "充值（元）",
        type: "line",
        smooth: true,
        showSymbol: false,
        yAxisIndex: 1,
        data: daily.map((p) => Number(p.rechargeYuan)),
        itemStyle: { color: "#f59e0b" },
      },
    ],
  };
}

/** 模型 TopN 横向条形（按调用次数；数组反转使 Top1 渲染在最上方）。 */
export function buildReportModelRankOption(
  models: AdminReportModelRow[],
  primaryColor: string,
  animation: boolean
): ChartOption {
  const sorted = [...models].reverse();
  return {
    animation,
    tooltip: { trigger: "axis" },
    grid: { left: 8, right: 28, top: 10, bottom: 10, containLabel: true },
    xAxis: { type: "value", minInterval: 1 },
    yAxis: { type: "category", data: sorted.map((m) => m.model) },
    series: [
      {
        name: "调用次数",
        type: "bar",
        barMaxWidth: 16,
        data: sorted.map((m) => m.calls),
        itemStyle: { color: primaryColor, borderRadius: [0, 4, 4, 0] },
      },
    ],
  };
}
