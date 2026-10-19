/**
 * /api/v1/admin/prices/promotions（S4 限时优惠，TASK-028）路由单测。
 *
 * 覆盖写侧四约束 + CRUD：
 *   GET   ：分页投影（Decimal→string）+ 仅 sourceType=PROMOTION 过滤 + 非法 pageSize 不查库 + 守卫 403；
 *   POST  ：派生当前价计费口径 + 强制 sourceType=PROMOTION/isCurrent=false（请求体注入被剥离）、
 *           小数位>6→400、窗口重叠→400、无当前价→400、模型不存在→400；
 *   PATCH ：成功 + 审计、目标非 PROMOTION→400、strict 拒未知键（isCurrent）→400、重叠→400；
 *   DELETE：成功 {deleted:true} + 审计、OFFICIAL 行→400（验收 L41）、记录不存在→400。
 * 策略同 admin-prices.spec：vi.hoisted guard/prisma 桩 + vi.mock session/prisma/next/cache。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  modelPrice: {
    count: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  aiModel: { findUnique: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";

const listRoute = await import("../../../../app/api/v1/admin/prices/promotions/route");
const itemRoute = await import("../../../../app/api/v1/admin/prices/promotions/[id]/route");

const SESSION_OK = { userId: "u-admin" };
const FORBID = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");
const dec = (s: string) => ({ toString: () => s });

/** 模型当前价（供派生计费口径）。 */
const CUR = { billingMode: "PER_TOKEN", billingUnit: "per_1m_tokens", billingCurrency: "CNY" };

function promoRow(over: Record<string, unknown> = {}) {
  return {
    id: "promo1",
    modelId: "m1",
    priceInput: dec("1.5"),
    priceOutput: dec("3"),
    priceCache: null,
    billingMode: "PER_TOKEN",
    billingUnit: "per_1m_tokens",
    billingCurrency: "CNY",
    effectiveFrom: new Date("2026-11-01T00:00:00Z"),
    effectiveUntil: new Date("2026-12-01T00:00:00Z"),
    isCurrent: false,
    sourceType: "PROMOTION",
    notes: "双11",
    ...over,
  };
}

const baseCreate = {
  modelId: "m1",
  priceInput: "1.5",
  priceOutput: "3",
  effectiveFrom: "2026-11-01T00:00:00.000Z",
  effectiveUntil: "2026-12-01T00:00:00.000Z",
};

function jsonReq(method: string, body: unknown) {
  return new Request("http://localhost/api/v1/admin/prices/promotions", { method, body: JSON.stringify(body) });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.resetAllMocks();
  guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
  // Serializable 交互事务桩：直接以 prismaState 作 tx 执行回调（TASK-096）。
  prismaState.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prismaState));
});

describe("GET /api/v1/admin/prices/promotions", () => {
  it("分页投影：Decimal→string，仅筛 sourceType=PROMOTION", async () => {
    prismaState.modelPrice.count.mockResolvedValueOnce(1);
    prismaState.modelPrice.findMany.mockResolvedValueOnce([{ ...promoRow(), model: { nameDisplay: "GPT-4o" } }]);

    const res = await listRoute.GET(new Request("http://localhost/api/v1/admin/prices/promotions?page=1&pageSize=10"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.items[0]).toMatchObject({ id: "promo1", modelName: "GPT-4o", priceInput: "1.5", sourceType: "PROMOTION", isCurrent: false });
    expect(body.data).toMatchObject({ total: 1, page: 1, pageSize: 10 });
    const arg = prismaState.modelPrice.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(arg.where.sourceType).toBe("PROMOTION");
  });

  it("非法 pageSize（=0）→ 400，且不查库", async () => {
    const res = await listRoute.GET(new Request("http://localhost/api/v1/admin/prices/promotions?pageSize=0"));
    expect(res.status).toBe(400);
    expect(prismaState.modelPrice.findMany).not.toHaveBeenCalled();
    expect(prismaState.modelPrice.count).not.toHaveBeenCalled();
  });

  it("守卫拒绝 → 403", async () => {
    guardStub.requireAdminApi.mockRejectedValue(FORBID());
    const res = await listRoute.GET(new Request("http://localhost/api/v1/admin/prices/promotions"));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/v1/admin/prices/promotions", () => {
  it("派生当前价计费口径 + 强制 sourceType=PROMOTION/isCurrent=false + 审计", async () => {
    prismaState.aiModel.findUnique.mockResolvedValueOnce({ id: "m1" });
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(CUR); // 当前价
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(null); // 无重叠
    prismaState.modelPrice.create.mockResolvedValueOnce(promoRow());

    const res = await listRoute.POST(jsonReq("POST", baseCreate));
    expect(res.status).toBe(200);
    const data = (prismaState.modelPrice.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.sourceType).toBe("PROMOTION");
    expect(data.isCurrent).toBe(false);
    expect(data.billingMode).toBe("PER_TOKEN"); // 继承当前价
    expect(data.billingCurrency).toBe("CNY");
    expect(data.effectiveFrom).toBeInstanceOf(Date);
    expect(prismaState.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("请求体注入 isCurrent/sourceType 被剥离 → 仍 PROMOTION/isCurrent=false（验收 L42）", async () => {
    prismaState.aiModel.findUnique.mockResolvedValueOnce({ id: "m1" });
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(CUR);
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(null);
    prismaState.modelPrice.create.mockResolvedValueOnce(promoRow());

    const res = await listRoute.POST(jsonReq("POST", { ...baseCreate, isCurrent: true, sourceType: "OFFICIAL" }));
    expect(res.status).toBe(200);
    const data = (prismaState.modelPrice.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.isCurrent).toBe(false);
    expect(data.sourceType).toBe("PROMOTION");
  });

  it("价格小数位 >6 → 400，不写库（E9-11）", async () => {
    prismaState.aiModel.findUnique.mockResolvedValueOnce({ id: "m1" });
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(CUR);

    const res = await listRoute.POST(jsonReq("POST", { ...baseCreate, priceInput: "1.1234567" }));
    expect(res.status).toBe(400);
    expect(prismaState.modelPrice.create).not.toHaveBeenCalled();
  });

  it("与既有窗口重叠 → 400，不写库（验收 L43）", async () => {
    prismaState.aiModel.findUnique.mockResolvedValueOnce({ id: "m1" });
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(CUR);
    prismaState.modelPrice.findFirst.mockResolvedValueOnce({ id: "other-promo" });

    const res = await listRoute.POST(jsonReq("POST", baseCreate));
    expect(res.status).toBe(400);
    expect(prismaState.modelPrice.create).not.toHaveBeenCalled();
  });

  it("该模型无当前价（口径无从一致）→ 400，不写库（验收 L44）", async () => {
    prismaState.aiModel.findUnique.mockResolvedValueOnce({ id: "m1" });
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(null);

    const res = await listRoute.POST(jsonReq("POST", baseCreate));
    expect(res.status).toBe(400);
    expect(prismaState.modelPrice.create).not.toHaveBeenCalled();
  });

  it("模型不存在 → 400，不写库", async () => {
    prismaState.aiModel.findUnique.mockResolvedValueOnce(null);

    const res = await listRoute.POST(jsonReq("POST", baseCreate));
    expect(res.status).toBe(400);
    expect(prismaState.modelPrice.create).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/v1/admin/prices/promotions/[id]", () => {
  it("编辑成功 → 审计 + 恒写 isCurrent=false/sourceType=PROMOTION（TASK-096 D3）", async () => {
    prismaState.modelPrice.findUnique.mockResolvedValueOnce(promoRow());
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(CUR); // 当前价口径一致
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(null); // 无重叠
    prismaState.modelPrice.update.mockResolvedValueOnce(promoRow({ priceInput: dec("2") }));

    const res = await itemRoute.PATCH(jsonReq("PATCH", { priceInput: "2" }), ctx("promo1"));
    expect(res.status).toBe(200);
    const data = (prismaState.modelPrice.update.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.isCurrent).toBe(false);
    expect(data.sourceType).toBe("PROMOTION");
    expect(prismaState.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("目标非 PROMOTION（OFFICIAL 当前价）→ 400，不更新", async () => {
    prismaState.modelPrice.findUnique.mockResolvedValueOnce(promoRow({ sourceType: "OFFICIAL", isCurrent: true }));

    const res = await itemRoute.PATCH(jsonReq("PATCH", { priceInput: "2" }), ctx("official1"));
    expect(res.status).toBe(400);
    expect(prismaState.modelPrice.update).not.toHaveBeenCalled();
  });

  it("strict 拒未知键（isCurrent）→ 400，不更新", async () => {
    prismaState.modelPrice.findUnique.mockResolvedValueOnce(promoRow());

    const res = await itemRoute.PATCH(jsonReq("PATCH", { isCurrent: true }), ctx("promo1"));
    expect(res.status).toBe(400);
    expect(prismaState.modelPrice.update).not.toHaveBeenCalled();
  });

  it("与其他优惠窗口重叠 → 400，不更新", async () => {
    prismaState.modelPrice.findUnique.mockResolvedValueOnce(promoRow());
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(CUR);
    prismaState.modelPrice.findFirst.mockResolvedValueOnce({ id: "other" });

    const res = await itemRoute.PATCH(jsonReq("PATCH", { priceInput: "2" }), ctx("promo1"));
    expect(res.status).toBe(400);
    expect(prismaState.modelPrice.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/v1/admin/prices/promotions/[id]", () => {
  it("删除 PROMOTION 成功 → {deleted:true} + 审计(3)", async () => {
    prismaState.modelPrice.findUnique.mockResolvedValueOnce(promoRow());
    prismaState.modelPrice.delete.mockResolvedValueOnce(promoRow());

    const res = await itemRoute.DELETE(jsonReq("DELETE", null), ctx("promo1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ deleted: true });
    expect(prismaState.modelPrice.delete).toHaveBeenCalledTimes(1);
    expect(prismaState.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("删除 OFFICIAL 当前价 → 400，不删（验收 L41）", async () => {
    prismaState.modelPrice.findUnique.mockResolvedValueOnce(promoRow({ sourceType: "OFFICIAL", isCurrent: true }));

    const res = await itemRoute.DELETE(jsonReq("DELETE", null), ctx("official1"));
    expect(res.status).toBe(400);
    expect(prismaState.modelPrice.delete).not.toHaveBeenCalled();
  });

  it("记录不存在 → 400，不删", async () => {
    prismaState.modelPrice.findUnique.mockResolvedValueOnce(null);

    const res = await itemRoute.DELETE(jsonReq("DELETE", null), ctx("nope"));
    expect(res.status).toBe(400);
    expect(prismaState.modelPrice.delete).not.toHaveBeenCalled();
  });
});

describe("TASK-096 写侧加固（review-ext12 D2/D3/D10/D11）", () => {
  const P2034 = () => new Prisma.PrismaClientKnownRequestError("write conflict", { code: "P2034", clientVersion: "test" });

  it("POST 重叠判定覆盖开放式窗口：where 含 effectiveUntil=null 分支，且当前价查询排除 PROMOTION 脏行", async () => {
    prismaState.aiModel.findUnique.mockResolvedValueOnce({ id: "m1" });
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(CUR);
    prismaState.modelPrice.findFirst.mockResolvedValueOnce({ id: "open-ended" }); // 历史开放式优惠

    const res = await listRoute.POST(jsonReq("POST", baseCreate));
    expect(res.status).toBe(400);
    const curWhere = (prismaState.modelPrice.findFirst.mock.calls[0][0] as { where: Record<string, unknown> }).where;
    expect(curWhere).toMatchObject({ isCurrent: true, sourceType: { not: "PROMOTION" } });
    const ovWhere = (prismaState.modelPrice.findFirst.mock.calls[1][0] as { where: Record<string, unknown> }).where;
    expect(ovWhere.OR).toEqual([{ effectiveUntil: null }, { effectiveUntil: { gt: new Date(baseCreate.effectiveFrom) } }]);
    expect(ovWhere.effectiveFrom).toEqual({ lt: new Date(baseCreate.effectiveUntil) });
    expect(prismaState.modelPrice.create).not.toHaveBeenCalled();
  });

  it("POST 整数位 >13 → 400 且不进事务（原先溢出 Decimal(19,6) 返回 500）", async () => {
    const res = await listRoute.POST(jsonReq("POST", { ...baseCreate, priceOutput: "12345678901234" }));
    expect(res.status).toBe(400);
    expect(prismaState.$transaction).not.toHaveBeenCalled();
  });

  it("POST 整数位恰 13（含前导零不计）→ 通过位数校验", async () => {
    prismaState.aiModel.findUnique.mockResolvedValueOnce({ id: "m1" });
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(CUR);
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(null);
    prismaState.modelPrice.create.mockResolvedValueOnce(promoRow());
    const res = await listRoute.POST(jsonReq("POST", { ...baseCreate, priceOutput: "0001234567890123.5" }));
    expect(res.status).toBe(200);
  });

  it("POST 走 Serializable 事务；P2034 冲突重试后成功", async () => {
    prismaState.$transaction
      .mockRejectedValueOnce(P2034())
      .mockImplementationOnce(async (fn: (tx: unknown) => unknown) => fn(prismaState));
    prismaState.aiModel.findUnique.mockResolvedValueOnce({ id: "m1" });
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(CUR);
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(null);
    prismaState.modelPrice.create.mockResolvedValueOnce(promoRow());

    const res = await listRoute.POST(jsonReq("POST", baseCreate));
    expect(res.status).toBe(200);
    expect(prismaState.$transaction).toHaveBeenCalledTimes(2);
    expect((prismaState.$transaction.mock.calls[1][1] as { isolationLevel: string }).isolationLevel).toBe("Serializable");
  });

  it("POST 连续 3 次 P2034 → 400「并发写入冲突」，不写审计", async () => {
    prismaState.$transaction.mockRejectedValue(P2034());
    const res = await listRoute.POST(jsonReq("POST", baseCreate));
    expect(res.status).toBe(400);
    expect(prismaState.$transaction).toHaveBeenCalledTimes(3);
    expect(prismaState.auditLog.create).not.toHaveBeenCalled();
  });

  it("PATCH 修复误标 isCurrent=true 的优惠脏行 → 写入 isCurrent=false", async () => {
    prismaState.modelPrice.findUnique.mockResolvedValueOnce(promoRow({ isCurrent: true }));
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(CUR);
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(null);
    prismaState.modelPrice.update.mockResolvedValueOnce(promoRow());

    const res = await itemRoute.PATCH(jsonReq("PATCH", { notes: "fix" }), ctx("promo1"));
    expect(res.status).toBe(200);
    const data = (prismaState.modelPrice.update.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.isCurrent).toBe(false);
  });

  it("PATCH 优惠计费口径与当前价不一致 → 400，不更新", async () => {
    prismaState.modelPrice.findUnique.mockResolvedValueOnce(promoRow({ billingUnit: "per_1k_tokens" }));
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(CUR); // per_1m_tokens

    const res = await itemRoute.PATCH(jsonReq("PATCH", { priceInput: "2" }), ctx("promo1"));
    expect(res.status).toBe(400);
    expect(prismaState.modelPrice.update).not.toHaveBeenCalled();
  });

  it("PATCH 模型已无当前价 → 400，不更新", async () => {
    prismaState.modelPrice.findUnique.mockResolvedValueOnce(promoRow());
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(null);
    const res = await itemRoute.PATCH(jsonReq("PATCH", { priceInput: "2" }), ctx("promo1"));
    expect(res.status).toBe(400);
    expect(prismaState.modelPrice.update).not.toHaveBeenCalled();
  });

  it("PATCH 重叠判定排除自身且覆盖开放式窗口", async () => {
    prismaState.modelPrice.findUnique.mockResolvedValueOnce(promoRow());
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(CUR);
    prismaState.modelPrice.findFirst.mockResolvedValueOnce(null);
    prismaState.modelPrice.update.mockResolvedValueOnce(promoRow());
    await itemRoute.PATCH(jsonReq("PATCH", { priceInput: "2" }), ctx("promo1"));
    const ovWhere = (prismaState.modelPrice.findFirst.mock.calls[1][0] as { where: Record<string, unknown> }).where;
    expect(ovWhere.id).toEqual({ not: "promo1" });
    expect(ovWhere.OR).toContainEqual({ effectiveUntil: null });
  });
});
