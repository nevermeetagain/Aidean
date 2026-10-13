/**
 * /api/v1/admin/oidc-clients（S7.3 OIDC 管理）路由单测。
 * 覆盖：GET 列表（createdAt→ISO、绝不含 clientSecretHash）/守卫 403；
 *      PATCH 编辑元数据（成功 + 审计、记录不存在 400、非法回调 URI 400）。
 * 策略同 order-disposition.spec：vi.hoisted guard/prisma 桩 + vi.mock session/prisma。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  oidcClient: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  auditLog: { create: vi.fn() },
}));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";

const listRoute = await import("../../../../app/api/v1/admin/oidc-clients/route");
const itemRoute = await import("../../../../app/api/v1/admin/oidc-clients/[id]/route");

const SESSION_OK = { userId: "u-admin" };
const FORBID = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");

function patchReq(body: unknown) {
  return new Request("http://localhost/api/v1/admin/oidc-clients/c1", { method: "PATCH", body: JSON.stringify(body) });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.resetAllMocks();
  guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
});

describe("GET /api/v1/admin/oidc-clients", () => {
  it("列表：createdAt→ISO，投影不含 clientSecretHash", async () => {
    prismaState.oidcClient.findMany.mockResolvedValueOnce([
      {
        id: "c1",
        clientId: "aidean-web",
        name: "Aidean Web",
        redirectUris: ["https://web.example.com/cb"],
        logoutUri: null,
        scopes: ["openid", "profile"],
        pkceRequired: true,
        firstParty: true,
        isActive: true,
        createdAt: new Date("2026-10-01T00:00:00Z"),
      },
    ]);
    const res = await listRoute.GET(new Request("http://localhost/api/v1/admin/oidc-clients"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    const c = body.data.clients[0];
    expect(c.clientId).toBe("aidean-web");
    expect(c.createdAt).toBe("2026-10-01T00:00:00.000Z");
    expect("clientSecretHash" in c).toBe(false);
  });

  it("守卫拒绝 → 403", async () => {
    guardStub.requireAdminApi.mockRejectedValue(FORBID());
    const res = await listRoute.GET(new Request("http://localhost/api/v1/admin/oidc-clients"));
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/v1/admin/oidc-clients/[id]", () => {
  it("编辑元数据成功 → 仅改业务字段 + 审计", async () => {
    prismaState.oidcClient.findUnique.mockResolvedValueOnce({
      id: "c1",
      clientId: "aidean-web",
      name: "旧名",
      redirectUris: ["https://old.example.com/cb"],
      scopes: ["openid"],
      isActive: true,
    });
    prismaState.oidcClient.update.mockResolvedValueOnce({
      id: "c1",
      clientId: "aidean-web",
      name: "新名",
      redirectUris: ["https://new.example.com/cb"],
      scopes: ["openid", "email"],
      isActive: false,
    });
    const res = await itemRoute.PATCH(
      patchReq({ name: "新名", redirectUris: ["https://new.example.com/cb"], scopes: ["openid", "email"], isActive: false }),
      ctx("c1")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ name: "新名", isActive: false });
    expect(prismaState.oidcClient.update).toHaveBeenCalledTimes(1);
    expect(prismaState.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("记录不存在 → 400，不更新", async () => {
    prismaState.oidcClient.findUnique.mockResolvedValueOnce(null);
    const res = await itemRoute.PATCH(patchReq({ name: "X" }), ctx("nope"));
    expect(res.status).toBe(400);
    expect(prismaState.oidcClient.update).not.toHaveBeenCalled();
  });

  it("非法回调 URI（非 URL）→ 400，不更新", async () => {
    prismaState.oidcClient.findUnique.mockResolvedValueOnce({
      id: "c1",
      clientId: "aidean-web",
      name: "旧名",
      redirectUris: [],
      scopes: [],
      isActive: true,
    });
    const res = await itemRoute.PATCH(patchReq({ redirectUris: ["not-a-url"] }), ctx("c1"));
    expect(res.status).toBe(400);
    expect(prismaState.oidcClient.update).not.toHaveBeenCalled();
  });
});
