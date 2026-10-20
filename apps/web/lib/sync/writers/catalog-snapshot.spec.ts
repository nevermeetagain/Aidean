/**
 * TASK-059 · persistCatalogSnapshot 单测（Prisma mock，REQ-M-003/004）
 *
 * 覆盖卡面 4 场景 + 幂等合计 + 源缺失：
 * ① 首采：新建快照 + 每条观测 upsert(create) + 整体走 $transaction；
 * ② 重复：同 (sourceKey, rawSha256) → 直接返回既有，create 快照/upsert/updateMany 均不发生；
 *    ②b 首采后再同哈希调用：snapshot.create 合计仅 1 次（卡面验收）；
 * ③ 下架：本轮未出现的 isListed=true 观测 → updateMany 置 false + delistedAt=fetchedAt；
 * ④ 重新上架：命中既有观测走 update 分支，isListed=true、清 delistedAt、保 firstSeenAt 不变；
 * ⑤ 源不存在：抛错且不开事务。
 * TASK-098 加固：⑥ 空目录不写快照不下架；⑦ 观测按 200 分批 + 事务 timeout；
 * ⑧ 同哈希并发撞 P2002 → 事务外回读既有快照 idempotent=true；⑨ 同源行锁先于读写；⑩ 非 P2002 错误原样抛出。
 *
 * prisma 以 mock 注入，$transaction 回传同一 mock，使断言直接命中 prismaState.*。
 * 位置遵卡面允许路径：与 catalog-snapshot.ts 同目录（writers/，非 __tests__/）。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaState = vi.hoisted(() => ({
  monitoringSource: { findFirst: vi.fn(), update: vi.fn() },
  catalogSnapshot: { findUnique: vi.fn(), create: vi.fn() },
  providerModelObservation: { upsert: vi.fn(), updateMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../../db/prisma", () => ({ prisma: prismaState }));

const { Prisma } = await import("@prisma/client");

const { persistCatalogSnapshot } = await import("./catalog-snapshot");
import type { CatalogSnapshotItem } from "./catalog-snapshot";

const SRC = { id: "src-1", endpoint: "https://s.example/catalog" };
const FA = new Date("2026-10-19T00:00:00Z");
const META = { rawBytes: 2048, rawSample: "{\"data\":[", sourceUrl: "https://s.example/catalog" };

function items(ids: string[]): CatalogSnapshotItem[] {
  return ids.map((id) => ({
    externalModelId: id,
    normalizedModelId: id.toLowerCase(),
    displayName: id,
    vendorHint: null,
    priceUnit: "usd_per_1m_tokens",
    priceInput: "1.0",
    priceOutput: "2.0",
    priceCacheRead: null,
    contextLength: 8000,
  }));
}

describe("persistCatalogSnapshot（TASK-059 / TASK-098）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaState.$transaction.mockImplementation(async (cb: (tx: typeof prismaState) => Promise<unknown>) =>
      cb(prismaState),
    );
    prismaState.monitoringSource.findFirst.mockResolvedValue(SRC);
    prismaState.monitoringSource.update.mockResolvedValue({ id: SRC.id });
    prismaState.providerModelObservation.upsert.mockResolvedValue({ id: "obs-1" });
    prismaState.providerModelObservation.updateMany.mockResolvedValue({ count: 0 });
  });

  it("① 首采：新建快照 + 每条观测 upsert + 事务一次", async () => {
    prismaState.catalogSnapshot.findUnique.mockResolvedValue(null);
    prismaState.catalogSnapshot.create.mockResolvedValue({ id: "snap-1" });

    const res = await persistCatalogSnapshot("k", FA, items(["A", "B"]), "abc", META);

    expect(prismaState.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaState.catalogSnapshot.create).toHaveBeenCalledTimes(1);
    const createdData = prismaState.catalogSnapshot.create.mock.calls[0][0].data;
    expect(createdData).toMatchObject({ sourceId: "src-1", rawSha256: "abc", itemCount: 2, rawBytes: 2048 });
    expect(prismaState.providerModelObservation.upsert).toHaveBeenCalledTimes(2);
    const firstUpsert = prismaState.providerModelObservation.upsert.mock.calls[0][0];
    expect(firstUpsert.create.firstSeenAt).toEqual(FA);
    expect(firstUpsert.create.lastSeenAt).toEqual(FA);
    expect(firstUpsert.create.isListed).toBe(true);
    expect(firstUpsert.create.delistedAt).toBeNull();
    expect(res).toMatchObject({ created: true, snapshotId: "snap-1", itemCount: 2, upserted: 2, delisted: 0 });
  });

  it("② 重复：同哈希 → 直接返回既有，不动观测/不新建", async () => {
    prismaState.catalogSnapshot.findUnique.mockResolvedValue({ id: "snap-old" });

    const res = await persistCatalogSnapshot("k", FA, items(["A"]), "abc", META);

    expect(prismaState.catalogSnapshot.create).not.toHaveBeenCalled();
    expect(prismaState.providerModelObservation.upsert).not.toHaveBeenCalled();
    expect(prismaState.providerModelObservation.updateMany).not.toHaveBeenCalled();
    expect(res.created).toBe(false);
    expect(res.snapshotId).toBe("snap-old");
  });

  it("②b 首采后同哈希再来：snapshot.create 合计仅 1 次（卡面验收）", async () => {
    prismaState.catalogSnapshot.findUnique.mockResolvedValueOnce(null);
    prismaState.catalogSnapshot.create.mockResolvedValue({ id: "snap-1" });
    await persistCatalogSnapshot("k", FA, items(["A"]), "abc", META);

    prismaState.catalogSnapshot.findUnique.mockResolvedValueOnce({ id: "snap-1" });
    const second = await persistCatalogSnapshot("k", FA, items(["A"]), "abc", META);

    expect(prismaState.catalogSnapshot.create).toHaveBeenCalledTimes(1);
    expect(second.created).toBe(false);
  });

  it("③ 下架：本轮未出现的在架观测被置 false + delistedAt", async () => {
    prismaState.catalogSnapshot.findUnique.mockResolvedValue(null);
    prismaState.catalogSnapshot.create.mockResolvedValue({ id: "snap-2" });
    prismaState.providerModelObservation.updateMany.mockResolvedValue({ count: 1 });

    const res = await persistCatalogSnapshot("k", FA, items(["A"]), "def", META);

    expect(prismaState.providerModelObservation.updateMany).toHaveBeenCalledWith({
      where: { sourceId: "src-1", isListed: true, externalModelId: { notIn: ["A"] } },
      data: { isListed: false, delistedAt: FA },
    });
    expect(res.delisted).toBe(1);
  });

  it("④ 重新上架：命中既有观测走 update 分支，isListed=true、清 delistedAt、保 firstSeenAt", async () => {
    prismaState.catalogSnapshot.findUnique.mockResolvedValue(null);
    prismaState.catalogSnapshot.create.mockResolvedValue({ id: "snap-3" });

    await persistCatalogSnapshot("k", FA, items(["A"]), "ghi", META);

    const up = prismaState.providerModelObservation.upsert.mock.calls[0][0];
    expect(up.where).toEqual({ sourceId_externalModelId: { sourceId: "src-1", externalModelId: "A" } });
    expect(up.update.isListed).toBe(true);
    expect(up.update.delistedAt).toBeNull();
    expect(up.update.firstSeenAt).toBeUndefined(); // 保留原 firstSeenAt（不在 update 中）
    expect(up.update.lastSeenAt).toEqual(FA);
    expect(up.create.firstSeenAt).toEqual(FA);
  });

  it("⑤ 源不存在：抛错且不开事务", async () => {
    prismaState.monitoringSource.findFirst.mockResolvedValue(null);

    await expect(persistCatalogSnapshot("missing", FA, items(["A"]), "x", META)).rejects.toThrow(/not found/);
    expect(prismaState.$transaction).not.toHaveBeenCalled();
  });

  it("⑥ 空目录：不查源、不开事务、不写快照、不下架，返回 skipped（TASK-098）", async () => {
    const res = await persistCatalogSnapshot("k", FA, [], "empty", META);
    expect(res).toMatchObject({ skipped: true, reason: "empty", delisted: 0, created: false, upserted: 0 });
    expect(prismaState.monitoringSource.findFirst).not.toHaveBeenCalled();
    expect(prismaState.$transaction).not.toHaveBeenCalled();
    expect(prismaState.catalogSnapshot.create).not.toHaveBeenCalled();
    expect(prismaState.providerModelObservation.updateMany).not.toHaveBeenCalled();
  });

  it("⑦ 观测按 200 分批写；事务显式 timeout=60000 / maxWait=10000（TASK-098）", async () => {
    prismaState.catalogSnapshot.findUnique.mockResolvedValue(null);
    prismaState.catalogSnapshot.create.mockResolvedValue({ id: "snap-b" });
    let inFlight = 0;
    let peak = 0;
    prismaState.providerModelObservation.upsert.mockImplementation(async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await Promise.resolve();
      inFlight--;
      return { id: "o" };
    });
    const ids = Array.from({ length: 450 }, (_, i) => `M${i}`);
    const res = await persistCatalogSnapshot("k", FA, items(ids), "big", META);
    expect(prismaState.providerModelObservation.upsert).toHaveBeenCalledTimes(450);
    expect(peak).toBeLessThanOrEqual(200);
    expect(res).toMatchObject({ created: true, upserted: 450, idempotent: false });
    expect(prismaState.$transaction.mock.calls[0][1]).toEqual({ timeout: 60_000, maxWait: 10_000 });
  });

  it("⑧ 同哈希并发：事务内 create 撞 P2002 → 事务外回读既有快照，idempotent=true 不抛（TASK-098）", async () => {
    prismaState.catalogSnapshot.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "snap-winner" });
    prismaState.catalogSnapshot.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "6" }),
    );
    const res = await persistCatalogSnapshot("k", FA, items(["A"]), "dup", META);
    expect(res).toMatchObject({ snapshotId: "snap-winner", created: false, idempotent: true, upserted: 0, delisted: 0 });
    expect(prismaState.providerModelObservation.updateMany).not.toHaveBeenCalled();
  });

  it("⑨ 同源行锁：monitoringSource.update(lastCount += 0) 先于快照读写（TASK-098）", async () => {
    prismaState.catalogSnapshot.findUnique.mockResolvedValue(null);
    prismaState.catalogSnapshot.create.mockResolvedValue({ id: "snap-l" });
    await persistCatalogSnapshot("k", FA, items(["A"]), "lock", META);
    expect(prismaState.monitoringSource.update).toHaveBeenCalledWith({ where: { id: "src-1" }, data: { lastCount: { increment: 0 } }, select: { id: true } });
    expect(prismaState.monitoringSource.update.mock.invocationCallOrder[0]).toBeLessThan(prismaState.catalogSnapshot.findUnique.mock.invocationCallOrder[0]);
  });

  it("⑩ 非唯一键错误原样抛出，不吞错", async () => {
    prismaState.catalogSnapshot.findUnique.mockResolvedValue(null);
    prismaState.catalogSnapshot.create.mockRejectedValue(new Error("boom"));
    await expect(persistCatalogSnapshot("k", FA, items(["A"]), "err", META)).rejects.toThrow("boom");
  });
});
