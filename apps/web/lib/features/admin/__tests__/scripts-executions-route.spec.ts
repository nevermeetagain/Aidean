/**
 * scripts/[id]/executions admin route 单测（DEF-011-12 回归锁）。
 *
 * 覆盖：
 * 1. scriptId 必须来自路由段 params（原实现用 pathname 下标切片，切出字面量 'scripts' → 历史恒空）；
 * 2. status 过滤：合法数值生效、非法串不得把 NaN 送进 Prisma；
 * 3. 分页 skip/take：正常值、越界钳制、非法串回退默认（M1 回归锁）；
 * 4. statusLabel 映射；
 * 5. 反向自检：params 与 pathname 不一致时以 params 为准（证明取值来源）。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../db/prisma", () => ({
  prisma: {
    scriptExecution: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

vi.mock("../../../features/auth/session", () => ({
  requireAdminApi: vi.fn().mockResolvedValue({ userId: "admin-1" }),
}));

import { prisma } from "../../../db/prisma";

/** 以真实 Next 语义调用：handler(req, ctx)，ctx.params 是 Promise */
const call = async (url: string, id: string) => {
  const { GET } = await import(
    "../../../../app/api/v1/admin/scripts/[id]/executions/route"
  );
  const req = new Request(url, { method: "GET" });
  const res = await GET(req as never, { params: Promise.resolve({ id }) } as never);
  return { res, json: await res.json() };
};

describe("GET /api/v1/admin/scripts/[id]/executions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.scriptExecution.findMany).mockResolvedValue([]);
    vi.mocked(prisma.scriptExecution.count).mockResolvedValue(0);
  });

  it("以路由段 id 作为 scriptId 过滤（DEF-011-12 主证）", async () => {
    const { res, json } = await call(
      "http://localhost/api/v1/admin/scripts/scr-9/executions",
      "scr-9",
    );

    expect(res.status).toBe(200);
    expect(prisma.scriptExecution.findMany).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(prisma.scriptExecution.findMany).mock.calls[0]![0] as {
      where: Record<string, unknown>;
    };
    // 旧实现此处为 "scripts"（pathname 下标偏移），断言为真实 id 即完成回归锁
    expect(arg.where.scriptId).toBe("scr-9");
    expect(json.code).toBe(0);
    expect(json.data.items).toEqual([]);
    expect(json.data.total).toBe(0);
  });

  it("反向自检：pathname 与 params 不一致时以 params 为准", async () => {
    await call(
      "http://localhost/api/v1/admin/scripts/OTHER/executions",
      "scr-9",
    );

    const arg = vi.mocked(prisma.scriptExecution.findMany).mock.calls[0]![0] as {
      where: Record<string, unknown>;
    };
    expect(arg.where.scriptId).toBe("scr-9");
  });

  it("status 合法数值进入过滤条件", async () => {
    await call(
      "http://localhost/api/v1/admin/scripts/scr-9/executions?status=1",
      "scr-9",
    );

    const arg = vi.mocked(prisma.scriptExecution.findMany).mock.calls[0]![0] as {
      where: Record<string, unknown>;
    };
    expect(arg.where.status).toBe(1);
  });

  it("status 非法串不得把 NaN 送进 Prisma（视为未过滤）", async () => {
    await call(
      "http://localhost/api/v1/admin/scripts/scr-9/executions?status=abc",
      "scr-9",
    );

    const arg = vi.mocked(prisma.scriptExecution.findMany).mock.calls[0]![0] as {
      where: Record<string, unknown>;
    };
    expect("status" in arg.where).toBe(false);
  });

  it("分页：page=2&pageSize=10 → skip=10 take=10", async () => {
    await call(
      "http://localhost/api/v1/admin/scripts/scr-9/executions?page=2&pageSize=10",
      "scr-9",
    );

    const arg = vi.mocked(prisma.scriptExecution.findMany).mock.calls[0]![0] as {
      skip: number;
      take: number;
    };
    expect(arg.skip).toBe(10);
    expect(arg.take).toBe(10);
  });

  it("分页越界钳制：pageSize=1000 → take=50；page=abc → 回退默认 1/20（不得送 NaN）", async () => {
    await call(
      "http://localhost/api/v1/admin/scripts/scr-9/executions?page=abc&pageSize=1000",
      "scr-9",
    );
    await call(
      "http://localhost/api/v1/admin/scripts/scr-9/executions?page=3&pageSize=xyz",
      "scr-9",
    );

    const calls = vi.mocked(prisma.scriptExecution.findMany).mock.calls;
    const clamp = calls[0]![0] as { skip: number; take: number };
    expect(clamp.skip).toBe(0); // page 非法 → 回退 1
    expect(clamp.take).toBe(50); // 上限钳制
    const fallback = calls[1]![0] as { skip: number; take: number };
    expect(fallback.skip).toBe(40); // (3-1) * 20，pageSize 非法 → 回退默认 20
    expect(fallback.take).toBe(20);
    // 任何一处都不允许出现 NaN（旧写法 parseInt('abc') 会直接送到 Prisma）
    for (const c of calls) {
      const a = c[0] as { skip: number; take: number };
      expect(Number.isFinite(a.skip)).toBe(true);
      expect(Number.isFinite(a.take)).toBe(true);
    }
  });

  it("statusLabel 映射 0/1/2 → 执行中/成功/失败，时间转 ISO", async () => {
    const started = new Date("2026-10-20T16:22:53.906Z");
    const finished = new Date("2026-10-20T16:22:55.640Z");
    vi.mocked(prisma.scriptExecution.findMany).mockResolvedValue([
      { id: "e1", status: 1, startedAt: started, finishedAt: finished, durationMs: 1734, output: "ok", errorMsg: null },
      { id: "e2", status: 0, startedAt: started, finishedAt: null, durationMs: null, output: null, errorMsg: null },
      { id: "e3", status: 2, startedAt: started, finishedAt: finished, durationMs: 5, output: "", errorMsg: "Exit code 1" },
    ] as never);
    vi.mocked(prisma.scriptExecution.count).mockResolvedValue(3);

    const { json } = await call(
      "http://localhost/api/v1/admin/scripts/scr-9/executions",
      "scr-9",
    );

    expect(json.data.total).toBe(3);
    expect(json.data.totalPages).toBe(1);
    expect(json.data.items.map((i: { statusLabel: string }) => i.statusLabel)).toEqual([
      "成功",
      "执行中",
      "失败",
    ]);
    expect(json.data.items[0].startedAt).toBe(started.toISOString());
    expect(json.data.items[1].finishedAt).toBeNull();
  });
});
