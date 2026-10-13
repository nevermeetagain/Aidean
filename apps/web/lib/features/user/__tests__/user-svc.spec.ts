/**
 * userService 单测（Task A.2.1；≥7 用例）——文件名 user-svc 对齐验证命令 `test user-svc`。
 *
 * 策略：vi.mock lib/db/prisma（经 hoisted 共享状态）；service 静态链路真实执行，
 * 重点覆盖读侧视图组装与四个导出纯函数（tierLabelOf/injectFreeRow/nextResetAt/groupQuotasByCycle）。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FREE_FALLBACK_PRIORITY } from "@aidean/shared";

const prismaState = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  priority: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
  mapping: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
  freeQuota: { findMany: vi.fn() },
  quotaUsage: { findUnique: vi.fn() },
}));

vi.mock("../../../db/prisma", () => ({
  prisma: {
    user: prismaState.user,
    userModelPriority: prismaState.priority,
    userTierMapping: prismaState.mapping,
    userFreeQuota: prismaState.freeQuota,
    userQuotaUsage: prismaState.quotaUsage,
    $transaction: vi.fn(),
  },
}));

import {
  groupQuotasByCycle,
  injectFreeRow,
  nextResetAt,
  tierLabelOf,
  userService,
} from "../service";
import { TIER_FULL_LABEL, TIER_SHORT_LABEL } from "../tier";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("userService 读侧", () => {
  it("① getProfile 无钱包用户 → balanceYuan='0.00'，tier=NORMAL 映射『普通用户』", async () => {
    prismaState.user.findUnique.mockResolvedValueOnce({
      id: "u-1",
      email: "a@b.co",
      nickname: null,
      tier: "NORMAL",
      wallet: null,
    });
    const profile = await userService.getProfile("u-1");
    expect(profile.balanceYuan).toBe("0.00");
    expect(profile.tierLabel).toBe("普通用户");
    expect(profile.tier).toBe("NORMAL");
  });

  it("② getProfile 余额 1234 分 → fenToYuan 出参 '12.34' 恒为两位小数形态", async () => {
    prismaState.user.findUnique.mockResolvedValueOnce({
      id: "u-2",
      email: "b@b.co",
      nickname: "阿典",
      tier: "PRO",
      wallet: { balanceMinor: 1234n },
    });
    const profile = await userService.getProfile("u-2");
    expect(profile.balanceYuan).toBe("12.34");
    // 整数分也固定两位小数：500 分 → '5.00'
    prismaState.user.findUnique.mockResolvedValueOnce({
      id: "u-2",
      email: "b@b.co",
      nickname: "阿典",
      tier: "PRO",
      wallet: { balanceMinor: 500n },
    });
    expect((await userService.getProfile("u-2")).balanceYuan).toMatch(/^\d+\.\d{2}$/);
    expect(profile.tierLabel).toBe("Pro 用户");
  });

  it("③ tierLabelOf 纯函数三档映射 NORMAL/PRO/MAX 全覆盖", () => {
    expect(tierLabelOf("NORMAL")).toBe("普通用户");
    expect(tierLabelOf("PRO")).toBe("Pro 用户");
    expect(tierLabelOf("MAX")).toBe("Max 用户");
  });

  it("③b TIER_SHORT_LABEL 单源形状：三档键集与全名表一致且值非空（admin option/徽章渲染源护栏，#81⑤）", () => {
    const keys = Object.keys(TIER_SHORT_LABEL) as Array<keyof typeof TIER_SHORT_LABEL>;
    expect(keys).toEqual(["NORMAL", "PRO", "MAX"]);
    expect(Object.keys(TIER_FULL_LABEL)).toEqual(keys);
    for (const k of keys) {
      expect(TIER_SHORT_LABEL[k].length).toBeGreaterThan(0);
      expect(TIER_FULL_LABEL[k].length).toBeGreaterThan(0);
    }
  });

  it("④ injectFreeRow 纯函数：free 行恒在且置尾 readOnly，不改动入参数组", () => {
    const rows = [
      { modelId: "m-a", modelName: "GPT-4o", priority: 1 },
      { modelId: "m-b", modelName: "Claude", priority: 50 },
    ];
    const snapshot = [...rows];
    const out = injectFreeRow(rows);
    // 入参不可变
    expect(rows).toEqual(snapshot);
    // 行数 +1，尾行为只读 free 行
    expect(out).toHaveLength(3);
    const freeRow = out[out.length - 1];
    expect(freeRow.modelId).toBe("__free__");
    expect(freeRow.modelName).toBe("系统 free 模型池");
    expect(freeRow.readOnly).toBe(true);
    expect(freeRow.autoLoaded).toBe(true);
    expect(freeRow.priority).toBe(FREE_FALLBACK_PRIORITY);
  });

  it("⑤ listPriorities 服务级：按 priority 升序取数且 free 只读行恒在尾部", async () => {
    prismaState.priority.findMany.mockResolvedValueOnce([
      { modelId: "m-a", priority: 20, model: { nameDisplay: "GPT-4o" } },
      { modelId: "m-b", priority: 80, model: { nameDisplay: "DeepSeek-R1" } },
    ]);
    const out = await userService.listPriorities("u-3");
    // 升序语义下沉到 repository 的 orderBy 参数
    expect(prismaState.priority.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { priority: "asc" }, where: { userId: "u-3" } })
    );
    expect(out.map((r) => r.modelId)).toEqual(["m-a", "m-b", "__free__"]);
    expect(out[2]).toMatchObject({
      modelId: "__free__",
      modelName: "系统 free 模型池",
      priority: FREE_FALLBACK_PRIORITY,
      readOnly: true,
    });
  });

  it("⑥ quotaUsage：按 tier 过滤 join 展示名，usedTokens 读当期实况且 nextResetAt 为未来 ISO", async () => {
    prismaState.user.findUnique.mockResolvedValueOnce({ tier: "PRO" });
    prismaState.freeQuota.findMany.mockResolvedValueOnce([
      { modelId: "m-9", quotaTokens: 100000, refreshCycle: "DAY", model: { nameDisplay: "GPT-4o mini" } },
      { modelId: "m-8", quotaTokens: 50000, refreshCycle: "WEEK", model: { nameDisplay: "Free-X" } },
    ]);
    // 当期用量：m-9 已用 12345；m-8 无行 → 0（口径与 gateway FREE_QUOTA 记账同键）
    prismaState.quotaUsage.findUnique
      .mockResolvedValueOnce({ used: 12345 })
      .mockResolvedValueOnce(null);
    const out = await userService.quotaUsage("u-4");
    expect(out).toHaveLength(2);
    const item = out[0];
    expect(item).toMatchObject({
      modelId: "m-9",
      modelName: "GPT-4o mini",
      totalQuotaTokens: 100000,
      quotaTokens: 100000,
      usedTokens: 12345,
      resetCycle: "DAY",
    });
    expect(out[1].usedTokens).toBe(0); // 无用量行 → 0
    expect(typeof item.nextResetAt).toBe("string");
    expect(item.nextResetAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    expect(new Date(item.nextResetAt).getTime()).toBeGreaterThan(Date.now());
    // 过滤仅按 tier（schema 实况无 isActive 列）
    expect(prismaState.freeQuota.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tier: "PRO" } })
    );
    // 用量读取键：userId+modelId+periodStart（本地零点）
    expect(prismaState.quotaUsage.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId_modelId_periodStart: expect.objectContaining({ userId: "u-4", modelId: "m-9" }) }),
      })
    );
  });

  it("⑦ nextResetAt 纯函数：DAY=明日0点 / WEEK=下周一0点 / MONTH=下月1日0点（注入时刻确定可测）", () => {
    const now = new Date(2026, 7, 27, 15, 30); // 2026-08-27（周四）15:30 本地时区
    // DAY → 明日 0 点
    expect(nextResetAt("DAY", now)).toBe(new Date(2026, 7, 28, 0, 0).toISOString());
    // WEEK → 下周一 0 点（2026-08-31）
    expect(nextResetAt("WEEK", now)).toBe(new Date(2026, 7, 31, 0, 0).toISOString());
    // MONTH → 下月 1 日 0 点（2026-09-01）
    expect(nextResetAt("MONTH", now)).toBe(new Date(2026, 8, 1, 0, 0).toISOString());
    // 跨年边界：12 月任何一天 → 次年 1 月 1 日
    const dec = new Date(2026, 11, 15, 10, 0);
    expect(nextResetAt("MONTH", dec)).toBe(new Date(2027, 0, 1, 0, 0).toISOString());
  });

  it("⑧ groupQuotasByCycle：分组键 DAY/WEEK/MONTH 三键齐全并正确归桶", () => {
    const items = [
      { resetCycle: "DAY" as const, id: 1 },
      { resetCycle: "MONTH" as const, id: 2 },
      { resetCycle: "DAY" as const, id: 3 },
    ];
    const grouped = groupQuotasByCycle(items);
    expect(Object.keys(grouped).sort()).toEqual(["DAY", "MONTH", "WEEK"]);
    expect(grouped.DAY.map((i) => i.id)).toEqual([1, 3]);
    expect(grouped.WEEK).toEqual([]);
    expect(grouped.MONTH.map((i) => i.id)).toEqual([2]);
  });
});
