/**
 * POST /api/v1/admin/prices/batch-upsert 路由单测（TASK-081）。
 *
 * 覆盖：全成功（新建默认 PER_TOKEN / 更新保留原 billingMode / 逐行审计 + 回执）、
 *      部分失败（failed[].index 精确 + 成功行落库）、requestId 重放（replayed=true 且不重复写）、
 *      501 行超限 400、越权 403、同 requestId 在途 429。
 * 策略同 admin-prices.spec：vi.hoisted 桩 + vi.mock session/prisma/redis/price-views。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const redisState = vi.hoisted(() => ({
  client: null as null | {
    setNxEx: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    compareDelete: ReturnType<typeof vi.fn>;
  },
}));
const prismaState = vi.hoisted(() => ({
  $transaction: vi.fn(),
  modelPrice: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  aiModel: { findUnique: vi.fn() },
  auditLog: { create: vi.fn(), findFirst: vi.fn() },
}));
const priceViews = vi.hoisted(() => ({ invalidatePriceViews: vi.fn() }));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("../../../db/redis", () => ({ getRedis: () => redisState.client }));
vi.mock("../../ladder/price-views", () => priceViews);

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";

const route = await import("../../../../app/api/v1/admin/prices/batch-upsert/route");

const REQ_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_OK = { userId: "u-admin" };
const FORBID = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");
const dec = (s: string) => ({ toString: () => s });

function jsonReq(body: unknown) {
  return new Request("http://localhost/api/v1/admin/prices/batch-upsert", {
    method: "POST",
    headers: { "x-request-id": "trace-1" },
    body: JSON.stringify(body),
  });
}

const row = (modelId: string, extra: Record<string, unknown> = {}) => ({
  modelId,
  priceInput: 1.5,
  priceOutput: 2.5,
  ...extra,
});

/** 行审计（tableName=model_prices）与批次回执（model_prices_batch）分开统计 */
function auditCalls() {
  return prismaState.auditLog.create.mock.calls.map((c) => c[0] as { data: { tableName: string } });
}
const rowAudits = () => auditCalls().filter((c) => c.data.tableName === "model_prices");
const receipts = () => auditCalls().filter((c) => c.data.tableName === "model_prices_batch");

beforeEach(() => {
  vi.resetAllMocks();
  guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
  prismaState.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prismaState));
  prismaState.auditLog.findFirst.mockResolvedValue(null);
  prismaState.auditLog.create.mockResolvedValue({});
  prismaState.modelPrice.update.mockResolvedValue({ id: "p1" });
  prismaState.modelPrice.create.mockResolvedValue({ id: "p-new" });
  prismaState.aiModel.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
    where.id.startsWith("missing") ? null : { id: where.id }
  );
  redisState.client = null;
});

describe("POST /api/v1/admin/prices/batch-upsert", () => {
  it("全成功：新建默认 PER_TOKEN、更新保留 billingMode，逐行审计 + 批次回执", async () => {
    prismaState.modelPrice.findFirst.mockImplementation(async ({ where }: { where: { modelId: string } }) =>
      where.modelId === "m-exist"
        ? {
            id: "p1",
            priceInput: dec("1"),
            priceOutput: dec("2"),
            priceCache: null,
            pricePerRequest: null,
            billingMode: "PER_REQUEST",
            billingUnit: "per_request",
            billingCurrency: "USD",
            notes: "旧",
          }
        : null
    );

    const res = await route.POST(
      jsonReq({ requestId: REQ_ID, rows: [row("m-exist", { priceCache: 0.3 }), row("m-new-a", { billingMode: "PER_REQUEST" }), row("m-new-b")] })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ requestId: REQ_ID, total: 3, created: 2, updated: 1, failed: [], replayed: false });

    // 更新未显式给 billingMode → data 不含该键（保留原值）
    const updateArg = prismaState.modelPrice.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateArg.data).not.toHaveProperty("billingMode");
    // 新建缺省 PER_TOKEN；显式给出时透传
    const createArgs = prismaState.modelPrice.create.mock.calls.map((c) => c[0] as { data: Record<string, unknown> });
    expect(createArgs[0].data.billingMode).toBe("PER_REQUEST");
    expect(createArgs[1].data.billingMode).toBe("PER_TOKEN");
    expect(createArgs[1].data.sourceName).toBe("admin-batch");

    expect(rowAudits()).toHaveLength(3);
    expect(receipts()).toHaveLength(1);
    expect(receipts()[0].data).toMatchObject({ recordId: REQ_ID, requestId: "trace-1" });
    expect(priceViews.invalidatePriceViews).toHaveBeenCalledTimes(1);
  });

  it("部分失败：缺失模型记 failed[1]（40000），成功行已落库且 total 守恒", async () => {
    prismaState.modelPrice.findFirst.mockResolvedValue(null);

    const res = await route.POST(
      jsonReq({ requestId: REQ_ID, rows: [row("m-ok"), row("missing-1"), row("m-ok-2")] })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ total: 3, created: 2, updated: 0, replayed: false });
    expect(body.data.failed).toEqual([
      { index: 1, modelId: "missing-1", code: ERROR_CODES.BAD_REQUEST, message: "模型不存在" },
    ]);
    expect(prismaState.modelPrice.create).toHaveBeenCalledTimes(2);
    expect(rowAudits()).toHaveLength(2);
    expect(receipts()).toHaveLength(1);
    expect(priceViews.invalidatePriceViews).toHaveBeenCalledTimes(1);
  });

  it("requestId 重放：返回首次结果（replayed=true），不重复写价/审计", async () => {
    prismaState.modelPrice.findFirst.mockResolvedValue(null);
    const first = await route.POST(jsonReq({ requestId: REQ_ID, rows: [row("m-1")] }));
    const firstBody = await first.json();
    expect(firstBody.data.replayed).toBe(false);

    prismaState.auditLog.findFirst.mockResolvedValueOnce({ newData: firstBody.data });
    prismaState.modelPrice.findFirst.mockClear();
    prismaState.modelPrice.create.mockClear();
    prismaState.auditLog.create.mockClear();
    priceViews.invalidatePriceViews.mockClear();

    const second = await route.POST(jsonReq({ requestId: REQ_ID, rows: [row("m-1")] }));
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.data).toMatchObject({ total: 1, created: 1, updated: 0, failed: [], replayed: true });
    expect(prismaState.modelPrice.create).not.toHaveBeenCalled();
    expect(prismaState.auditLog.create).not.toHaveBeenCalled();
    expect(priceViews.invalidatePriceViews).not.toHaveBeenCalled();
  });

  it("501 行超限 → 400，不触库", async () => {
    const rows = Array.from({ length: 501 }, (_, i) => row(`m-${i}`));
    const res = await route.POST(jsonReq({ requestId: REQ_ID, rows }));
    expect(res.status).toBe(400);
    expect(prismaState.$transaction).not.toHaveBeenCalled();
    expect(prismaState.modelPrice.create).not.toHaveBeenCalled();
  });

  it("越权 → 403，不触库", async () => {
    guardStub.requireAdminApi.mockRejectedValue(FORBID());
    const res = await route.POST(jsonReq({ requestId: REQ_ID, rows: [row("m-1")] }));
    expect(res.status).toBe(403);
    expect(prismaState.modelPrice.findFirst).not.toHaveBeenCalled();
  });

  it("同 requestId 在途（Redis PENDING）→ 429，不重复写", async () => {
    redisState.client = {
      setNxEx: vi.fn().mockResolvedValue(null),
      get: vi.fn().mockResolvedValue("PENDING"),
      set: vi.fn(),
      compareDelete: vi.fn(),
    };
    const res = await route.POST(jsonReq({ requestId: REQ_ID, rows: [row("m-1")] }));
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe(ERROR_CODES.TOO_MANY_REQUESTS);
    expect(prismaState.modelPrice.findFirst).not.toHaveBeenCalled();
  });
});
