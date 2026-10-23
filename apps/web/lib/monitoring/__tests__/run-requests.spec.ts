/**
 * T120-12 · run-requests 单测（prisma 桩）：入队冲突映射、原子领取 CAS、回写仅作用 running、清理保留期。
 * 真库并发与全链路见 run-requests.int.spec.ts（RUN_DB_TESTS=1）。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  claimPendingRunRequests,
  completeRunRequest,
  createRunRequest,
  purgeFinishedRunRequests,
  toRunRequestDto,
} from "../run-requests";

const db = {
  monitorRunRequest: { create: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn(), count: vi.fn() },
};
const asDb = db as never;

beforeEach(() => vi.resetAllMocks());

describe("run-requests", () => {
  it("createRunRequest：P2002 → null；其他错误原样抛出", async () => {
    db.monitorRunRequest.create.mockRejectedValueOnce(Object.assign(new Error("dup"), { code: "P2002" }));
    await expect(createRunRequest(asDb, { sourceKey: "s", requestedBy: "u" })).resolves.toBeNull();
    db.monitorRunRequest.create.mockRejectedValueOnce(new Error("boom"));
    await expect(createRunRequest(asDb, { sourceKey: "s", requestedBy: "u" })).rejects.toThrow("boom");
  });

  it("claimPendingRunRequests：按 createdAt 升序逐行 CAS，count≠1（被他人抢走）跳过", async () => {
    const t = new Date("2026-10-23T14:00:00Z");
    db.monitorRunRequest.findMany.mockResolvedValue([{ id: "r1" }, { id: "r2" }]);
    db.monitorRunRequest.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    db.monitorRunRequest.findUnique.mockResolvedValue({ id: "r2", status: "running", startedAt: t });
    const rows = await claimPendingRunRequests(asDb, { sourceKey: "s", now: t });
    expect(db.monitorRunRequest.findMany).toHaveBeenCalledWith({
      where: { status: "pending", sourceKey: "s" }, orderBy: { createdAt: "asc" }, select: { id: true },
    });
    expect(db.monitorRunRequest.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: "r1", status: "pending" }, data: { status: "running", startedAt: t },
    });
    expect(rows.map((r) => r.id)).toEqual(["r2"]);
  });

  it("completeRunRequest：仅 running 行；done 写 resultCount，failed 截断 error 至 2000", async () => {
    const now = new Date("2026-10-23T14:05:00Z");
    await completeRunRequest(asDb, "r1", { status: "done", resultCount: 7 }, now);
    expect(db.monitorRunRequest.updateMany).toHaveBeenLastCalledWith({
      where: { id: "r1", status: "running" },
      data: { status: "done", resultCount: 7, error: null, finishedAt: now },
    });
    await completeRunRequest(asDb, "r1", { status: "failed", error: "x".repeat(2500) }, now);
    const data = db.monitorRunRequest.updateMany.mock.calls[1][0].data;
    expect(data.status).toBe("failed");
    expect(data.error).toHaveLength(2000);
  });

  it("purgeFinishedRunRequests：只删 done/failed 且 finishedAt < now-90d", async () => {
    db.monitorRunRequest.deleteMany.mockResolvedValue({ count: 3 });
    const now = new Date("2026-10-23T00:00:00Z");
    await expect(purgeFinishedRunRequests(asDb, now)).resolves.toBe(3);
    expect(db.monitorRunRequest.deleteMany).toHaveBeenCalledWith({
      where: { status: { in: ["done", "failed"] }, finishedAt: { lt: new Date("2026-07-25T00:00:00Z") } },
    });
  });

  it("toRunRequestDto：日期 ISO 化，空值保留 null", () => {
    const d = new Date("2026-10-23T14:00:00Z");
    expect(toRunRequestDto({ id: "r", sourceKey: "s", status: "pending", requestedBy: "u", resultCount: null, error: null, createdAt: d, startedAt: null, finishedAt: null }))
      .toEqual({ id: "r", sourceKey: "s", status: "pending", requestedBy: "u", resultCount: null, error: null, createdAt: d.toISOString(), startedAt: null, finishedAt: null });
  });
});
