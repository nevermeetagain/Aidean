// 预设区间 → 日期窗口纯函数单测（控制台问题 A 修复）：
// 公式须与服务端 USAGE_STATS_RANGE_DAYS 同式（近 N 日 = 含今天的前 N 个自然日，本地时区）。
// 覆盖：三种预设、跨月、跨年、闰年 2 月、时区边界（本地 0-7 点 UTC 日期差一天）。
import { describe, expect, it } from "vitest";

import { PRESET_RANGE_DAYS, presetWindow } from "../usage-window";

/** 与服务端 service.ts 常量镜像断言：若服务端改口径，此处必须同步（编译期即失败） */
it("PRESET_RANGE_DAYS 与服务端 USAGE_STATS_RANGE_DAYS 同口径（7/30/90）", async () => {
  // 直接引用服务端常量，确保字节级一致；若 import 失败说明路径/命名漂移
  const svc = await import("../service");
  expect(svc.USAGE_STATS_RANGE_DAYS["7d"]).toBe(PRESET_RANGE_DAYS["7d"]);
  expect(svc.USAGE_STATS_RANGE_DAYS["30d"]).toBe(PRESET_RANGE_DAYS["30d"]);
  expect(svc.USAGE_STATS_RANGE_DAYS["90d"]).toBe(PRESET_RANGE_DAYS["90d"]);
});

/** 固定"今天"保证确定性：2026-09-30 15:30 本地（与 usage-stats.spec.ts 同款锚定） */
const TODAY = new Date(2026, 8, 30, 15, 30, 0);

describe("presetWindow（WF-22 控制台预设区间联动）", () => {
  it("7d → 含今天共 7 天，dateTo=今天、dateFrom=今天-6", () => {
    const w = presetWindow("7d", TODAY);
    expect(w.dateTo).toBe("2026-09-30");
    expect(w.dateFrom).toBe("2026-09-24");
  });

  it("30d → dateFrom=今天-29", () => {
    const w = presetWindow("30d", TODAY);
    expect(w.dateTo).toBe("2026-09-30");
    expect(w.dateFrom).toBe("2026-09-01");
  });

  it("90d → dateFrom=今天-89", () => {
    const w = presetWindow("90d", TODAY);
    expect(w.dateTo).toBe("2026-09-30");
    expect(w.dateFrom).toBe("2026-07-03");
  });

  it("跨月：2026-10-01 的 7d 回落到 9 月", () => {
    const w = presetWindow("7d", new Date(2026, 9, 1, 9, 0, 0));
    expect(w.dateTo).toBe("2026-10-01");
    expect(w.dateFrom).toBe("2026-09-25");
  });

  it("跨年：2026-01-03 的 7d 回落到 2025 年 12 月", () => {
    const w = presetWindow("7d", new Date(2026, 0, 3, 9, 0, 0));
    expect(w.dateTo).toBe("2026-01-03");
    expect(w.dateFrom).toBe("2025-12-28");
  });

  it("闰年 2 月：2024-02-29 当天窗口端点正确", () => {
    const w = presetWindow("30d", new Date(2024, 1, 29, 12, 0, 0));
    expect(w.dateTo).toBe("2024-02-29");
    expect(w.dateFrom).toBe("2024-01-31");
  });

  it("时区边界：本地 0-7 点，UTC 日期差一天——必须按本地时区输出（禁 toISOString）", () => {
    // 北京时间 2026-09-30 05:30 = UTC 2026-09-29 21:30；若用 toISOString 会得 09-29（错误）
    const w = presetWindow("7d", new Date(2026, 8, 30, 5, 30, 0));
    expect(w.dateTo).toBe("2026-09-30");
    expect(w.dateFrom).toBe("2026-09-24");
  });

  it("不修改入参 today", () => {
    const t = new Date(2026, 8, 30, 15, 30, 0);
    const snapshot = t.getTime();
    void presetWindow("30d", t);
    expect(t.getTime()).toBe(snapshot);
  });

  it("窗口端点与服务端 buildUsageStats 零填充序列头尾对齐（跨月示例）", async () => {
    const svc = await import("../service");
    const w = presetWindow("30d", TODAY);
    // buildUsageStats 用 USAGE_STATS_RANGE_DAYS + end 零点回推，输出 daily[0]/daily[n-1] 应与窗口端点一致
    const view = svc.buildUsageStats([], "30d", TODAY);
    expect(view.daily[0]?.day).toBe(w.dateFrom);
    expect(view.daily[view.daily.length - 1]?.day).toBe(w.dateTo);
  });
});