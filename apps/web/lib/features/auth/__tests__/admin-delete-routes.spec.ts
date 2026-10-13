/**
 * TP-4.1: 3 个 DELETE 路由单测（redemption-codes/[id]、partner-keys/[id]、benchmarks/[id]）。
 *
 * 覆盖矩阵：
 * - 正常删除（满足前置条件）→ 200 + prisma.delete 调用 + audit action=3
 * - 安全前置校验拒绝（不满足前置条件）→ 400 + prisma.delete 不调用
 * - 记录不存在 → 400/404 + prisma.delete 不调用
 * - 审计日志写入验证（action=3, tableName, recordId）
 *
 * mock 策略：prisma/session/audit/redemptionService 全 stub；withApi/errors 用真实模块。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock state ──────────────────────────────────────────────
const prismaState = vi.hoisted(() => ({
  redemption: { findUnique: vi.fn(), delete: vi.fn() },
  partnerKey: { findUnique: vi.fn(), delete: vi.fn() },
  benchmark: { findUnique: vi.fn(), delete: vi.fn() },
}));

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const auditStub = vi.hoisted(() => ({ writeAudit: vi.fn() }));
const redemptionServiceStub = vi.hoisted(() => ({
  redemptionService: { disableCode: vi.fn() },
}));

vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("../session", () => guardStub);
vi.mock("../../../../app/api/v1/_lib/audit", () => auditStub);
vi.mock("../../../features/package/redemption/service", () => redemptionServiceStub);

// ── Imports (after mocks) ───────────────────────────────────
const { DELETE: deleteRedemption } = await import(
  "../../../../app/api/v1/admin/redemption-codes/[id]/route"
);
const { DELETE: deletePartnerKey } = await import(
  "../../../../app/api/v1/admin/partner-keys/[id]/route"
);
const { DELETE: deleteBenchmark } = await import(
  "../../../../app/api/v1/admin/benchmarks/[id]/route"
);

// ── Helpers ─────────────────────────────────────────────────
const SESSION_OK = { userId: "admin-1", tier: "ADMIN" };

function mkReq(method: string, url: string) {
  return new Request(`http://localhost${url}`, { method });
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.resetAllMocks();
  guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
  auditStub.writeAudit.mockResolvedValue(undefined);
});

// ── redemption-codes/[id] DELETE ───────────────────────────
describe("DELETE /api/v1/admin/redemption-codes/[id]", () => {
  it("正常删除已禁用码 → 200 + delete + audit action=3", async () => {
    prismaState.redemption.findUnique.mockResolvedValue({
      id: "r-1", code: "ABCD1234", status: "DISABLED",
    });
    prismaState.redemption.delete.mockResolvedValue({});

    const res = await deleteRedemption(mkReq("DELETE", "/api/v1/admin/redemption-codes/r-1"), ctx("r-1"));
    const json = (await res.json()) as { data: { deleted: boolean } };

    expect(res.status).toBe(200);
    expect(json.data.deleted).toBe(true);
    expect(prismaState.redemption.delete).toHaveBeenCalledWith({ where: { id: "r-1" } });
    expect(auditStub.writeAudit).toHaveBeenCalledWith(expect.objectContaining({
      tableName: "redemptions",
      recordId: "r-1",
      action: 3,
      actorId: "admin-1",
    }));
  });

  it("安全前置校验: ENABLED 状态 → 400 + 不删除", async () => {
    prismaState.redemption.findUnique.mockResolvedValue({
      id: "r-2", code: "EFGH5678", status: "ENABLED",
    });

    const res = await deleteRedemption(mkReq("DELETE", "/api/v1/admin/redemption-codes/r-2"), ctx("r-2"));

    expect(res.status).toBe(400);
    expect(prismaState.redemption.delete).not.toHaveBeenCalled();
    expect(auditStub.writeAudit).not.toHaveBeenCalled();
  });

  it("安全前置校验: ISSUED 状态 → 400 + 不删除", async () => {
    prismaState.redemption.findUnique.mockResolvedValue({
      id: "r-3", code: "IJKL9012", status: "ISSUED",
    });

    const res = await deleteRedemption(mkReq("DELETE", "/api/v1/admin/redemption-codes/r-3"), ctx("r-3"));

    expect(res.status).toBe(400);
    expect(prismaState.redemption.delete).not.toHaveBeenCalled();
  });

  it("记录不存在 → 400 + 不删除", async () => {
    prismaState.redemption.findUnique.mockResolvedValue(null);

    const res = await deleteRedemption(mkReq("DELETE", "/api/v1/admin/redemption-codes/rx"), ctx("rx"));

    expect(res.status).toBe(400);
    expect(prismaState.redemption.delete).not.toHaveBeenCalled();
  });

  it("EXPIRED 状态可删除", async () => {
    prismaState.redemption.findUnique.mockResolvedValue({
      id: "r-4", code: "MNOP3456", status: "EXPIRED",
    });
    prismaState.redemption.delete.mockResolvedValue({});

    const res = await deleteRedemption(mkReq("DELETE", "/api/v1/admin/redemption-codes/r-4"), ctx("r-4"));

    expect(res.status).toBe(200);
    expect(prismaState.redemption.delete).toHaveBeenCalled();
  });

  it("USED 状态可删除", async () => {
    prismaState.redemption.findUnique.mockResolvedValue({
      id: "r-5", code: "QRST7890", status: "USED",
    });
    prismaState.redemption.delete.mockResolvedValue({});

    const res = await deleteRedemption(mkReq("DELETE", "/api/v1/admin/redemption-codes/r-5"), ctx("r-5"));

    expect(res.status).toBe(200);
    expect(prismaState.redemption.delete).toHaveBeenCalled();
  });
});

// ── partner-keys/[id] DELETE ───────────────────────────────
describe("DELETE /api/v1/admin/partner-keys/[id]", () => {
  it("正常删除已停用密钥 → 200 + delete + audit action=3", async () => {
    prismaState.partnerKey.findUnique.mockResolvedValue({
      id: "pk-1", name: "dev-key", isActive: false, prefix: "ak_dev_",
    });
    prismaState.partnerKey.delete.mockResolvedValue({});

    const res = await deletePartnerKey(mkReq("DELETE", "/api/v1/admin/partner-keys/pk-1"), ctx("pk-1"));
    const json = (await res.json()) as { data: { deleted: boolean } };

    expect(res.status).toBe(200);
    expect(json.data.deleted).toBe(true);
    expect(prismaState.partnerKey.delete).toHaveBeenCalledWith({ where: { id: "pk-1" } });
    expect(auditStub.writeAudit).toHaveBeenCalledWith(expect.objectContaining({
      tableName: "partner_keys",
      recordId: "pk-1",
      action: 3,
      actorId: "admin-1",
    }));
  });

  it("安全前置校验: isActive=true → 400 + 不删除", async () => {
    prismaState.partnerKey.findUnique.mockResolvedValue({
      id: "pk-2", name: "live-key", isActive: true, prefix: "ak_live_",
    });

    const res = await deletePartnerKey(mkReq("DELETE", "/api/v1/admin/partner-keys/pk-2"), ctx("pk-2"));

    expect(res.status).toBe(400);
    expect(prismaState.partnerKey.delete).not.toHaveBeenCalled();
    expect(auditStub.writeAudit).not.toHaveBeenCalled();
  });

  it("记录不存在 → 400 + 不删除", async () => {
    prismaState.partnerKey.findUnique.mockResolvedValue(null);

    const res = await deletePartnerKey(mkReq("DELETE", "/api/v1/admin/partner-keys/pkx"), ctx("pkx"));

    expect(res.status).toBe(400);
    expect(prismaState.partnerKey.delete).not.toHaveBeenCalled();
  });
});

// ── benchmarks/[id] DELETE ─────────────────────────────────
describe("DELETE /api/v1/admin/benchmarks/[id]", () => {
  it("正常删除 → 200 + delete + audit action=3", async () => {
    prismaState.benchmark.findUnique.mockResolvedValue({
      id: "b-1", modelId: "m-1", sourceName: "manual", benchmarkType: "MMLU", totalScore: 88.5,
    });
    prismaState.benchmark.delete.mockResolvedValue({});

    const res = await deleteBenchmark(mkReq("DELETE", "/api/v1/admin/benchmarks/b-1"), ctx("b-1"));
    const json = (await res.json()) as { data: { deleted: boolean } };

    expect(res.status).toBe(200);
    expect(json.data.deleted).toBe(true);
    expect(prismaState.benchmark.delete).toHaveBeenCalledWith({ where: { id: "b-1" } });
    expect(auditStub.writeAudit).toHaveBeenCalledWith(expect.objectContaining({
      tableName: "benchmarks",
      recordId: "b-1",
      action: 3,
      actorId: "admin-1",
    }));
  });

  it("记录不存在 → 400 + 不删除", async () => {
    prismaState.benchmark.findUnique.mockResolvedValue(null);

    const res = await deleteBenchmark(mkReq("DELETE", "/api/v1/admin/benchmarks/bx"), ctx("bx"));

    expect(res.status).toBe(400);
    expect(prismaState.benchmark.delete).not.toHaveBeenCalled();
    expect(auditStub.writeAudit).not.toHaveBeenCalled();
  });
});
