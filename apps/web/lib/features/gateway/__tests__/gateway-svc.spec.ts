/**
 * gateway service 单测（Task G.2.2 验收取证）。
 *
 * 策略：vi.mock '../../../db/prisma'（repository 与 service 共享同一 stub 组）；
 * 纯函数 buildRouteChain / periodStartOf 直测全分支，编排层 resolveRouteChain /
 * recordFreeUsage 以 stub 断言交互与口径。
 */
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { KEY_COOLDOWN_MINUTES, KEY_FAILURE_THRESHOLD } from "@aidean/shared";

const { prismaStub } = vi.hoisted(() => {
  const mk = () => vi.fn();
  return {
    prismaStub: {
      user: { findUnique: mk() },
      userTierMapping: { findMany: mk() },
      userModelPriority: { findMany: mk() },
      userFreeQuota: { findMany: mk() },
      userQuotaUsage: { findUnique: mk(), upsert: mk() },
      aiModel: { findFirst: mk(), findMany: mk() },
      stationKey: { findMany: mk(), update: mk() },
    },
  };
});

vi.mock("../../../db/prisma", () => ({ prisma: prismaStub }));

import { ApiError } from "../../../../app/api/v1/_lib/errors";
import { gatewayRepository, type RouteConfigRow } from "../repository";
import { buildRouteChain, gatewayService, periodStartOf } from "../service";

const modelFindFirst = prismaStub.aiModel.findFirst as Mock;
const modelFindMany = prismaStub.aiModel.findMany as Mock;
const tierFindMany = prismaStub.userTierMapping.findMany as Mock;
const prioFindMany = prismaStub.userModelPriority.findMany as Mock;
const userFindUnique = prismaStub.user.findUnique as Mock;
const quotaFindMany = prismaStub.userFreeQuota.findMany as Mock;
const quotaUsedFindUnique = prismaStub.userQuotaUsage.findUnique as Mock;
const quotaUsedUpsert = prismaStub.userQuotaUsage.upsert as Mock;

async function expectApiError(promise: Promise<unknown>, code: number) {
  try {
    await promise;
    expect.unreachable("should have thrown ApiError");
  } catch (err) {
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe(code);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ==================== buildRouteChain 全分支 ====================

describe("buildRouteChain（G.2.2 纯函数全分支）", () => {
  const baseConfig: RouteConfigRow = {
    tierMappings: [
      { tierLevel: "OPUS", modelId: "m-a" }, // p=1
      { tierLevel: "SONNET", modelId: "m-b" }, // p=2
      { tierLevel: "HAIKU", modelId: "m-c" }, // p=4
    ],
    priorities: [
      { modelId: "m-b", priority: 1, enabled: true }, // 与 tier 合并取优 → p=1
      { modelId: "m-d", priority: 3, enabled: true },
      { modelId: "m-e", priority: 99, enabled: false }, // disabled 出链
      { modelId: "m-f", priority: 0, enabled: true }, // 越界(<1) 出链
      { modelId: "m-g", priority: 100, enabled: true }, // 越界(>99) 出链
    ],
    free: [
      { modelId: "m-free1", quotaTokens: 1000, refreshCycle: "DAY" },
      { modelId: "m-c", quotaTokens: 500, refreshCycle: "DAY" }, // 已在链中 → 去重
      { modelId: "m-free2", quotaTokens: 500, refreshCycle: "DAY" }, // 额度耗尽 → 出链
    ],
  };

  it("链首恒第一 + 合并取优 + disabled/越界出链 + free 尾部/去重/耗尽出链", () => {
    // m-free2 额度耗尽（不在可用集）；m-c 可用但已在链中（去重）
    const freeAvailable = new Set(["m-free1", "m-c"]);
    const chain = buildRouteChain(baseConfig, "m-req", freeAvailable);

    expect(chain.map((c) => c.modelId)).toEqual(["m-req", "m-a", "m-b", "m-d", "m-c", "m-free1"]);
    expect(chain[0]).toMatchObject({ priority: -1, source: "REQUESTED" });
    // 同优先级稳定序：m-a 先插入（TIER）在前，m-b（被 PRIORITY 覆盖）在后
    expect(chain[1]).toMatchObject({ priority: 1, source: "TIER" });
    expect(chain[2]).toMatchObject({ priority: 1, source: "PRIORITY" });
    expect(chain[3]).toMatchObject({ priority: 3, source: "PRIORITY" });
    expect(chain[4]).toMatchObject({ priority: 4, source: "TIER" });
    expect(chain[5]).toMatchObject({ priority: 100, source: "FREE" });
    // m-c 仅出现一次（TIER 来源），m-free2（耗尽）与 m-e/m-f/m-g 不在链中
    expect(chain.filter((c) => c.modelId === "m-c")).toHaveLength(1);
  });

  it("free 额度耗尽出链：freeAvailable 为空 → 链仅含请求与配置候选", () => {
    const chain = buildRouteChain(baseConfig, "m-req", new Set());
    expect(chain.map((c) => c.modelId)).toEqual(["m-req", "m-a", "m-b", "m-d", "m-c"]);
  });

  it("空配置：链仅剩请求模型（恒链首，不空链）", () => {
    const empty: RouteConfigRow = { tierMappings: [], priorities: [], free: [] };
    const chain = buildRouteChain(empty, "m-req", new Set(["m-free1"]));
    expect(chain).toEqual([{ modelId: "m-req", priority: -1, source: "REQUESTED" }]);
  });

  it("不改入参（纯函数）", () => {
    const frozen = structuredClone(baseConfig);
    buildRouteChain(baseConfig, "m-req", new Set(["m-free1"]));
    expect(baseConfig).toEqual(frozen);
  });
});

// ==================== periodStartOf 周期起点 ====================

describe("periodStartOf（周期起点口径，与 user 域 nextResetAt 对齐）", () => {
  it("DAY=当天零点；MONTH=本月 1 日零点", () => {
    const now = new Date(2026, 7, 26, 15, 30, 45); // 2026-08-26（周三）15:30 本地
    expect(periodStartOf("DAY", now)).toEqual(new Date(2026, 7, 26));
    expect(periodStartOf("MONTH", now)).toEqual(new Date(2026, 7, 1));
  });

  it("WEEK=本周一零点（含周三与周日两种锚点）", () => {
    const wed = new Date(2026, 7, 26, 15, 30); // 周三
    expect(periodStartOf("WEEK", wed)).toEqual(new Date(2026, 7, 24)); // 本周一 08-24
    const sun = new Date(2026, 7, 30, 23, 0); // 周日（一周末日）
    expect(periodStartOf("WEEK", sun)).toEqual(new Date(2026, 7, 24)); // 仍归本周一
  });
});

// ==================== resolveRouteChain / recordFreeUsage 编排 ====================

function modelRow(id: string, code: string) {
  return {
    id,
    modelCode: code,
    nameDisplay: `模型 ${id}`,
    maxOutputTokens: 4096,
    prices: [{ priceInput: "2.0000", priceOutput: "8.0000", billingCurrency: "CNY" }],
  };
}

describe("gatewayService.resolveRouteChain（G.2.2 编排）", () => {
  it("请求模型链首 → 配置合并 → free 额度可用入链；模型详情按链序补全", async () => {
    modelFindFirst.mockResolvedValue(modelRow("m-req", "gpt-x"));
    tierFindMany.mockResolvedValue([{ tierLevel: "SONNET", modelId: "m-b" }]);
    prioFindMany.mockResolvedValue([{ modelId: "m-d", priority: 5, enabled: true }]);
    userFindUnique.mockResolvedValue({ tier: "NORMAL" });
    quotaFindMany.mockResolvedValue([
      { modelId: "m-free1", quotaTokens: 1000, refreshCycle: "DAY" },
      { modelId: "m-free2", quotaTokens: 1000, refreshCycle: "DAY" },
    ]);
    // 当期用量：m-free1 未耗尽(999<1000)、m-free2 耗尽(1000)
    quotaUsedFindUnique.mockImplementation((args: { where: { userId_modelId_periodStart: { modelId: string } } }) =>
      Promise.resolve({ used: args.where.userId_modelId_periodStart.modelId === "m-free2" ? 1000 : 999 })
    );
    modelFindMany.mockResolvedValue([modelRow("m-b", "b"), modelRow("m-d", "d"), modelRow("m-free1", "f1")]);

    const { chain, requestedModelId } = await gatewayService.resolveRouteChain("u-1", "gpt-x");

    expect(requestedModelId).toBe("m-req");
    expect(chain.map((c) => c.modelId)).toEqual(["m-req", "m-b", "m-d", "m-free1"]);
    expect(chain.map((c) => c.source)).toEqual(["REQUESTED", "TIER", "PRIORITY", "FREE"]);
    // 模型详情补全（链首由回填逻辑提供，其余来自 findModelsByIds）
    expect(chain.every((c) => c.model && c.model.id === c.modelId)).toBe(true);
    // free 额度查询使用本地零点周期起点（复合唯一键内层断言）
    expect(quotaUsedFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_modelId_periodStart: expect.objectContaining({ userId: "u-1", modelId: "m-free1" }),
        },
      })
    );
  });

  it("请求模型无法解析 → 30002 GATEWAY_NO_ROUTE", async () => {
    modelFindFirst.mockResolvedValue(null);
    await expectApiError(gatewayService.resolveRouteChain("u-1", "nope"), 30002);
  });
});

describe("gatewayService.recordFreeUsage（FREE_QUOTA 额度记账）", () => {
  it("按周期起点 UPSERT 累加 tokens", async () => {
    quotaUsedUpsert.mockResolvedValue(undefined);
    const now = new Date(2026, 7, 26, 12, 0);

    await gatewayService.recordFreeUsage("u-1", "m-free1", "DAY", 320, now);

    expect(quotaUsedUpsert).toHaveBeenCalledTimes(1);
    const call = quotaUsedUpsert.mock.calls[0][0] as {
      where: { userId_modelId_periodStart: { userId: string; modelId: string; periodStart: Date } };
      create: { used: number; periodStart: Date };
      update: { used: { increment: number } };
    };
    expect(call.where.userId_modelId_periodStart).toEqual({
      userId: "u-1",
      modelId: "m-free1",
      periodStart: new Date(2026, 7, 26),
    });
    expect(call.create.used).toBe(320);
    expect(call.update.used).toEqual({ increment: 320 });
  });
});

// ==================== Key 摘除/恢复（WP-BE02 验收③） ====================

describe("gatewayRepository Key 摘除/恢复（WP-BE02）", () => {
  const repoClient = prismaStub as unknown as Parameters<typeof gatewayRepository.listAvailableKeys>[0];

  it("listAvailableKeys：ACTIVE 与冷却到期的 COOLDOWN 均可用（DISABLED 与未到期 COOLDOWN 排除）", async () => {
    const findMany = prismaStub.stationKey.findMany as Mock;
    findMany.mockResolvedValue([]);
    const now = new Date(2026, 8, 14, 12, 0);

    await gatewayRepository.listAvailableKeys(repoClient, "st-1", now);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        stationId: "st-1",
        status: { in: ["ACTIVE", "COOLDOWN"] },
        OR: [{ cooldownUntil: null }, { cooldownUntil: { lte: now } }],
      },
    });
  });

  it("markKeyFailure：计数递增；达阈值转 COOLDOWN 并设冷却期", async () => {
    const update = prismaStub.stationKey.update as Mock;
    update.mockResolvedValue({ failureCount: KEY_FAILURE_THRESHOLD });
    const now = new Date(2026, 8, 14, 12, 0);

    await gatewayRepository.markKeyFailure(repoClient, "k1", now);

    expect(update).toHaveBeenNthCalledWith(1, {
      where: { id: "k1" },
      data: { failureCount: { increment: 1 } },
      select: { failureCount: true },
    });
    expect(update).toHaveBeenNthCalledWith(2, {
      where: { id: "k1" },
      data: { status: "COOLDOWN", cooldownUntil: new Date(now.getTime() + KEY_COOLDOWN_MINUTES * 60_000) },
    });
  });

  it("markKeyFailure：未达阈值不进入冷却", async () => {
    const update = prismaStub.stationKey.update as Mock;
    update.mockResolvedValue({ failureCount: KEY_FAILURE_THRESHOLD - 1 });

    await gatewayRepository.markKeyFailure(repoClient, "k2", new Date());

    expect(update).toHaveBeenCalledTimes(1);
  });

  it("markKeySuccess：清零计数 + 复位 ACTIVE + 清冷却（摘除/恢复闭环）", async () => {
    const update = prismaStub.stationKey.update as Mock;
    update.mockResolvedValue({});

    await gatewayRepository.markKeySuccess(repoClient, "k3");

    expect(update).toHaveBeenCalledWith({
      where: { id: "k3" },
      data: { failureCount: 0, status: "ACTIVE", cooldownUntil: null, lastUsedAt: expect.any(Date) },
    });
  });
});
