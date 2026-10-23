/**
 * T120-12 · monitor_run_requests 真库集成测（PG16；门控 RUN_DB_TESTS=1 ∧ DATABASE_URL，同 persist-prices.int.spec）。
 * 验收：① 并发 10 次入队只产生 1 行 pending（部分唯一索引）；② 领取→回写 done 全链路，完成后可再次入队；
 *       ③ 失败回写 error；④ 并发领取互不重复（逐行 CAS）。
 * 真库验证：RUN_DB_TESTS=1 DATABASE_URL=postgresql://... pnpm -C apps/web exec vitest run lib/monitoring/__tests__/run-requests.int.spec.ts
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DB_ENABLED = process.env.RUN_DB_TESTS === "1" && !!process.env.DATABASE_URL;
const suite = DB_ENABLED ? describe : describe.skip;

suite("monitor_run_requests（T120-12 · 真库）", () => {
  let prisma: any;
  let rr: typeof import("../run-requests");
  const key = `it-t12012-${Date.now()}`;
  const admin = "0192f000-0000-7000-8000-000000000001";

  beforeAll(async () => {
    prisma = (await import("../../db/prisma")).prisma;
    rr = await import("../run-requests");
    await prisma.monitoringSource.create({
      data: { key, label: "IT T120-12", tier: "C", kind: "community", endpoint: "https://example.invalid/", authRequired: false },
    });
  });

  afterAll(async () => {
    await prisma.monitoringSource.deleteMany({ where: { key } }); // CASCADE 清理 run requests
    await prisma.$disconnect();
  });

  it("① 并发 10 次入队 → 恰 1 行 pending，其余 9 个返回 null（P2002）", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => rr.createRunRequest(prisma, { sourceKey: key, requestedBy: admin })),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await prisma.monitorRunRequest.count({ where: { sourceKey: key, status: "pending" } })).toBe(1);
  });

  it("②④ 并发领取只领到一次 → done 回写；完成后可再次入队", async () => {
    const [a, b] = await Promise.all([
      rr.claimPendingRunRequests(prisma, { sourceKey: key }),
      rr.claimPendingRunRequests(prisma, { sourceKey: key }),
    ]);
    const claimed = [...a, ...b];
    expect(claimed).toHaveLength(1);
    expect(claimed[0].status).toBe("running");
    // running 期间仍占幂等键
    expect(await rr.createRunRequest(prisma, { sourceKey: key, requestedBy: admin })).toBeNull();
    await rr.completeRunRequest(prisma, claimed[0].id, { status: "done", resultCount: 5 });
    const row = await prisma.monitorRunRequest.findUnique({ where: { id: claimed[0].id } });
    expect(row).toMatchObject({ status: "done", resultCount: 5, error: null });
    expect(row.finishedAt).toBeInstanceOf(Date);
    expect(await rr.createRunRequest(prisma, { sourceKey: key, requestedBy: admin })).not.toBeNull();
  });

  it("③ 失败回写 error；历史分页倒序", async () => {
    const [claimed] = await rr.claimPendingRunRequests(prisma, { sourceKey: key });
    await rr.completeRunRequest(prisma, claimed.id, { status: "failed", error: "parse_failed" });
    const page = await rr.listRunRequests(prisma, key, 1, 10);
    expect(page.total).toBe(2);
    expect(page.items[0]).toMatchObject({ status: "failed", error: "parse_failed" });
    expect(page.items[1].status).toBe("done");
  });
});
