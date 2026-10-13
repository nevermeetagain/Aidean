
/**
 * 新增 6 域 batch 路由单测（R-28 补齐）。
 * 覆盖守卫矩阵 + 正常操作 + 参数校验。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";

const guardStub2 = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const auditStub2 = vi.hoisted(() => ({ writeAudit: vi.fn() }));
const prismaState2 = vi.hoisted(() => ({
  vendor: { updateMany: vi.fn() },
  product: { updateMany: vi.fn() },
  package: { updateMany: vi.fn() },
  benchmark: { updateMany: vi.fn(), deleteMany: vi.fn() },
  redemption: { updateMany: vi.fn(), deleteMany: vi.fn() },
  partnerKey: { updateMany: vi.fn(), deleteMany: vi.fn() },
}));

vi.mock("../session", () => guardStub2);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState2 }));
vi.mock("../../../../app/api/v1/_lib/audit", () => auditStub2);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const vendorsBatch = await import("../../../../app/api/v1/admin/vendors/batch/route");
const productsBatch = await import("../../../../app/api/v1/admin/products/batch/route");
const packagesBatch = await import("../../../../app/api/v1/admin/packages/batch/route");
const benchmarksBatch = await import("../../../../app/api/v1/admin/benchmarks/batch/route");
const redemptionCodesBatch = await import("../../../../app/api/v1/admin/redemption-codes/batch/route");
const partnerKeysBatch = await import("../../../../app/api/v1/admin/partner-keys/batch/route");

function postReq2(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }) as never;
}

const ADMIN_CTX = { userId: "admin-1", role: "ADMIN" };
const FORBID_ERR = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");

describe("POST /api/v1/admin/vendors/batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStub2.requireAdminApi.mockResolvedValue(ADMIN_CTX);
    prismaState2.vendor.updateMany.mockResolvedValue({ count: 2 });
  });

  it("403 当非管理员", async () => {
    guardStub2.requireAdminApi.mockRejectedValueOnce(FORBID_ERR());
    const res = await vendorsBatch.POST(postReq2("/api/v1/admin/vendors/batch", {
      ids: ["v1"], action: "activate",
    }));
    expect(res.status).toBe(403);
    expect(prismaState2.vendor.updateMany).not.toHaveBeenCalled();
  });

  it("200 + 批量启用", async () => {
    const res = await vendorsBatch.POST(postReq2("/api/v1/admin/vendors/batch", {
      ids: ["v1", "v2"], action: "activate",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.affected).toBe(2);
  });

  it("400 当 action 非法", async () => {
    const res = await vendorsBatch.POST(postReq2("/api/v1/admin/vendors/batch", {
      ids: ["v1"], action: "invalid",
    }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/admin/products/batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStub2.requireAdminApi.mockResolvedValue(ADMIN_CTX);
    prismaState2.product.updateMany.mockResolvedValue({ count: 1 });
  });

  it("200 + 批量停用", async () => {
    const res = await productsBatch.POST(postReq2("/api/v1/admin/products/batch", {
      ids: ["p1"], action: "deactivate",
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: { affected: 1 } });
  });

  it("400 当 ids 为空", async () => {
    const res = await productsBatch.POST(postReq2("/api/v1/admin/products/batch", {
      ids: [], action: "activate",
    }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/admin/packages/batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStub2.requireAdminApi.mockResolvedValue(ADMIN_CTX);
    prismaState2.package.updateMany.mockResolvedValue({ count: 3 });
  });

  it("200 + 批量删除（软删）", async () => {
    const res = await packagesBatch.POST(postReq2("/api/v1/admin/packages/batch", {
      ids: ["pk1", "pk2", "pk3"], action: "delete",
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: { affected: 3 } });
  });
});

describe("POST /api/v1/admin/benchmarks/batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStub2.requireAdminApi.mockResolvedValue(ADMIN_CTX);
    prismaState2.benchmark.updateMany.mockResolvedValue({ count: 5 });
    prismaState2.benchmark.deleteMany.mockResolvedValue({ count: 2 });
  });

  it("200 + 批量验证", async () => {
    const res = await benchmarksBatch.POST(postReq2("/api/v1/admin/benchmarks/batch", {
      ids: ["b1", "b2", "b3", "b4", "b5"], action: "verify",
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: { affected: 5 } });
  });

  it("200 + 批量删除（硬删）", async () => {
    const res = await benchmarksBatch.POST(postReq2("/api/v1/admin/benchmarks/batch", {
      ids: ["b1", "b2"], action: "delete",
    }));
    expect(res.status).toBe(200);
    expect(prismaState2.benchmark.deleteMany).toHaveBeenCalled();
  });
});

describe("POST /api/v1/admin/redemption-codes/batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStub2.requireAdminApi.mockResolvedValue(ADMIN_CTX);
    prismaState2.redemption.updateMany.mockResolvedValue({ count: 10 });
    prismaState2.redemption.deleteMany.mockResolvedValue({ count: 3 });
  });

  it("200 + 批量停用", async () => {
    const res = await redemptionCodesBatch.POST(postReq2("/api/v1/admin/redemption-codes/batch", {
      ids: ["r1", "r2", "r3", "r4", "r5"], action: "disable",
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: { affected: 10 } });
  });

  it("400 当缺少 action", async () => {
    const res = await redemptionCodesBatch.POST(postReq2("/api/v1/admin/redemption-codes/batch", {
      ids: ["r1"],
    }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/admin/partner-keys/batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStub2.requireAdminApi.mockResolvedValue(ADMIN_CTX);
    prismaState2.partnerKey.updateMany.mockResolvedValue({ count: 1 });
    prismaState2.partnerKey.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("200 + 批量停用", async () => {
    const res = await partnerKeysBatch.POST(postReq2("/api/v1/admin/partner-keys/batch", {
      ids: ["k1"], action: "disable",
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: { affected: 1 } });
  });

  it("403 当非管理员", async () => {
    guardStub2.requireAdminApi.mockRejectedValueOnce(FORBID_ERR());
    const res = await partnerKeysBatch.POST(postReq2("/api/v1/admin/partner-keys/batch", {
      ids: ["k1"], action: "disable",
    }));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/v1/admin/partner-keys/batch revoke/activate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStub2.requireAdminApi.mockResolvedValue(ADMIN_CTX);
    prismaState2.partnerKey.updateMany.mockResolvedValue({ count: 2 });
  });

  it("200 + 批量 revoke", async () => {
    const res = await partnerKeysBatch.POST(postReq2("/api/v1/admin/partner-keys/batch", {
      ids: ["k1", "k2"], action: "revoke",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.affected).toBe(2);
    expect(prismaState2.partnerKey.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isActive: false }),
      })
    );
  });

  it("200 + 批量 activate", async () => {
    const res = await partnerKeysBatch.POST(postReq2("/api/v1/admin/partner-keys/batch", {
      ids: ["k1", "k2"], action: "activate",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.affected).toBe(2);
    expect(prismaState2.partnerKey.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isActive: true }),
      })
    );
  });
});
