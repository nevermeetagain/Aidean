/**
 * TASK-016 后台开关端点单测（GET/PATCH /api/v1/admin/feature-flags）。
 * 覆盖：GET 投影+排序/权限不足 403·10008；PATCH 成功(isEnabled)+审计+revalidateTag、
 *      description=null 合法、记录不存在 40000、非法体(strict/refine) 40000、MODERATOR 写权 403/10008。
 * 策略同 admin-prices.spec：vi.hoisted guard/prisma/cache 桩 + vi.mock session/prisma/next/cache；
 *   守卫 requireAdminApi 先于任何查库（拒绝时 findUnique/findMany 不触发）。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  featureFlag: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  auditLog: { create: vi.fn() },
}));
const cacheStub = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("next/cache", () => cacheStub);

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";

const listRoute = await import("../../../../app/api/v1/admin/feature-flags/route");
const itemRoute = await import("../../../../app/api/v1/admin/feature-flags/[id]/route");

const SESSION_OK = { userId: "u-admin" };
const FORBID = () => new ApiError(ERROR_CODES.FORBIDDEN, "权限不足");

const rowFlag = (over: Record<string, unknown> = {}) => ({
  id: "ff-1",
  flagCode: "gateway.chat",
  name: "Gateway Chat",
  nameCn: null,
  description: "统一网关对话",
  isEnabled: true,
  category: "gateway",
  priority: 10,
  updatedAt: new Date("2026-10-01T00:00:00.000Z"),
  ...over,
});

function patchReq(body: unknown) {
  return new Request("http://localhost/api/v1/admin/feature-flags/ff-1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.resetAllMocks();
  guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
});

describe("GET /api/v1/admin/feature-flags", () => {
  it("投影 items（updatedAt→ISO）并按 priority desc / flagCode asc 稳定排序", async () => {
    prismaState.featureFlag.findMany.mockResolvedValue([rowFlag()]);

    const res = await listRoute.GET(new Request("http://localhost/api/v1/admin/feature-flags"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(guardStub.requireAdminApi).toHaveBeenCalledWith("admin.configs.read");
    expect(prismaState.featureFlag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ priority: "desc" }, { flagCode: "asc" }] }),
    );
    expect(body.data.items[0]).toMatchObject({ flagCode: "gateway.chat", updatedAt: "2026-10-01T00:00:00.000Z" });
  });

  it("缺 admin.configs.read → 403/10008 且不查库", async () => {
    guardStub.requireAdminApi.mockRejectedValue(FORBID());

    const res = await listRoute.GET(new Request("http://localhost/api/v1/admin/feature-flags"));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.code).toBe(ERROR_CODES.FORBIDDEN);
    expect(prismaState.featureFlag.findMany).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/v1/admin/feature-flags/[id]", () => {
  it("切换 isEnabled → 成功 + 审计(action=2,tableName=feature_flags) + revalidateTag('feature-flags')", async () => {
    prismaState.featureFlag.findUnique.mockResolvedValue(rowFlag({ isEnabled: true }));
    prismaState.featureFlag.update.mockResolvedValue(rowFlag({ isEnabled: false }));

    const res = await itemRoute.PATCH(patchReq({ isEnabled: false }), ctx("ff-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(guardStub.requireAdminApi).toHaveBeenCalledWith("admin.configs.write");
    expect(body.data.isEnabled).toBe(false);
    expect(body.data.updatedAt).toBe("2026-10-01T00:00:00.000Z");
    expect(prismaState.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tableName: "feature_flags", recordId: "ff-1", action: 2 }),
      }),
    );
    expect(cacheStub.revalidateTag).toHaveBeenCalledWith("feature-flags");
  });

  it("description=null 合法 → 成功（changedFields 含 description）", async () => {
    prismaState.featureFlag.findUnique.mockResolvedValue(rowFlag());
    prismaState.featureFlag.update.mockResolvedValue(rowFlag({ description: null }));

    const res = await itemRoute.PATCH(patchReq({ description: null }), ctx("ff-1"));

    expect(res.status).toBe(200);
    const auditArg = prismaState.auditLog.create.mock.calls[0][0] as { data: { changedFields: string[] } };
    expect(auditArg.data.changedFields).toContain("description");
  });

  it("记录不存在 → 40000 且不 update、不审计、不失效", async () => {
    prismaState.featureFlag.findUnique.mockResolvedValue(null);

    const res = await itemRoute.PATCH(patchReq({ isEnabled: false }), ctx("missing"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe(ERROR_CODES.BAD_REQUEST);
    expect(prismaState.featureFlag.update).not.toHaveBeenCalled();
    expect(prismaState.auditLog.create).not.toHaveBeenCalled();
    expect(cacheStub.revalidateTag).not.toHaveBeenCalled();
  });

  it("非法体（空对象·refine 至少一字段）→ 40000 且不 update", async () => {
    prismaState.featureFlag.findUnique.mockResolvedValue(rowFlag());

    const res = await itemRoute.PATCH(patchReq({}), ctx("ff-1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe(ERROR_CODES.BAD_REQUEST);
    expect(prismaState.featureFlag.update).not.toHaveBeenCalled();
  });

  it("未知键（.strict 拒绝）→ 40000 且不 update", async () => {
    prismaState.featureFlag.findUnique.mockResolvedValue(rowFlag());

    const res = await itemRoute.PATCH(patchReq({ isEnabled: true, foo: 1 }), ctx("ff-1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe(ERROR_CODES.BAD_REQUEST);
    expect(prismaState.featureFlag.update).not.toHaveBeenCalled();
  });

  it("同值 PATCH（幂等）→ 仍 update + revalidateTag + 写审计一次", async () => {
    prismaState.featureFlag.findUnique.mockResolvedValue(rowFlag({ isEnabled: false }));
    prismaState.featureFlag.update.mockResolvedValue(rowFlag({ isEnabled: false }));

    const res = await itemRoute.PATCH(patchReq({ isEnabled: false }), ctx("ff-1"));

    expect(res.status).toBe(200);
    expect(prismaState.featureFlag.update).toHaveBeenCalledTimes(1);
    expect(cacheStub.revalidateTag).toHaveBeenCalledWith("feature-flags");
    expect(prismaState.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("MODERATOR 无 admin.configs.write → 403/10008（守卫先于查库）", async () => {
    guardStub.requireAdminApi.mockRejectedValue(FORBID());

    const res = await itemRoute.PATCH(patchReq({ isEnabled: false }), ctx("ff-1"));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.code).toBe(ERROR_CODES.FORBIDDEN); // 10008
    expect(guardStub.requireAdminApi).toHaveBeenCalledWith("admin.configs.write");
    expect(prismaState.featureFlag.findUnique).not.toHaveBeenCalled();
  });
});
