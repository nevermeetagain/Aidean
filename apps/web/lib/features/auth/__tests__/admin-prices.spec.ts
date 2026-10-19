/**
 * /api/v1/admin/prices（S7.1 定价孤岛激活）路由单测。
 * 覆盖：GET 当前价投影（Decimal→string）/limit 越界 400 不查库/守卫 403；
 *      POST 新建（模型不存在 400、已有当前价 400、成功 create sourceType=OFFICIAL + 审计）；
 *      PATCH 编辑（成功 + 审计、记录不存在 400）。
 * 策略同 order-disposition.spec：vi.hoisted guard/prisma 桩 + vi.mock session/prisma/next/cache。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  modelPrice: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  aiModel: { findUnique: vi.fn() },
  auditLog: { create: vi.fn() },
}));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
const priceViews = vi.hoisted(() => ({ invalidatePriceViews: vi.fn() }));
vi.mock("../../ladder/price-views", () => priceViews); // TASK-097（review-097 S3）

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";

const listRoute = await import("../../../../app/api/v1/admin/prices/route");
const itemRoute = await import("../../../../app/api/v1/admin/prices/[id]/route");

const SESSION_OK = { userId: "u-admin" };
const FORBID = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");
const dec = (s: string) => ({ toString: () => s });

function jsonReq(method: string, body: unknown) {
  return new Request("http://localhost/api/v1/admin/prices", { method, body: JSON.stringify(body) });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.resetAllMocks();
  guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
});

describe("GET /api/v1/admin/prices", () => {
  it("当前价投影：Decimal→string，附模型/厂商名", async () => {
    prismaState.modelPrice.findMany.mockResolvedValueOnce([
      {
        id: "mp1",
        modelId: "m1",
        priceInput: dec("0.012"),
        priceOutput: dec("0.048"),
        priceCache: null,
        pricePerRequest: dec("0.001"),
        billingMode: "PER_TOKEN",
        billingCurrency: "USD",
        billingUnit: "per_1k_tokens",
        sourceType: "OFFICIAL",
        notes: "官方",
        effectiveFrom: new Date("2026-10-01T00:00:00Z"),
        model: { nameDisplay: "GPT-4o", slug: "gpt-4o", modelCode: "gpt-4o", vendor: { name: "OpenAI" } },
      },
    ]);
    const res = await listRoute.GET(new Request("http://localhost/api/v1/admin/prices?q=gpt"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.items[0]).toMatchObject({
      id: "mp1",
      modelName: "GPT-4o",
      vendorName: "OpenAI",
      priceInput: "0.012",
      priceCache: null,
    });
    const arg = prismaState.modelPrice.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(arg.where.isCurrent).toBe(true);
  });

  it("limit 越界（=0）→ 400，且不查库", async () => {
    const res = await listRoute.GET(new Request("http://localhost/api/v1/admin/prices?limit=0"));
    expect(res.status).toBe(400);
    expect(prismaState.modelPrice.findMany).not.toHaveBeenCalled();
  });

  it("守卫拒绝 → 403", async () => {
    guardStub.requireAdminApi.mockRejectedValue(FORBID());
    const res = await listRoute.GET(new Request("http://localhost/api/v1/admin/prices"));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/v1/admin/prices", () => {
  it("为尚无当前价的模型新建：sourceType=OFFICIAL + isCurrent + 审计", async () => {
    prismaState.aiModel.findUnique.mockResolvedValueOnce({ id: "m2", nameDisplay: "Claude" });
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(null);
    prismaState.modelPrice.create.mockResolvedValueOnce({ id: "mp2", modelId: "m2" });
    const res = await listRoute.POST(
      jsonReq("POST", { modelId: "m2", priceInput: 0.01, priceOutput: 0.03, billingMode: "PER_TOKEN" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ id: "mp2" });
    const arg = prismaState.modelPrice.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data.sourceType).toBe("OFFICIAL");
    expect(arg.data.isCurrent).toBe(true);
    expect(priceViews.invalidatePriceViews).toHaveBeenCalledTimes(1); // TASK-097：写后两层失效
    expect(prismaState.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("模型不存在 → 400", async () => {
    prismaState.aiModel.findUnique.mockResolvedValueOnce(null);
    const res = await listRoute.POST(
      jsonReq("POST", { modelId: "nope", priceInput: 0.01, priceOutput: 0.03 })
    );
    expect(res.status).toBe(400);
    expect(prismaState.modelPrice.create).not.toHaveBeenCalled();
  });

  it("已有当前价 → 400（请改用编辑）", async () => {
    prismaState.aiModel.findUnique.mockResolvedValueOnce({ id: "m2", nameDisplay: "Claude" });
    prismaState.modelPrice.findFirst.mockResolvedValueOnce({ id: "mp-exist" });
    const res = await listRoute.POST(
      jsonReq("POST", { modelId: "m2", priceInput: 0.01, priceOutput: 0.03 })
    );
    expect(res.status).toBe(400);
    expect(prismaState.modelPrice.create).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/v1/admin/prices/[id]", () => {
  it("编辑当前价成功 → 审计 + revalidate 前台", async () => {
    prismaState.modelPrice.findUnique.mockResolvedValueOnce({
      id: "mp1",
      modelId: "m1",
      priceInput: dec("0.012"),
      priceOutput: dec("0.048"),
      priceCache: null,
      pricePerRequest: null,
      billingUnit: "per_1k_tokens",
      billingCurrency: "USD",
      notes: "旧",
    });
    prismaState.modelPrice.update.mockResolvedValueOnce({ id: "mp1", modelId: "m1" });
    const res = await itemRoute.PATCH(jsonReq("PATCH", { priceInput: 0.02, priceOutput: 0.05 }), ctx("mp1"));
    expect(res.status).toBe(200);
    expect(prismaState.modelPrice.update).toHaveBeenCalledTimes(1);
    expect(prismaState.auditLog.create).toHaveBeenCalledTimes(1);
    expect(priceViews.invalidatePriceViews).toHaveBeenCalledTimes(1); // TASK-097：写后两层失效
  });

  it("记录不存在 → 400，不更新", async () => {
    prismaState.modelPrice.findUnique.mockResolvedValueOnce(null);
    const res = await itemRoute.PATCH(jsonReq("PATCH", { priceInput: 0.02, priceOutput: 0.05 }), ctx("nope"));
    expect(res.status).toBe(400);
    expect(prismaState.modelPrice.update).not.toHaveBeenCalled();
  });
});
