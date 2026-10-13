/**
 * admin batch 路由单测（R-23 修复）：models/users/news batch 守卫 + 批量操作。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const auditStub = vi.hoisted(() => ({ writeAudit: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  aiModel: { updateMany: vi.fn() },
  auditLog: { create: vi.fn() },
  user: { updateMany: vi.fn() },
  newsItem: { updateMany: vi.fn() },
}));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("../../../../app/api/v1/_lib/audit", () => auditStub);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const modelsBatch = await import("../../../../app/api/v1/admin/models/batch/route");
const usersBatch = await import("../../../../app/api/v1/admin/users/batch/route");
const newsBatch = await import("../../../../app/api/v1/admin/news/batch/route");

function postReq(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }) as never;
}

describe("POST /api/v1/admin/models/batch 守卫矩阵", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStub.requireAdminApi.mockResolvedValue({ userId: "admin-1", role: "ADMIN" });
    prismaState.aiModel.updateMany.mockResolvedValue({ count: 2 });
  });

  it("403 当非管理员", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限"));
    const res = await modelsBatch.POST(postReq("/api/v1/admin/models/batch", {
      ids: ["m1", "m2"], action: "activate",
    }));
    expect(res.status).toBe(403);
    expect(prismaState.aiModel.updateMany).not.toHaveBeenCalled();
  });

  it("200 + 批量激活", async () => {
    const res = await modelsBatch.POST(postReq("/api/v1/admin/models/batch", {
      ids: ["m1", "m2"], action: "activate",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.affected).toBe(2);
    expect(prismaState.aiModel.updateMany).toHaveBeenCalled();
  });

  it("400 当缺少必填字段", async () => {
    const res = await modelsBatch.POST(postReq("/api/v1/admin/models/batch", {
      ids: ["m1"],
    }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/admin/users/batch 守卫矩阵", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStub.requireAdminApi.mockResolvedValue({ userId: "admin-1", role: "ADMIN" });
    prismaState.user.updateMany.mockResolvedValue({ count: 3 });
  });

  it("403 当非管理员", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限"));
    const res = await usersBatch.POST(postReq("/api/v1/admin/users/batch", {
      ids: ["u1", "u2"], action: "suspend",
    }));
    expect(res.status).toBe(403);
    expect(prismaState.user.updateMany).not.toHaveBeenCalled();
  });

  it("200 + 批量状态更新", async () => {
    const res = await usersBatch.POST(postReq("/api/v1/admin/users/batch", {
      ids: ["u1", "u2", "u3"], action: "suspend",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.affected).toBe(3);
  });
});

describe("POST /api/v1/admin/news/batch 守卫矩阵", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStub.requireAdminApi.mockResolvedValue({ userId: "admin-1", role: "ADMIN" });
    prismaState.newsItem.updateMany.mockResolvedValue({ count: 1 });
  });

  it("403 当非管理员", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限"));
    const res = await newsBatch.POST(postReq("/api/v1/admin/news/batch", {
      ids: ["n1"], action: "publish",
    }));
    expect(res.status).toBe(403);
    expect(prismaState.newsItem.updateMany).not.toHaveBeenCalled();
  });

  it("200 + 批量发布", async () => {
    const res = await newsBatch.POST(postReq("/api/v1/admin/news/batch", {
      ids: ["n1"], action: "publish",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.affected).toBe(1);
  });
});

describe("POST /api/v1/admin/news/batch pin/unpin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStub.requireAdminApi.mockResolvedValue({ userId: "admin-1", role: "ADMIN" });
    prismaState.newsItem.updateMany.mockResolvedValue({ count: 2 });
  });

  it("200 + 批量置顶", async () => {
    const res = await newsBatch.POST(postReq("/api/v1/admin/news/batch", {
      ids: ["n1", "n2"], action: "pin",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.affected).toBe(2);
    expect(prismaState.newsItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pinned: true }),
      })
    );
  });

  it("200 + 批量取消置顶", async () => {
    const res = await newsBatch.POST(postReq("/api/v1/admin/news/batch", {
      ids: ["n1", "n2"], action: "unpin",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.affected).toBe(2);
    expect(prismaState.newsItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pinned: false }),
      })
    );
  });
});
