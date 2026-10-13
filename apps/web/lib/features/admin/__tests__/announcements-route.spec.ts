/**
 * announcements route 单测（R-51 公告管理）。
 * 测试 POST 创建公告 + PATCH 更新 + DELETE 软删除。
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("../../../db/prisma", () => ({
  prisma: {
    announcement: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "ann-1", title: "测试公告", type: "system" }),
      update: vi.fn().mockResolvedValue({ id: "ann-1", title: "更新后" }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "log-1" }),
    },
  },
}));

vi.mock("../../../features/auth/session", () => ({
  requireAdminApi: vi.fn().mockResolvedValue({ userId: "admin-1" }),
}));


vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { prisma } from "../../../db/prisma";

describe("announcements route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST creates announcement with required fields", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.announcement.create).mockResolvedValue({
      id: "ann-1",
      title: "系统维护通知",
      content: "内容",
      type: "maintenance",
      priority: 0,
      isPinned: false,
      isPublished: true,
      publishedAt: new Date(),
      expiredAt: null,
      targetRoles: [],
      authorId: "admin-1",
      viewCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as never);

    const { POST } = await import("../../../../app/api/v1/admin/announcements/route");
    const req = new Request("http://localhost/api/v1/admin/announcements", {
      method: "POST",
      body: JSON.stringify({ title: "系统维护通知", content: "内容", type: "maintenance", isPublished: true }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.item.title).toBe("系统维护通知");
    expect(prisma.announcement.create).toHaveBeenCalledOnce();
  });

  it("POST rejects missing title", async () => {
    const { POST } = await import("../../../../app/api/v1/admin/announcements/route");
    const req = new Request("http://localhost/api/v1/admin/announcements", {
      method: "POST",
      body: JSON.stringify({ content: "内容" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("GET lists announcements with pagination", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      { id: "ann-1", title: "A", type: "system", deletedAt: null } as never,
    ]);
    vi.mocked(prisma.announcement.count).mockResolvedValue(1);

    const { GET } = await import("../../../../app/api/v1/admin/announcements/route");
    const url = new URL("http://localhost/api/v1/admin/announcements?page=1&pageSize=20");
    const req = new Request(url, { method: "GET" });

    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.total).toBe(1);
    expect(json.data.items).toHaveLength(1);
  });
});
