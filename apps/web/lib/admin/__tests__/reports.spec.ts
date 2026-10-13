import { describe, expect, it } from "vitest";

import { buildReportView, type RechargeRow, type UsageDailyGroup } from "../reports-core";
import { buildReportModelRankOption, buildReportTrendOption } from "../reports-chart-option";

/** 固定基准时刻：本地 2026-10-12 12:00 */
const NOW = new Date(2026, 9, 12, 12, 0, 0);
const dayStr = (offsetFromToday: number): Date => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - offsetFromToday);
  d.setHours(0, 0, 0, 0);
  return d;
};

function usage(day: Date, calls: number, quotaMinor: bigint): UsageDailyGroup {
  return { day, _sum: { requestCount: calls, quotaMinor } };
}
function recharge(day: Date, amountMinor: bigint): RechargeRow {
  return { paidAt: day, amountMinor };
}

describe("buildReportView（S8.1 报表聚合）", () => {
  it("零填充完整日序列（days=7 → 7 个点，含今天）", () => {
    const view = buildReportView({
      days: 7,
      usageDaily: [usage(dayStr(0), 5, 1000n)],
      modelTop: [],
      rechargeRows: [],
      activeUsers: 3,
      now: NOW,
    });
    expect(view.daily).toHaveLength(7);
    expect(view.range.to).toBe("2026-10-12");
    expect(view.range.from).toBe("2026-10-06");
    expect(view.daily[6].calls).toBe(5);
    expect(view.daily[6].quotaYuan).toBe("10.00");
    // 其余日零填充
    expect(view.daily[0].calls).toBe(0);
    expect(view.daily[0].quotaYuan).toBe("0.00");
  });

  it("充值按当日归并 + totals 求和", () => {
    const view = buildReportView({
      days: 3,
      usageDaily: [usage(dayStr(2), 4, 2000n), usage(dayStr(0), 6, 3000n)],
      modelTop: [{ model: "gpt-x", _sum: { requestCount: 10, quotaMinor: 5000n } }],
      rechargeRows: [recharge(dayStr(1), 50000n), recharge(dayStr(1), 25000n)],
      activeUsers: 2,
      now: NOW,
    });
    expect(view.daily).toHaveLength(3);
    // 昨天有 2 笔充值 75000 分 = 750.00 元
    expect(view.daily[1].rechargeOrders).toBe(2);
    expect(view.daily[1].rechargeYuan).toBe("750.00");
    expect(view.totals.calls).toBe(10);
    expect(view.totals.quotaYuan).toBe("50.00");
    expect(view.totals.rechargeYuan).toBe("750.00");
    expect(view.totals.rechargeOrders).toBe(2);
    expect(view.totals.activeUsers).toBe(2);
    expect(view.modelTop[0]).toEqual({ model: "gpt-x", calls: 10, quotaYuan: "50.00" });
  });

  it("越界行防御性跳过（早于 from 的行不计入序列）", () => {
    const view = buildReportView({
      days: 3,
      usageDaily: [usage(dayStr(10), 999, 999999n)],
      modelTop: [],
      rechargeRows: [recharge(dayStr(30), 1n)],
      activeUsers: 0,
      now: NOW,
    });
    expect(view.totals.calls).toBe(0);
    expect(view.totals.rechargeOrders).toBe(0);
  });
});

describe("报表图表 option builder（S8.1）", () => {
  const colors = { primary: "#4f46e5", accent: "#0ea5e9" };
  const daily = buildReportView({
    days: 2,
    usageDaily: [usage(dayStr(1), 3, 100n), usage(dayStr(0), 5, 200n)],
    modelTop: [
      { model: "a", _sum: { requestCount: 9, quotaMinor: 1n } },
      { model: "b", _sum: { requestCount: 1, quotaMinor: 1n } },
    ],
    rechargeRows: [recharge(dayStr(0), 900n)],
    activeUsers: 1,
    now: NOW,
  });

  it("趋势图三条序列长度对齐日序列", () => {
    const opt = buildReportTrendOption(daily.daily, colors, false);
    const series = opt.series as Array<{ name: string; data: unknown[] }>;
    expect(series).toHaveLength(3);
    expect(series[0].data).toHaveLength(2);
    expect(series[0].data[1]).toBe(5);
    expect(opt.animation).toBe(false);
  });

  it("模型排行反转使 Top1 在末位（渲染置顶）", () => {
    const opt = buildReportModelRankOption(daily.modelTop, colors.primary, true);
    const yAxis = opt.yAxis as { data: string[] };
    const series = opt.series as Array<{ data: number[] }>;
    expect(yAxis.data).toEqual(["b", "a"]);
    expect(series[0].data).toEqual([1, 9]);
  });
});
