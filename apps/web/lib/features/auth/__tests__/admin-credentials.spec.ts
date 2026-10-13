/**
 * /api/v1/admin/users/[id]/credentials{,/revoke} 契约（S4 / M5 / G2）。
 * 覆盖：
 *  GET —— 三类凭据脱敏聚合（apiKeys/stationKeys/channels）；响应绝不泄露 keyHash/keyCipher/明文；空态空数组；守卫 403。
 *  POST —— 状态机三态（活跃→吊销 200 + 审计；已停用→409 CREDENTIAL_NOT_REVOCABLE；不存在/非本人→400）；越权 403；reason 必填 400。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  apiKey: { findMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
  stationUserKey: { findMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
  customChannel: { findMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
}));
const auditStub = vi.hoisted(() => ({ writeAudit: vi.fn() }));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("../../../../app/api/v1/_lib/audit", () => auditStub);

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
import { maskApiKey } from "@aidean/shared";

const FORBID = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");
const SESSION_OK = { userId: "u-admin" };

const credentialsRoute = await import("../../../../app/api/v1/admin/users/[id]/credentials/route");
const revokeRoute = await import("../../../../app/api/v1/admin/users/[id]/credentials/revoke/route");

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const postRevoke = (body: unknown, id = "u1") =>
  revokeRoute.POST(new Request("http://localhost/x", { method: "POST", body: JSON.stringify(body) }), ctx(id));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/v1/admin/users/[id]/credentials", () => {
  it("三类聚合脱敏；响应不含 keyHash/keyCipher/明文", async () => {
    guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
    const keyId = "ak_1a2b3c4d5e6f7a8b";
    prismaState.apiKey.findMany.mockResolvedValueOnce([
      { id: "ak1", keyId, isActive: true, lastUsedAt: new Date("2026-10-01T00:00:00Z"), keyHash: "HASHSECRET_DO_NOT_LEAK" },
    ]);
    prismaState.stationUserKey.findMany.mockResolvedValueOnce([
      { id: "sk1", name: null, keyMasked: "sk-****9999", isActive: true, station: { name: "站A" }, keyCipher: "CIPHERSECRET_DO_NOT_LEAK" },
    ]);
    prismaState.customChannel.findMany.mockResolvedValueOnce([
      { id: "ch1", name: "渠道1", format: "OPENAI", isActive: true },
    ]);

    const res = await credentialsRoute.GET(new Request("http://localhost/x"), ctx("u1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.apiKeys[0]).toMatchObject({ id: "ak1", masked: maskApiKey(keyId), status: "ACTIVE", lastUsedAt: "2026-10-01T00:00:00.000Z" });
    expect(body.data.stationKeys[0]).toMatchObject({ id: "sk1", stationName: "站A", masked: "sk-****9999", status: "ACTIVE" });
    expect(body.data.channels[0]).toMatchObject({ id: "ch1", name: "渠道1", provider: "OPENAI", enabled: true });

    const serialized = JSON.stringify(body.data);
    expect(serialized).not.toContain("HASHSECRET_DO_NOT_LEAK");
    expect(serialized).not.toContain("CIPHERSECRET_DO_NOT_LEAK");
    expect(serialized).not.toContain("keyHash");
    expect(serialized).not.toContain("keyCipher");
  });

  it("空态 → 三个空数组", async () => {
    guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
    prismaState.apiKey.findMany.mockResolvedValueOnce([]);
    prismaState.stationUserKey.findMany.mockResolvedValueOnce([]);
    prismaState.customChannel.findMany.mockResolvedValueOnce([]);
    const res = await credentialsRoute.GET(new Request("http://localhost/x"), ctx("u-empty"));
    const body = await res.json();
    expect(body.data).toEqual({ apiKeys: [], stationKeys: [], channels: [] });
  });

  it("守卫拒绝 → 403", async () => {
    guardStub.requireAdminApi.mockRejectedValue(FORBID());
    const res = await credentialsRoute.GET(new Request("http://localhost/x"), ctx("u1"));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/v1/admin/users/[id]/credentials/revoke", () => {
  it("活跃 → 吊销 200 + updateMany(where 含 userId) + 审计 action=2", async () => {
    guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
    prismaState.apiKey.findFirst.mockResolvedValueOnce({ isActive: true });
    prismaState.apiKey.updateMany.mockResolvedValueOnce({ count: 1 });
    const res = await postRevoke({ kind: "apiKey", id: "ak1", reason: "泄露风险" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ kind: "apiKey", id: "ak1", revoked: true });
    expect(prismaState.apiKey.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ak1", userId: "u1" }, data: { isActive: false } }),
    );
    expect(auditStub.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 2, recordId: "ak1", tableName: "api_keys" }));
  });

  it("已停用 → 409 CREDENTIAL_NOT_REVOCABLE，不落库", async () => {
    guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
    prismaState.apiKey.findFirst.mockResolvedValueOnce({ isActive: false });
    const res = await postRevoke({ kind: "apiKey", id: "ak1", reason: "再点一次" });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe(ERROR_CODES.CREDENTIAL_NOT_REVOCABLE);
    expect(prismaState.apiKey.updateMany).not.toHaveBeenCalled();
  });

  it("不存在/跨用户（where 未命中）→ 400，不落库", async () => {
    guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
    prismaState.stationUserKey.findFirst.mockResolvedValueOnce(null);
    const res = await postRevoke({ kind: "stationKey", id: "sk-other", reason: "x" }, "u1");
    expect(res.status).toBe(400);
    expect(prismaState.stationUserKey.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "sk-other", userId: "u1" } }),
    );
    expect(prismaState.stationUserKey.updateMany).not.toHaveBeenCalled();
  });

  it("channel 类型走 customChannel 分支", async () => {
    guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
    prismaState.customChannel.findFirst.mockResolvedValueOnce({ isActive: true });
    prismaState.customChannel.updateMany.mockResolvedValueOnce({ count: 1 });
    const res = await postRevoke({ kind: "channel", id: "ch1", reason: "停用" });
    expect(res.status).toBe(200);
    expect(prismaState.customChannel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ch1", userId: "u1" } }),
    );
    expect(auditStub.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ tableName: "custom_channels" }));
  });

  it("reason 缺失 → 400 校验失败", async () => {
    guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
    const res = await postRevoke({ kind: "apiKey", id: "ak1" });
    expect(res.status).toBe(400);
    expect(prismaState.apiKey.findFirst).not.toHaveBeenCalled();
  });

  it("越权（无 admin.users.write）→ 403", async () => {
    guardStub.requireAdminApi.mockRejectedValue(FORBID());
    const res = await postRevoke({ kind: "apiKey", id: "ak1", reason: "x" });
    expect(res.status).toBe(403);
  });
});
