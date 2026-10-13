/**
 * evaluations route 单测（R-50 评估管理）。
 * 测试 GET 列表 + DELETE 软删除。
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../../db/prisma", () => ({
  prisma: {
    evaluation: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
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

describe("evaluations route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET lists evaluations with pagination", async () => {
    vi.mocked(prisma.evaluation.findMany).mockResolvedValue([
      { id: "eval-1", title: "测试评估", evalType: "single", status: 2, cost: 10, deletedAt: null } as never,
    ]);
    vi.mocked(prisma.evaluation.count).mockResolvedValue(1);

    const { GET } = await import("../../../../app/api/v1/admin/evaluations/route");
    const url = new URL("http://localhost/api/v1/admin/evaluations?page=1&pageSize=20");
    const req = new Request(url, { method: "GET" });

    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.total).toBe(1);
    expect(json.data.items).toHaveLength(1);
  });

  it("GET filters by status", async () => {
    vi.mocked(prisma.evaluation.findMany).mockResolvedValue([]);
    vi.mocked(prisma.evaluation.count).mockResolvedValue(0);

    const { GET } = await import("../../../../app/api/v1/admin/evaluations/route");
    const url = new URL("http://localhost/api/v1/admin/evaluations?status=2");
    const req = new Request(url, { method: "GET" });

    await GET(req as never);
    expect(prisma.evaluation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 2 }),
      })
    );
  });

  it("DELETE soft-deletes evaluation", async () => {
    vi.mocked(prisma.evaluation.findUnique).mockResolvedValue({
      id: "eval-1", title: "测试", deletedAt: null,
    } as never);
    vi.mocked(prisma.evaluation.update).mockResolvedValue({ id: "eval-1" } as never);

    const { DELETE } = await import("../../../../app/api/v1/admin/evaluations/[id]/route");
    const req = new Request("http://localhost/api/v1/admin/evaluations/eval-1", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    const res = await DELETE(req as never, { params: Promise.resolve({ id: "eval-1" }) } as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.deleted).toBe(true);
    expect(prisma.evaluation.update).toHaveBeenCalledOnce();
  });

  it("DELETE rejects non-existent evaluation", async () => {
    vi.mocked(prisma.evaluation.findUnique).mockResolvedValue(null);

    const { DELETE } = await import("../../../../app/api/v1/admin/evaluations/[id]/route");
    const req = new Request("http://localhost/api/v1/admin/evaluations/nope", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    const res = await DELETE(req as never, { params: Promise.resolve({ id: "nope" }) } as never);
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/v1/admin/evaluations/[id] archive/unarchive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PATCH archives evaluation (sets deletedAt)", async () => {
    vi.mocked(prisma.evaluation.findUnique).mockResolvedValue({
      id: "eval-1", title: "测试", evalType: "single", status: 2, deletedAt: null,
    } as never);
    vi.mocked(prisma.evaluation.update).mockResolvedValue({ id: "eval-1" } as never);

    const { PATCH } = await import("../../../../app/api/v1/admin/evaluations/[id]/route");
    const req = new Request("http://localhost/api/v1/admin/evaluations/eval-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "archive" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req as never, { params: Promise.resolve({ id: "eval-1" }) } as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.archived).toBe(true);
    expect(prisma.evaluation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it("PATCH unarchives evaluation (clears deletedAt)", async () => {
    vi.mocked(prisma.evaluation.findUnique).mockResolvedValue({
      id: "eval-1", title: "测试", evalType: "single", status: 2, deletedAt: new Date("2026-01-01"),
    } as never);
    vi.mocked(prisma.evaluation.update).mockResolvedValue({ id: "eval-1" } as never);

    const { PATCH } = await import("../../../../app/api/v1/admin/evaluations/[id]/route");
    const req = new Request("http://localhost/api/v1/admin/evaluations/eval-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "unarchive" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req as never, { params: Promise.resolve({ id: "eval-1" }) } as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.unarchived).toBe(true);
    expect(prisma.evaluation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: null }),
      })
    );
  });

  it("PATCH rejects non-existent evaluation", async () => {
    vi.mocked(prisma.evaluation.findUnique).mockResolvedValue(null);

    const { PATCH } = await import("../../../../app/api/v1/admin/evaluations/[id]/route");
    const req = new Request("http://localhost/api/v1/admin/evaluations/nope", {
      method: "PATCH",
      body: JSON.stringify({ action: "archive" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req as never, { params: Promise.resolve({ id: "nope" }) } as never);
    expect(res.status).toBe(400);
  });

  it("PATCH rejects invalid action", async () => {
    const { PATCH } = await import("../../../../app/api/v1/admin/evaluations/[id]/route");
    const req = new Request("http://localhost/api/v1/admin/evaluations/eval-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "invalid" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req as never, { params: Promise.resolve({ id: "eval-1" }) } as never);
    expect(res.status).toBe(400);
  });
});
