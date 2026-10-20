// TASK-047 · 日汇率快照读取（Prisma mock）
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaState = vi.hoisted(() => ({ fxDailyRate: { findFirst: vi.fn() } }));
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));

const { getDailyFx, clearDailyFxCache } = await import("../fx");

const row = (date: string, rate = "7.1234") => ({ rateDate: new Date(`${date}T00:00:00Z`), rate: { toString: () => rate } });
// 2026-10-20 10:00 CST
const AT = new Date("2026-10-20T02:00:00Z");

describe("getDailyFx（TASK-047）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDailyFxCache();
  });

  it("当日快照 → stale=false；查询条件为 USD/CNY 且 rate_date ≤ 汇率日（Asia/Shanghai）", async () => {
    prismaState.fxDailyRate.findFirst.mockResolvedValue(row("2026-10-20"));
    const fx = await getDailyFx(AT);
    expect(fx).toEqual({ date: "2026-10-20", usdCny: "7.1234", stale: false, forDate: "2026-10-20" });
    expect(prismaState.fxDailyRate.findFirst).toHaveBeenCalledWith({
      where: { base: "USD", quote: "CNY", rateDate: { lte: new Date("2026-10-20T00:00:00Z") } },
      orderBy: { rateDate: "desc" },
      select: { rateDate: true, rate: true },
    });
  });

  it("UTC 16:00 后按上海次日取汇率日", async () => {
    prismaState.fxDailyRate.findFirst.mockResolvedValue(row("2026-10-21"));
    const fx = await getDailyFx(new Date("2026-10-20T16:30:00Z"));
    expect(fx?.forDate).toBe("2026-10-21");
  });

  it("当日缺失、最近一行在 3 天内 → 回退且 stale=true", async () => {
    prismaState.fxDailyRate.findFirst.mockResolvedValue(row("2026-10-17", "7.10"));
    expect(await getDailyFx(AT)).toEqual({ date: "2026-10-17", usdCny: "7.10", stale: true, forDate: "2026-10-20" });
  });

  it("超过陈旧上限或无行 → null（fail-closed）", async () => {
    prismaState.fxDailyRate.findFirst.mockResolvedValueOnce(row("2026-10-16"));
    expect(await getDailyFx(AT)).toBeNull();
    clearDailyFxCache();
    prismaState.fxDailyRate.findFirst.mockResolvedValueOnce(null);
    expect(await getDailyFx(AT)).toBeNull();
  });

  it("同一汇率日 10 分钟内只查一次库（同一天全站同一个汇率）", async () => {
    prismaState.fxDailyRate.findFirst.mockResolvedValue(row("2026-10-20"));
    let t = 0;
    const now = () => t;
    await getDailyFx(AT, now);
    t = 9 * 60 * 1000;
    await getDailyFx(new Date("2026-10-20T08:00:00Z"), now);
    expect(prismaState.fxDailyRate.findFirst).toHaveBeenCalledTimes(1);
    t = 11 * 60 * 1000;
    await getDailyFx(AT, now);
    expect(prismaState.fxDailyRate.findFirst).toHaveBeenCalledTimes(2);
  });
});
