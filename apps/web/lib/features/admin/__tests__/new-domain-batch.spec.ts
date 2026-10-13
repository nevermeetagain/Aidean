/**
 * 新域 batch 路由单测（R-64 补齐）：announcements / api-stations / evaluations batch。
 * 覆盖守卫矩阵 + 正常操作 + 参数校验。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const auditStub = vi.hoisted(() => ({ writeAudit: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  announcement: { updateMany: vi.fn() },
  aPIStation: { updateMany: vi.fn() },
  evaluation: { updateMany: vi.fn() },
  auditLog: { create: vi.fn().mockResolvedValue({ id: "log-1" }) },
}));

vi.mock("../../../features/auth/session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));

vi.mock("../../../../app/api/v1/_lib/audit", () => auditStub);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const announcementsBatch = await import("../../../../app/api/v1/admin/announcements/batch/route");
const apiStationsBatch = await import("../../../../app/api/v1/admin/api-stations/batch/route");
const evaluationsBatch = await import("../../../../app/api/v1/admin/evaluations/batch/route");

function postReq(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }) as never;
}

const ADMIN_CTX = { userId: "admin-1", role: "ADMIN" };
const FORBID_ERR = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");

describe("POST /api/v1/admin/announcements/batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStub.requireAdminApi.mockResolvedValue(ADMIN_CTX);
    prismaState.announcement.updateMany.mockResolvedValue({ count: 2 });
  });

  it("403 当非管理员", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(FORBID_ERR());
    const res = await announcementsBatch.POST(postReq("/api/v1/admin/announcements/batch", {
      ids: ["a1"], action: "publish",
    }));
    expect(res.status).toBe(403);
    expect(prismaState.announcement.updateMany).not.toHaveBeenCalled();
  });

  it("200 + 批量发布", async () => {
    const res = await announcementsBatch.POST(postReq("/api/v1/admin/announcements/batch", {
      ids: ["a1", "a2"], action: "publish",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.affected).toBe(2);
  });

  it("200 + 批量删除", async () => {
    const res = await announcementsBatch.POST(postReq("/api/v1/admin/announcements/batch", {
      ids: ["a1"], action: "delete",
    }));
    expect(res.status).toBe(200);
    expect(prismaState.announcement.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it("400 当 action 非法", async () => {
    const res = await announcementsBatch.POST(postReq("/api/v1/admin/announcements/batch", {
      ids: ["a1"], action: "invalid",
    }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/admin/api-stations/batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStub.requireAdminApi.mockResolvedValue(ADMIN_CTX);
    prismaState.aPIStation.updateMany.mockResolvedValue({ count: 1 });
  });

  it("403 当非管理员", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(FORBID_ERR());
    const res = await apiStationsBatch.POST(postReq("/api/v1/admin/api-stations/batch", {
      ids: ["s1"], action: "activate",
    }));
    expect(res.status).toBe(403);
  });

  it("200 + 批量激活", async () => {
    const res = await apiStationsBatch.POST(postReq("/api/v1/admin/api-stations/batch", {
      ids: ["s1"], action: "activate",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.affected).toBe(1);
    expect(prismaState.aPIStation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isVerified: true }),
      })
    );
  });

  it("200 + 批量停用", async () => {
    const res = await apiStationsBatch.POST(postReq("/api/v1/admin/api-stations/batch", {
      ids: ["s1"], action: "deactivate",
    }));
    expect(res.status).toBe(200);
    expect(prismaState.aPIStation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isVerified: false }),
      })
    );
  });

  it("400 当 ids 为空", async () => {
    const res = await apiStationsBatch.POST(postReq("/api/v1/admin/api-stations/batch", {
      ids: [], action: "activate",
    }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/admin/evaluations/batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStub.requireAdminApi.mockResolvedValue(ADMIN_CTX);
    prismaState.evaluation.updateMany.mockResolvedValue({ count: 3 });
  });

  it("403 当非管理员", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(FORBID_ERR());
    const res = await evaluationsBatch.POST(postReq("/api/v1/admin/evaluations/batch", {
      ids: ["e1"], action: "archive",
    }));
    expect(res.status).toBe(403);
  });

  it("200 + 批量归档", async () => {
    const res = await evaluationsBatch.POST(postReq("/api/v1/admin/evaluations/batch", {
      ids: ["e1", "e2", "e3"], action: "archive",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.affected).toBe(3);
    expect(prismaState.evaluation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it("200 + 批量删除", async () => {
    const res = await evaluationsBatch.POST(postReq("/api/v1/admin/evaluations/batch", {
      ids: ["e1"], action: "delete",
    }));
    expect(res.status).toBe(200);
  });

  it("400 当 action 非法", async () => {
    const res = await evaluationsBatch.POST(postReq("/api/v1/admin/evaluations/batch", {
      ids: ["e1"], action: "invalid",
    }));
    expect(res.status).toBe(400);
  });
});
