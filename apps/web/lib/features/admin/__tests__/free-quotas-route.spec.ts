/**
 * free-quotas admin route 单测（#18 L4）。
 * 测试 GET 列表 + POST 创建 + PATCH 更新 + DELETE 删除，含审计日志写入。
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../../db/prisma", () => ({
  prisma: {
    userFreeQuota: {      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "fq-1", tier: "NORMAL", modelId: "m1", quotaTokens: 100000, refreshCycle: "DAY" }),
      update: vi.fn().mockResolvedValue({ id: "fq-1", tier: "NORMAL", modelId: "m1", quotaTokens: 200000, refreshCycle: "WEEK" }),
      delete: vi.fn().mockResolvedValue({}),
    },
    aiModel: { findFirst: vi.fn().mockResolvedValue({ id: "m1" }) },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "log-1" }),
    },
  },
}));

vi.mock("../../../features/auth/session", () => ({
  requireAdminApi: vi.fn().mockResolvedValue({ userId: "admin-1" }),
}));

import { prisma } from "../../../db/prisma";

describe("free-quotas admin route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET lists free quotas with pagination", async () => {
    vi.mocked(prisma.userFreeQuota.findMany).mockResolvedValue([
      { id: "fq-1", tier: "NORMAL", modelId: "m1", quotaTokens: 100000, refreshCycle: "DAY", createdAt: new Date() } as never,
    ]);
    vi.mocked(prisma.userFreeQuota.count).mockResolvedValue(1);

    const { GET } = await import("../../../../app/api/v1/admin/free-quotas/route");
    const url = new URL("http://localhost/api/v1/admin/free-quotas?page=1&pageSize=20");
    const req = new Request(url, { method: "GET" });

    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.total).toBe(1);
    expect(json.data.items).toHaveLength(1);
  });

  it("POST creates free quota with valid fields", async () => {
    vi.mocked(prisma.userFreeQuota.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.userFreeQuota.create).mockResolvedValue({
      id: "fq-1", tier: "NORMAL", modelId: "m1", quotaTokens: 100000, refreshCycle: "DAY",
    } as never);

    const { POST } = await import("../../../../app/api/v1/admin/free-quotas/route");
    const req = new Request("http://localhost/api/v1/admin/free-quotas", {
      method: "POST",
      body: JSON.stringify({ tier: "NORMAL", modelId: "m1", quotaTokens: 100000, refreshCycle: "DAY" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.item.tier).toBe("NORMAL");
    expect(json.data.item.quotaTokens).toBe(100000);
    expect(prisma.userFreeQuota.create).toHaveBeenCalledOnce();
    // 审计日志写入
    expect(prisma.auditLog.create).toHaveBeenCalledOnce();
    const auditCall = vi.mocked(prisma.auditLog.create).mock.calls[0][0];
    expect(auditCall.data.tableName).toBe("user_free_quotas");
    expect(auditCall.data.action).toBe(1);
  });

  it("POST rejects invalid tier", async () => {
    const { POST } = await import("../../../../app/api/v1/admin/free-quotas/route");
    const req = new Request("http://localhost/api/v1/admin/free-quotas", {
      method: "POST",
      body: JSON.stringify({ tier: "INVALID", modelId: "m1", quotaTokens: 100, refreshCycle: "DAY" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("POST rejects negative quotaTokens", async () => {
    const { POST } = await import("../../../../app/api/v1/admin/free-quotas/route");
    const req = new Request("http://localhost/api/v1/admin/free-quotas", {
      method: "POST",
      body: JSON.stringify({ tier: "NORMAL", modelId: "m1", quotaTokens: -100, refreshCycle: "DAY" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("PATCH updates quotaTokens and refreshCycle", async () => {
    vi.mocked(prisma.userFreeQuota.findUnique).mockResolvedValue({
      id: "fq-1", tier: "NORMAL", modelId: "m1", quotaTokens: 100000, refreshCycle: "DAY",
    } as never);
    vi.mocked(prisma.userFreeQuota.update).mockResolvedValue({
      id: "fq-1", tier: "NORMAL", modelId: "m1", quotaTokens: 200000, refreshCycle: "WEEK",
    } as never);

    const { PATCH } = await import("../../../../app/api/v1/admin/free-quotas/[id]/route");
    const req = new Request("http://localhost/api/v1/admin/free-quotas/fq-1", {
      method: "PATCH",
      body: JSON.stringify({ quotaTokens: 200000, refreshCycle: "WEEK" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req as never, { params: Promise.resolve({ id: "fq-1" }) } as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.item.quotaTokens).toBe(200000);
    expect(json.data.item.refreshCycle).toBe("WEEK");
    expect(prisma.auditLog.create).toHaveBeenCalledOnce();
    const auditCall = vi.mocked(prisma.auditLog.create).mock.calls[0][0];
    expect(auditCall.data.action).toBe(2);
  });

  it("DELETE removes free quota", async () => {
    vi.mocked(prisma.userFreeQuota.findUnique).mockResolvedValue({
      id: "fq-1", tier: "NORMAL", modelId: "m1", quotaTokens: 100000, refreshCycle: "DAY",
    } as never);

    const { DELETE } = await import("../../../../app/api/v1/admin/free-quotas/[id]/route");
    const req = new Request("http://localhost/api/v1/admin/free-quotas/fq-1", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    const res = await DELETE(req as never, { params: Promise.resolve({ id: "fq-1" }) } as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.deleted).toBe(true);
    expect(prisma.userFreeQuota.delete).toHaveBeenCalledOnce();
    expect(prisma.auditLog.create).toHaveBeenCalledOnce();
    const auditCall = vi.mocked(prisma.auditLog.create).mock.calls[0][0];
    expect(auditCall.data.action).toBe(3);
  });

  it("DELETE 404s on non-existent id", async () => {
    vi.mocked(prisma.userFreeQuota.findUnique).mockResolvedValue(null);

    const { DELETE } = await import("../../../../app/api/v1/admin/free-quotas/[id]/route");
    const req = new Request("http://localhost/api/v1/admin/free-quotas/none", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    const res = await DELETE(req as never, { params: Promise.resolve({ id: "none" }) } as never);
    expect(res.status).toBe(400);
  });
});
