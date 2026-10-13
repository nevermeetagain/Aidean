// 用量统计聚合单测（WF-21 / AT-21.3.2）：
// buildUsageStats 纯函数 —— 零填充、跨日聚合、模型 TopN、越界防御、汇总一致性。
import { describe, expect, it } from "vitest";

import { validateUsageWindow } from "@aidean/shared";

import {
  buildUsageBreakdown,
  buildUsageStats,
  buildUsageStatsWindow,
  USAGE_STATS_RANGE_DAYS,
  type UsageBreakdownGroupRow,
  type UsageDailyStatRow,
} from "../service";

/** 固定“今天”保证断言确定性：2026-09-30（本地时区） */
const TODAY = new Date(2026, 8, 30, 15, 30, 0);
const day = (m: number, d: number) => new Date(2026, m, d, 0, 0, 0);

function row(partial: Partial<UsageDailyStatRow> & { day: Date; model?: string }): UsageDailyStatRow {
  return {
    model: "glm-5.3-flash",
    requestCount: 1,
    quotaMinor: 100n,
    promptTokens: 10,
    completionTokens: 20,
    ...partial,
  };
}

describe("buildUsageStats（WF-21 统计聚合）", () => {
  it("空数据 → 全区间零填充序列（新用户返回全零点列）", () => {
    const view = buildUsageStats([], "7d", TODAY);
    expect(view.daily).toHaveLength(7);
    expect(view.daily[6]?.day).toBe("2026-09-30");
    expect(view.daily[0]?.day).toBe("2026-09-24");
    for (const p of view.daily) {
      expect(p.requestCount).toBe(0);
      expect(p.tokens).toBe(0);
      expect(p.quotaYuan).toBe("0.00");
    }
    expect(view.summary).toEqual({ totalRequests: 0, totalTokens: 0, totalQuotaYuan: "0.00" });
    expect(view.models).toEqual([]);
  });

  it("空数据 + 90d 上限区间 → 90 天全零点序列（边界护栏，#81⑥）", () => {
    const view = buildUsageStats([], "90d", TODAY);
    expect(view.daily).toHaveLength(90);
    expect(view.daily[0]?.day).toBe("2026-07-03");
    expect(view.daily[89]?.day).toBe("2026-09-30");
    for (const p of view.daily) {
      expect(p.requestCount).toBe(0);
      expect(p.tokens).toBe(0);
      expect(p.quotaYuan).toBe("0.00");
    }
    expect(view.summary).toEqual({ totalRequests: 0, totalTokens: 0, totalQuotaYuan: "0.00" });
    expect(view.models).toEqual([]);
  });

  it("跨日聚合：tokens=prompt+completion、quotaMinor 分→元、按日正确归桶", () => {
    const rows: UsageDailyStatRow[] = [
      row({ day: day(8, 29), requestCount: 2, promptTokens: 100, completionTokens: 50, quotaMinor: 1234n }),
      row({ day: day(8, 30), model: "deepseek-v4.1-flash", promptTokens: 7, completionTokens: 3, quotaMinor: 76n }),
      row({ day: day(8, 30), promptTokens: 1, completionTokens: 2, quotaMinor: 30n }),
    ];
    const view = buildUsageStats(rows, "30d", TODAY);
    const d29 = view.daily.find((p) => p.day === "2026-09-29");
    const d30 = view.daily.find((p) => p.day === "2026-09-30");
    expect(d29).toMatchObject({ requestCount: 2, tokens: 150, quotaYuan: "12.34" });
    expect(d30).toMatchObject({ requestCount: 2, tokens: 13, quotaYuan: "1.06" });
    expect(view.summary.totalRequests).toBe(4);
    expect(view.summary.totalTokens).toBe(163);
    expect(view.summary.totalQuotaYuan).toBe("13.40");
  });

  it("模型 TopN：按 tokens 降序、tokens 并列按请求数降序", () => {
    const rows: UsageDailyStatRow[] = [
      row({ day: day(8, 30), model: "a", promptTokens: 10, completionTokens: 0, requestCount: 1 }),
      row({ day: day(8, 30), model: "b", promptTokens: 20, completionTokens: 0, requestCount: 1 }),
      row({ day: day(8, 30), model: "c", promptTokens: 10, completionTokens: 0, requestCount: 5 }),
    ];
    const view = buildUsageStats(rows, "7d", TODAY);
    expect(view.models.map((m) => m.model)).toEqual(["b", "c", "a"]);
  });

  it("越界行防御：区间外日期不落入任何桶", () => {
    const rows: UsageDailyStatRow[] = [
      row({ day: day(7, 1), promptTokens: 999, completionTokens: 999, quotaMinor: 9999n }),
    ];
    const view = buildUsageStats(rows, "7d", TODAY);
    expect(view.summary.totalTokens).toBe(0);
    expect(view.summary.totalQuotaYuan).toBe("0.00");
  });

  it("range 硬上限映射：7d/30d/90d", () => {
    expect(USAGE_STATS_RANGE_DAYS).toEqual({ "7d": 7, "30d": 30, "90d": 90 });
    expect(buildUsageStats([], "90d", TODAY).daily).toHaveLength(90);
  });
});

describe("buildUsageStatsWindow（问题 4：自定义日期区间）", () => {
  it("闭区间零填充：[09-27,09-30] 得 4 天，端点与总量正确", () => {
    const rows: UsageDailyStatRow[] = [
      row({ day: day(8, 27), promptTokens: 10, completionTokens: 5, quotaMinor: 150n }),
      row({ day: day(8, 30), promptTokens: 1, completionTokens: 1, quotaMinor: 200n }),
    ];
    const view = buildUsageStatsWindow(rows, "2026-09-27", "2026-09-30");
    expect(view.daily).toHaveLength(4);
    expect(view.from).toBe("2026-09-27");
    expect(view.to).toBe("2026-09-30");
    expect(view.range).toBeUndefined();
    expect(view.summary).toEqual({ totalRequests: 2, totalTokens: 17, totalQuotaYuan: "3.50" });
    // 中间两日零填充
    expect(view.daily.find((p) => p.day === "2026-09-28")?.requestCount).toBe(0);
  });
});

describe("validateUsageWindow（区间校验）", () => {
  it("成对缺一无效；有序且≤上限有效；超 92 天拒绝", () => {
    expect(validateUsageWindow(undefined, undefined).ok).toBe(true);
    expect(validateUsageWindow("2026-09-01", undefined).ok).toBe(false);
    expect(validateUsageWindow("2026-09-05", "2026-09-01").ok).toBe(false);
    const ok = validateUsageWindow("2026-09-01", "2026-09-10");
    expect(ok).toMatchObject({ ok: true, days: 10 });
    expect(validateUsageWindow("2026-01-01", "2026-09-01").ok).toBe(false);
  });
});

describe("buildUsageBreakdown（问题 4：渠道×模型×计费路径）", () => {
  const g = (partial: Partial<UsageBreakdownGroupRow> & { model: string }): UsageBreakdownGroupRow => ({
    stationId: null,
    channelId: null,
    billingPath: "PLATFORM",
    _count: 1,
    _sum: { promptTokens: 0, completionTokens: 0, quotaMinor: 0n },
    ...partial,
  });

  it("来源解析：channel 优先→station→平台；名称映射；汇总与排序", () => {
    const groups: UsageBreakdownGroupRow[] = [
      g({
        channelId: "ch-1",
        model: "glm-4.5",
        billingPath: "FREE_PROXY",
        _count: 3,
        _sum: { promptTokens: 100, completionTokens: 50, quotaMinor: 0n },
      }),
      g({
        stationId: "st-1",
        model: "claude-3.5",
        billingPath: "UPSTREAM",
        _count: 2,
        _sum: { promptTokens: 200, completionTokens: 100, quotaMinor: 888n },
      }),
      g({
        model: "gpt-4o",
        billingPath: "PLATFORM",
        _count: 1,
        _sum: { promptTokens: 10, completionTokens: 5, quotaMinor: 100n },
      }),
    ];
    const view = buildUsageBreakdown(groups, {
      from: new Date(2026, 8, 24),
      to: new Date(2026, 8, 30),
      stationNames: new Map([["st-1", "站点A"]]),
      channelNames: new Map([["ch-1", "我的渠道"]]),
    });
    expect(view.from).toBe("2026-09-24");
    expect(view.to).toBe("2026-09-30");
    expect(view.summary).toEqual({ totalRequests: 6, totalTokens: 465, totalQuotaYuan: "9.88" });
    // tokens 降序：站点A(300) > 我的渠道(150) > 平台(15)
    expect(view.rows.map((r) => r.sourceType)).toEqual(["station", "channel", "platform"]);
    expect(view.rows[0]).toMatchObject({ source: "站点A", billingPath: "UPSTREAM", requestCount: 2 });
    expect(view.rows[1]).toMatchObject({ source: "我的渠道", sourceType: "channel", billingPath: "FREE_PROXY" });
    expect(view.rows[2]).toMatchObject({ source: "平台", billingPath: "PLATFORM", quotaYuan: "1.00" });
  });

  it("未知 channelId（已删）回落占位名；越界 billingPath 回落 PLATFORM", () => {
    const groups: UsageBreakdownGroupRow[] = [
      g({ channelId: "gone", model: "x", billingPath: "WEIRD" as never }),
    ];
    const view = buildUsageBreakdown(groups, {
      from: new Date(2026, 8, 1),
      to: new Date(2026, 8, 2),
      stationNames: new Map(),
      channelNames: new Map(),
    });
    expect(view.rows[0].sourceType).toBe("channel");
    expect(view.rows[0].source).toContain("渠道");
    expect(view.rows[0].billingPath).toBe("PLATFORM");
  });
});
