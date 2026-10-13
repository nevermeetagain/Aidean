/**
 * 后台路由守卫冒烟（v1.9）：/api/v1/admin/vendors 与 /api/v1/admin/ladder/config 的 GET/PUT。
 *
 * 策略：vi.mock '../session'（仅替换 requireAdminApi 导出，vitest 按 resolved 路径拦截
 * route 的深相对引用，同 routes-auth.spec.ts 对 db/prisma 的拦截手法）；db/prisma 与
 * ladder/config 经 vi.hoisted stub；内存 Request 直调 withApi 包装后的 handler，
 * 浅断言信封 code 与 HTTP 状态（守卫拒绝 401/403、放行走业务分支 200），不强求业务数据形状。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  vendor: { findMany: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
}));
const ladderStub = vi.hoisted(() => ({
  getLadderGranularity: vi.fn(),
  setLadderGranularity: vi.fn(),
  // R-83 T2：加载窗口百分比 + 热门开发商数（GET/PUT 三键扩展）
  getLadderLoadWindowPct: vi.fn(),
  setLadderLoadWindowPct: vi.fn(),
  getLadderHotVendorCount: vi.fn(),
  setLadderHotVendorCount: vi.fn(),
}));
const auditStub = vi.hoisted(() => ({ writeAudit: vi.fn() }));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({
  prisma: { vendor: prismaState.vendor, $transaction: prismaState.$transaction },
}));
vi.mock("../../ladder/config", () => ladderStub);
vi.mock("../../../../app/api/v1/_lib/audit", () => auditStub);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
// 被测路由（vitest include 仅 lib/**，故经相对路径直调 route handler）
const vendorsRoute = await import("../../../../app/api/v1/admin/vendors/route");
const ladderRoute = await import("../../../../app/api/v1/admin/ladder/config/route");

const SESSION_OK = { userId: "u-admin", tier: "PRO" };
const UNAUTH = () => new ApiError(ERROR_CODES.UNAUTHENTICATED, "请先登录"); // → HTTP 401
const FORBID = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限"); // → HTTP 403

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/admin/vendors 守卫冒烟", () => {
  it("① GET 未登录（10004）→ HTTP 401 信封 code=10004 / data=null", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(UNAUTH());
    const res = await vendorsRoute.GET(new Request("http://localhost/api/v1/admin/vendors"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe(10004);
    expect(body.data).toBeNull();
  });

  it("② GET 非管理员（10008）→ HTTP 403 信封 code=10008，不触 findMany", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(FORBID());
    const res = await vendorsRoute.GET(new Request("http://localhost/api/v1/admin/vendors"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe(10008);
    expect(prismaState.vendor.findMany).not.toHaveBeenCalled();
  });

  it("③ PUT 非管理员（10008）→ HTTP 403，不触事务", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(FORBID());
    const res = await vendorsRoute.PUT(
      new Request("http://localhost/api/v1/admin/vendors", { method: "PUT" })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe(10008);
    expect(prismaState.$transaction).not.toHaveBeenCalled();
  });

  it("④ GET 放行 → 200 code=0 走 findMany 业务分支", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.vendor.findMany.mockResolvedValueOnce([{ id: "v-1", priority: 1 }]);
    const res = await vendorsRoute.GET(new Request("http://localhost/api/v1/admin/vendors"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.vendors).toEqual([{ id: "v-1", priority: 1 }]);
  });

  it("⑤ PUT 放行 + 合法 body → 200 code=0 走事务分支（saved 行数）", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.$transaction.mockResolvedValueOnce([{ id: "v-1" }]);
    const res = await vendorsRoute.PUT(
      new Request("http://localhost/api/v1/admin/vendors", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priorities: [{ id: "v-1", priority: 1 }] }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.saved).toBe(1);
  });

  it("⑥ PUT 放行 + 非法 body → 400 code=40000（守卫通过后的业务校验分支）", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    const res = await vendorsRoute.PUT(
      new Request("http://localhost/api/v1/admin/vendors", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priorities: [{ id: "", priority: 0 }] }),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
  });
});

describe("/admin/ladder/config 守卫冒烟", () => {
  it("⑦ GET 非管理员（10008）→ HTTP 403，不触配置读取", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(FORBID());
    const res = await ladderRoute.GET(new Request("http://localhost/api/v1/admin/ladder/config"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe(10008);
    expect(ladderStub.getLadderGranularity).not.toHaveBeenCalled();
  });

  it("⑧ PUT 非管理员（10008）→ HTTP 403，未触达写配置", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(FORBID());
    const res = await ladderRoute.PUT(
      new Request("http://localhost/api/v1/admin/ladder/config", { method: "PUT" })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe(10008);
    expect(ladderStub.setLadderGranularity).not.toHaveBeenCalled();
  });

  it("⑨ GET/PUT 放行 → 200 code=0 走颗粒度读写分支", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    ladderStub.getLadderGranularity.mockResolvedValueOnce(0.1);
    ladderStub.getLadderLoadWindowPct.mockResolvedValue(25);
    ladderStub.getLadderHotVendorCount.mockResolvedValue(8);
    const getRes = await ladderRoute.GET(new Request("http://localhost/api/v1/admin/ladder/config"));
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.code).toBe(0);
    expect(getBody.data.granularity).toBe(0.1);

    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    ladderStub.setLadderGranularity.mockResolvedValueOnce(0.2);
    const putRes = await ladderRoute.PUT(
      new Request("http://localhost/api/v1/admin/ladder/config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ granularity: 0.2 }),
      })
    );
    expect(putRes.status).toBe(200);
    const putBody = await putRes.json();
    expect(putBody.data.granularity).toBe(0.2);
    expect(ladderStub.setLadderGranularity).toHaveBeenCalledWith(0.2);
  });
});
