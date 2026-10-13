/**
 * api-stations route 单测（R-49 API站点管理）。
 * 测试 GET 列表 + POST 创建 + GET([id]) 详情 + PATCH 更新 + DELETE 软删除。
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../../db/prisma", () => ({
  prisma: {
    aPIStation: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "st-1", name: "OpenAI" }),
      update: vi.fn().mockResolvedValue({ id: "st-1", name: "Updated" }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "log-1" }),
    },
  },
}));

vi.mock("../../../features/auth/session", () => ({
  requireAdminApi: vi.fn().mockResolvedValue({ userId: "admin-1" }),
}));

import { prisma } from "../../../db/prisma";

describe("api-stations route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET lists stations with pagination", async () => {
    vi.mocked(prisma.aPIStation.findMany).mockResolvedValue([
      { id: "st-1", name: "OpenAI", displayName: "OpenAI", deletedAt: null } as never,
    ]);
    vi.mocked(prisma.aPIStation.count).mockResolvedValue(1);

    const { GET } = await import("../../../../app/api/v1/admin/api-stations/route");
    const url = new URL("http://localhost/api/v1/admin/api-stations?page=1&pageSize=20");
    const req = new Request(url, { method: "GET" });

    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.total).toBe(1);
    expect(json.data.items).toHaveLength(1);
  });

  it("GET filters by search", async () => {
    vi.mocked(prisma.aPIStation.findMany).mockResolvedValue([]);
    vi.mocked(prisma.aPIStation.count).mockResolvedValue(0);

    const { GET } = await import("../../../../app/api/v1/admin/api-stations/route");
    const url = new URL("http://localhost/api/v1/admin/api-stations?search=openai");
    const req = new Request(url, { method: "GET" });

    await GET(req as never);
    expect(prisma.aPIStation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: expect.objectContaining({ contains: "openai" }),
        }),
      })
    );
  });

  it("POST creates station with valid data", async () => {
    vi.mocked(prisma.aPIStation.create).mockResolvedValue({
      id: "st-1", name: "OpenAI", displayName: "OpenAI", description: "",
      provider: "openai", isVerified: false, isFeatured: false,
    } as never);

    const { POST } = await import("../../../../app/api/v1/admin/api-stations/route");
    const req = new Request("http://localhost/api/v1/admin/api-stations", {
      method: "POST",
      body: JSON.stringify({ name: "OpenAI", displayName: "OpenAI", provider: "openai" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.item.name).toBe("OpenAI");
    expect(prisma.aPIStation.create).toHaveBeenCalledOnce();
  });

  it("POST rejects missing name", async () => {
    const { POST } = await import("../../../../app/api/v1/admin/api-stations/route");
    const req = new Request("http://localhost/api/v1/admin/api-stations", {
      method: "POST",
      body: JSON.stringify({ displayName: "test" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("GET([id]) returns station detail", async () => {
    vi.mocked(prisma.aPIStation.findUnique).mockResolvedValue({
      id: "st-1", name: "OpenAI", displayName: "OpenAI", deletedAt: null,
      keys: [], billingRule: null, _count: { packages: 0, stationUserKeys: 0 },
    } as never);

    const { GET } = await import("../../../../app/api/v1/admin/api-stations/[id]/route");
    const req = new Request("http://localhost/api/v1/admin/api-stations/st-1", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const res = await GET(req as never, { params: Promise.resolve({ id: "st-1" }) } as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.item.id).toBe("st-1");
  });

  it("PATCH updates station", async () => {
    vi.mocked(prisma.aPIStation.findUnique).mockResolvedValue({
      id: "st-1", name: "OpenAI", displayName: "OpenAI", deletedAt: null,
    } as never);
    vi.mocked(prisma.aPIStation.update).mockResolvedValue({
      id: "st-1", name: "OpenAI Pro", isVerified: true,
    } as never);

    const { PATCH } = await import("../../../../app/api/v1/admin/api-stations/[id]/route");
    const req = new Request("http://localhost/api/v1/admin/api-stations/st-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "OpenAI Pro", isVerified: true }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req as never, { params: Promise.resolve({ id: "st-1" }) } as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.item.name).toBe("OpenAI Pro");
  });

  it("DELETE soft-deletes station", async () => {
    vi.mocked(prisma.aPIStation.findUnique).mockResolvedValue({
      id: "st-1", name: "OpenAI", deletedAt: null,
    } as never);
    vi.mocked(prisma.aPIStation.update).mockResolvedValue({ id: "st-1" } as never);

    const { DELETE } = await import("../../../../app/api/v1/admin/api-stations/[id]/route");
    const req = new Request("http://localhost/api/v1/admin/api-stations/st-1", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    const res = await DELETE(req as never, { params: Promise.resolve({ id: "st-1" }) } as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.deleted).toBe(true);
  });

  it("DELETE rejects non-existent station", async () => {
    vi.mocked(prisma.aPIStation.findUnique).mockResolvedValue(null);

    const { DELETE } = await import("../../../../app/api/v1/admin/api-stations/[id]/route");
    const req = new Request("http://localhost/api/v1/admin/api-stations/nope", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    const res = await DELETE(req as never, { params: Promise.resolve({ id: "nope" }) } as never);
    expect(res.status).toBe(400);
  });

  it("GET([id]) rejects non-existent station", async () => {
    vi.mocked(prisma.aPIStation.findUnique).mockResolvedValue(null);

    const { GET } = await import("../../../../app/api/v1/admin/api-stations/[id]/route");
    const req = new Request("http://localhost/api/v1/admin/api-stations/nope", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const res = await GET(req as never, { params: Promise.resolve({ id: "nope" }) } as never);
    expect(res.status).toBe(400);
  });
});
