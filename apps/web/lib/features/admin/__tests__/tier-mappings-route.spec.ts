/**
 * tier-mappings admin route 单测（#18 L4）。
 * 测试 GET 列表 + POST 创建 + PATCH 更新 + DELETE 删除，含审计日志写入。
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../../db/prisma", () => ({
  prisma: {
    userTierMapping: {      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "tm-1", userId: "u1", tierLevel: "OPUS", modelId: "m1" }),
      update: vi.fn().mockResolvedValue({ id: "tm-1", userId: "u1", tierLevel: "SONNET", modelId: "m1" }),
      delete: vi.fn().mockResolvedValue({}),
    },
    user: { findFirst: vi.fn().mockResolvedValue({ id: "u1" }) },
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

describe("tier-mappings admin route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET lists tier mappings with pagination", async () => {
    vi.mocked(prisma.userTierMapping.findMany).mockResolvedValue([
      { id: "tm-1", userId: "u1", tierLevel: "OPUS", modelId: "m1", createdAt: new Date() } as never,
    ]);
    vi.mocked(prisma.userTierMapping.count).mockResolvedValue(1);

    const { GET } = await import("../../../../app/api/v1/admin/tier-mappings/route");
    const url = new URL("http://localhost/api/v1/admin/tier-mappings?page=1&pageSize=20");
    const req = new Request(url, { method: "GET" });

    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.total).toBe(1);
    expect(json.data.items).toHaveLength(1);
  });

  it("POST creates tier mapping with valid fields", async () => {
    vi.mocked(prisma.userTierMapping.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.userTierMapping.create).mockResolvedValue({
      id: "tm-1", userId: "u1", tierLevel: "OPUS", modelId: "m1",
    } as never);

    const { POST } = await import("../../../../app/api/v1/admin/tier-mappings/route");
    const req = new Request("http://localhost/api/v1/admin/tier-mappings", {
      method: "POST",
      body: JSON.stringify({ userId: "u1", tierLevel: "OPUS", modelId: "m1" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.item.tierLevel).toBe("OPUS");
    expect(prisma.userTierMapping.create).toHaveBeenCalledOnce();
    // 审计日志写入
    expect(prisma.auditLog.create).toHaveBeenCalledOnce();
    const auditCall = vi.mocked(prisma.auditLog.create).mock.calls[0][0];
    expect(auditCall.data.tableName).toBe("user_tier_mappings");
    expect(auditCall.data.action).toBe(1);
  });

  it("POST rejects invalid tierLevel", async () => {
    const { POST } = await import("../../../../app/api/v1/admin/tier-mappings/route");
    const req = new Request("http://localhost/api/v1/admin/tier-mappings", {
      method: "POST",
      body: JSON.stringify({ userId: "u1", tierLevel: "INVALID", modelId: "m1" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("POST rejects missing fields", async () => {
    const { POST } = await import("../../../../app/api/v1/admin/tier-mappings/route");
    const req = new Request("http://localhost/api/v1/admin/tier-mappings", {
      method: "POST",
      body: JSON.stringify({ userId: "u1" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("PATCH updates tier mapping tierLevel", async () => {
    vi.mocked(prisma.userTierMapping.findUnique).mockResolvedValue({
      id: "tm-1", userId: "u1", tierLevel: "OPUS", modelId: "m1",
    } as never);
    vi.mocked(prisma.userTierMapping.update).mockResolvedValue({
      id: "tm-1", userId: "u1", tierLevel: "SONNET", modelId: "m1",
    } as never);

    const { PATCH } = await import("../../../../app/api/v1/admin/tier-mappings/[id]/route");
    const req = new Request("http://localhost/api/v1/admin/tier-mappings/tm-1", {
      method: "PATCH",
      body: JSON.stringify({ tierLevel: "SONNET" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req as never, { params: Promise.resolve({ id: "tm-1" }) } as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.item.tierLevel).toBe("SONNET");
    expect(prisma.auditLog.create).toHaveBeenCalledOnce();
    const auditCall = vi.mocked(prisma.auditLog.create).mock.calls[0][0];
    expect(auditCall.data.action).toBe(2);
  });

  it("DELETE removes tier mapping", async () => {
    vi.mocked(prisma.userTierMapping.findUnique).mockResolvedValue({
      id: "tm-1", userId: "u1", tierLevel: "OPUS", modelId: "m1",
    } as never);

    const { DELETE } = await import("../../../../app/api/v1/admin/tier-mappings/[id]/route");
    const req = new Request("http://localhost/api/v1/admin/tier-mappings/tm-1", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    const res = await DELETE(req as never, { params: Promise.resolve({ id: "tm-1" }) } as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.deleted).toBe(true);
    expect(prisma.userTierMapping.delete).toHaveBeenCalledOnce();
    expect(prisma.auditLog.create).toHaveBeenCalledOnce();
    const auditCall = vi.mocked(prisma.auditLog.create).mock.calls[0][0];
    expect(auditCall.data.action).toBe(3);
  });

  it("PATCH 404s on non-existent id", async () => {
    vi.mocked(prisma.userTierMapping.findUnique).mockResolvedValue(null);

    const { PATCH } = await import("../../../../app/api/v1/admin/tier-mappings/[id]/route");
    const req = new Request("http://localhost/api/v1/admin/tier-mappings/none", {
      method: "PATCH",
      body: JSON.stringify({ tierLevel: "SONNET" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req as never, { params: Promise.resolve({ id: "none" }) } as never);
    expect(res.status).toBe(400);
  });
});
