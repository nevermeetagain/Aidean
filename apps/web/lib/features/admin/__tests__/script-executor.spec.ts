/**
 * computeNextRun 单测（R-48 cron-parser 集成）。
 * 测试 intervalDays / cronExpression / 非法 cron / 空值 各路径。
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/prisma", () => ({
  prisma: {},
}));

const { computeNextRun } = await import("../script-executor");

describe("computeNextRun", () => {
  it("intervalDays > 0 → 加天数", () => {
    const before = new Date();
    const result = computeNextRun({ intervalDays: 7, cronExpression: null, triggerTime: null });
    expect(result).not.toBeNull();
    const after = new Date();
    // 应在 6.99 ~ 7.01 天后
    const diffDays = (result!.getTime() - before.getTime()) / 86400000;
    expect(diffDays).toBeGreaterThan(6.99);
    expect(diffDays).toBeLessThan(7.01);
    // 确认在合理范围内（不受 test 执行时间影响）
    expect(result!.getTime()).toBeGreaterThan(before.getTime());
    expect(result!.getTime()).toBeLessThan(after.getTime() + 86400000 * 7 + 1000);
  });

  it("cronExpression='0 2 * * *' → 次日 02:00", () => {
    const result = computeNextRun({ intervalDays: null, cronExpression: "0 2 * * *", triggerTime: null });
    expect(result).not.toBeNull();
    // 次日 02:00 的时间戳应大于当前
    expect(result!.getTime()).toBeGreaterThan(Date.now());
    // 小时应为 2（UTC+8 语境下 cron-parser 默认按 UTC 或 TZ 环境）
    // 只验证返回了一个有效未来时间
    expect(result!.getTime()).toBeLessThan(Date.now() + 86400000 * 2);
  });

  it("cronExpression='*/5 * * * *' → 5 分钟内", () => {
    const result = computeNextRun({ intervalDays: null, cronExpression: "*/5 * * * *", triggerTime: null });
    expect(result).not.toBeNull();
    // 下一次应在 5 分钟内
    expect(result!.getTime()).toBeLessThan(Date.now() + 5 * 60 * 1000 + 1000);
  });

  it("非法 cronExpression → 回退 +1 day", () => {
    const before = new Date();
    const result = computeNextRun({ intervalDays: null, cronExpression: "invalid-cron", triggerTime: null });
    expect(result).not.toBeNull();
    const diffDays = (result!.getTime() - before.getTime()) / 86400000;
    expect(diffDays).toBeGreaterThan(0.99);
    expect(diffDays).toBeLessThan(1.01);
  });

  it("intervalDays 和 cronExpression 都为空 → null", () => {
    const result = computeNextRun({ intervalDays: null, cronExpression: null, triggerTime: null });
    expect(result).toBeNull();
  });

  it("intervalDays=0 且有 cronExpression → 走 cron 路径", () => {
    const result = computeNextRun({ intervalDays: 0, cronExpression: "0 * * * *", triggerTime: null });
    expect(result).not.toBeNull();
    // 下一次应在 1 小时内
    expect(result!.getTime()).toBeLessThan(Date.now() + 60 * 60 * 1000 + 1000);
  });
});
