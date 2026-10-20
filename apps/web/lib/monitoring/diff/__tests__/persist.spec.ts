/**
 * TASK-061 · persistCatalogChangeEvents 单测（Prisma mock；沿用 TASK-059 catalog-snapshot.spec 范式）
 *
 * 证明：① 新键 createMany、已存在键只 update，重放不撞唯一键；② monitoringSource 解析 sourceKey→sourceId；
 * ③ model_first_seen 必写 discovery 证据链；④ 归一合并（merged>1）另写 change 证据链并列全部 external id；
 * ⑤ 跨 snapshotId 混批 / 源缺失即抛；⑥ 重放不重复写证据链（review-061 M1）；
 * ⑦ 快照行锁 + 显式事务超时、>500 条分批（review-061 M2）。
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const prismaState = {
  $transaction: vi.fn(),
  monitoringSource: { findFirst: vi.fn() },
  catalogSnapshot: { update: vi.fn() },
  catalogChangeEvent: { findMany: vi.fn(), createMany: vi.fn(), update: vi.fn() },
  evidenceChain: { createMany: vi.fn() },
};

vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));

const { persistCatalogChangeEvents } = await import("../persist");
import type { DetectedChange } from "../detect";

const SN = "11111111-1111-4111-8111-111111111111";
const SRC_URL = "https://openrouter.ai/api/v1/models";
const DETECTED_AT = "2026-10-20T00:00:00Z";

const ev = (over: Partial<DetectedChange["event"]> & Pick<DetectedChange["event"], "kind" | "id">, merged?: string[]): DetectedChange => ({
  event: {
    sourceKey: "openrouter",
    snapshotId: SN,
    externalModelId: "openai/gpt-4o",
    normalizedModelId: "gpt-4o",
    detectedAt: DETECTED_AT,
    sourceUrl: SRC_URL,
    ...over,
  } as DetectedChange["event"],
  mergedExternalModelIds: merged ?? [String(over.externalModelId ?? "openai/gpt-4o")],
});

describe("persistCatalogChangeEvents（TASK-061 / review-061）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaState.$transaction.mockImplementation(async (cb: (tx: typeof prismaState) => Promise<unknown>) => cb(prismaState));
    prismaState.catalogSnapshot.update.mockResolvedValue({ id: SN });
    prismaState.catalogChangeEvent.findMany.mockResolvedValue([]);
    prismaState.catalogChangeEvent.createMany.mockResolvedValue({ count: 0 });
    prismaState.catalogChangeEvent.update.mockResolvedValue({});
    prismaState.evidenceChain.createMany.mockResolvedValue({ count: 0 });
    prismaState.monitoringSource.findFirst.mockResolvedValue({ id: "src-1" });
  });

  const createdRows = () =>
    prismaState.catalogChangeEvent.createMany.mock.calls.flatMap((c) => (c[0] as { data: Record<string, unknown>[] }).data);
  const chainRows = () =>
    prismaState.evidenceChain.createMany.mock.calls.flatMap((c) => (c[0] as { data: Record<string, unknown>[] }).data);

  it("空批 → 不查源、不开事务，返回全零", async () => {
    const res = await persistCatalogChangeEvents([]);
    expect(res).toEqual({ snapshotId: "", events: 0, upserted: 0, evidenceChains: 0 });
    expect(prismaState.monitoringSource.findFirst).not.toHaveBeenCalled();
    expect(prismaState.$transaction).not.toHaveBeenCalled();
  });

  it("解析 sourceId + 新键 createMany（skipDuplicates）；仅 model_first_seen 写 discovery 证据链", async () => {
    const changes: DetectedChange[] = [
      ev({ kind: "listed", id: "00000000-0000-4000-8000-000000000001" }),
      ev({ kind: "model_first_seen", id: "00000000-0000-4000-8000-000000000002" }, ["x", "y"]),
      ev(
        {
          kind: "price_changed",
          id: "00000000-0000-4000-8000-000000000003",
          priceUnit: "usd_per_1m_tokens",
          before: { input: "100", output: "300" },
          after: { input: "101", output: "300" },
          deltaPct: 1,
        },
        ["openai/gpt-4o"],
      ),
    ];
    const res = await persistCatalogChangeEvents(changes);

    expect(res).toEqual({ snapshotId: SN, events: 3, upserted: 3, evidenceChains: 1 });
    expect(prismaState.monitoringSource.findFirst).toHaveBeenCalledWith({ where: { key: "openrouter", deletedAt: null }, select: { id: true } });
    expect(prismaState.catalogChangeEvent.findMany).toHaveBeenCalledWith({ where: { snapshotId: SN }, select: { normalizedModelId: true, kind: true } });
    expect((prismaState.catalogChangeEvent.createMany.mock.calls[0][0] as { skipDuplicates: boolean }).skipDuplicates).toBe(true);
    const rows = createdRows();
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ id: "00000000-0000-4000-8000-000000000001", sourceId: "src-1", kind: "listed", priceUnit: null, beforeInput: null });
    expect(rows[2]).toMatchObject({ sourceId: "src-1", priceUnit: "usd_per_1m_tokens", beforeInput: "100", afterInput: "101", deltaPct: 1 });
    expect(prismaState.catalogChangeEvent.update).not.toHaveBeenCalled();
    const chains = chainRows();
    expect(chains).toHaveLength(1);
    expect(chains[0]).toMatchObject({ evidenceType: "discovery", source: "aggregator", sourceUrl: SRC_URL });
    expect(chains[0].evidenceData).toMatchObject({ kind: "model_first_seen", externalModelIds: ["x", "y"] });
  });

  it("归一合并（merged>1）的非首见事件另写 change 证据链，列全部 external id", async () => {
    const changes: DetectedChange[] = [
      ev({ kind: "listed", id: "00000000-0000-4000-8000-0000000000aa", externalModelId: "openai/gpt-4o", normalizedModelId: "gpt-4o" }, ["openai/gpt-4o", "openai/gpt-4o:free"]),
    ];
    const res = await persistCatalogChangeEvents(changes);
    expect(res).toEqual({ snapshotId: SN, events: 1, upserted: 1, evidenceChains: 1 });
    const chains = chainRows();
    expect(chains[0]).toMatchObject({ evidenceType: "change", source: "aggregator" });
    expect(chains[0].evidenceData).toMatchObject({ normalizedModelId: "gpt-4o", externalModelIds: ["openai/gpt-4o", "openai/gpt-4o:free"] });
  });

  it("重放同批：已存在键只 update，不新建事件、不重复写证据链（review-061 M1）", async () => {
    const changes: DetectedChange[] = [ev({ kind: "model_first_seen", id: "00000000-0000-4000-8000-0000000000b1" }, ["a", "b"])];
    prismaState.catalogChangeEvent.findMany.mockResolvedValue([{ normalizedModelId: "gpt-4o", kind: "model_first_seen" }]);
    const res = await persistCatalogChangeEvents(changes);
    expect(res).toEqual({ snapshotId: SN, events: 1, upserted: 1, evidenceChains: 0 });
    expect(prismaState.catalogChangeEvent.createMany).not.toHaveBeenCalled();
    expect(prismaState.evidenceChain.createMany).not.toHaveBeenCalled();
    expect(prismaState.catalogChangeEvent.update).toHaveBeenCalledTimes(1);
    expect((prismaState.catalogChangeEvent.update.mock.calls[0][0] as { where: unknown }).where).toEqual({
      snapshotId_normalizedModelId_kind: { snapshotId: SN, normalizedModelId: "gpt-4o", kind: "model_first_seen" },
    });
  });

  it("先对快照行 UPDATE 取行锁，再读已存在键；事务显式 timeout（review-061 M2）", async () => {
    await persistCatalogChangeEvents([ev({ kind: "listed", id: "00000000-0000-4000-8000-0000000000e1" })]);
    expect(prismaState.catalogSnapshot.update).toHaveBeenCalledWith({ where: { id: SN }, data: { itemCount: { increment: 0 } }, select: { id: true } });
    expect(prismaState.catalogSnapshot.update.mock.invocationCallOrder[0]).toBeLessThan(prismaState.catalogChangeEvent.findMany.mock.invocationCallOrder[0]);
    expect(prismaState.$transaction.mock.calls[0][1]).toMatchObject({ timeout: 60_000 });
  });

  it(">500 条按 500 分批 createMany", async () => {
    const changes: DetectedChange[] = Array.from({ length: 1201 }, (_, i) =>
      ev({ kind: "model_first_seen", id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, normalizedModelId: `m-${i}` }),
    );
    const res = await persistCatalogChangeEvents(changes);
    expect(prismaState.catalogChangeEvent.createMany).toHaveBeenCalledTimes(3);
    expect(prismaState.evidenceChain.createMany).toHaveBeenCalledTimes(3);
    expect(createdRows()).toHaveLength(1201);
    expect(res).toMatchObject({ events: 1201, upserted: 1201, evidenceChains: 1201 });
  });

  it("源缺失 → 抛错", async () => {
    prismaState.monitoringSource.findFirst.mockResolvedValue(null);
    await expect(persistCatalogChangeEvents([ev({ kind: "listed", id: "00000000-0000-4000-8000-0000000000c1" })])).rejects.toThrow(/not found/);
  });

  it("跨 snapshotId 混批 → 抛错，不开事务", async () => {
    const changes: DetectedChange[] = [
      ev({ kind: "listed", id: "00000000-0000-4000-8000-0000000000d1", snapshotId: SN }),
      ev({ kind: "listed", id: "00000000-0000-4000-8000-0000000000d2", snapshotId: "33333333-3333-4333-8333-333333333333" }),
    ];
    await expect(persistCatalogChangeEvents(changes)).rejects.toThrow(/同 sourceKey 与 snapshotId/);
    expect(prismaState.$transaction).not.toHaveBeenCalled();
  });
});
