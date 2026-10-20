/**
 * TASK-061 · persistCatalogChangeEvents 单测（Prisma mock；沿用 TASK-059 catalog-snapshot.spec 范式）
 *
 * 证明：① 逐条走 upsert（非 create），重放不撞唯一键；② monitoringSource 解析 sourceKey→sourceId；
 * ③ model_first_seen 必写 discovery 证据链；④ 归一合并（merged>1）另写 change 证据链并列全部 external id；
 * ⑤ 跨 snapshotId 混批 / 源缺失即抛。
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const prismaState = {
  $transaction: vi.fn(),
  monitoringSource: { findFirst: vi.fn() },
  catalogChangeEvent: { upsert: vi.fn() },
  evidenceChain: { create: vi.fn() },
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

describe("persistCatalogChangeEvents（TASK-061）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaState.$transaction.mockImplementation(async (cb: (tx: typeof prismaState) => Promise<unknown>) => cb(prismaState));
    prismaState.catalogChangeEvent.upsert.mockResolvedValue({});
    prismaState.evidenceChain.create.mockResolvedValue({});
    prismaState.monitoringSource.findFirst.mockResolvedValue({ id: "src-1" });
  });

  it("空批 → 不查源、不开事务，返回全零", async () => {
    const res = await persistCatalogChangeEvents([]);
    expect(res).toEqual({ snapshotId: "", events: 0, upserted: 0, evidenceChains: 0 });
    expect(prismaState.monitoringSource.findFirst).not.toHaveBeenCalled();
    expect(prismaState.$transaction).not.toHaveBeenCalled();
  });

  it("解析 sourceId + 逐条 upsert（非 create）；仅 model_first_seen 写 discovery 证据链", async () => {
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
    // upsert 键 = DB 唯一 (snapshotId, normalizedModelId, kind)
    expect(prismaState.catalogChangeEvent.upsert).toHaveBeenCalledTimes(3);
    const firstUpsert = prismaState.catalogChangeEvent.upsert.mock.calls[0][0] as { where: unknown };
    expect(firstUpsert.where).toEqual({ snapshotId_normalizedModelId_kind: { snapshotId: SN, normalizedModelId: "gpt-4o", kind: "listed" } });
    // 源解析 + create 带 sourceId
    expect(prismaState.monitoringSource.findFirst).toHaveBeenCalledWith({ where: { key: "openrouter", deletedAt: null }, select: { id: true } });
    const priceCreate = (prismaState.catalogChangeEvent.upsert.mock.calls[2][0] as { create: Record<string, unknown> }).create;
    expect(priceCreate).toMatchObject({ sourceId: "src-1", priceUnit: "usd_per_1m_tokens", beforeInput: "100", afterInput: "101", deltaPct: 1 });
    const listedCreate = (prismaState.catalogChangeEvent.upsert.mock.calls[0][0] as { create: Record<string, unknown> }).create;
    expect(listedCreate).toMatchObject({ sourceId: "src-1", priceUnit: null, beforeInput: null });
    // 仅首见写证据链：discovery + aggregator + 全部 external id
    expect(prismaState.evidenceChain.create).toHaveBeenCalledTimes(1);
    const chainData = (prismaState.evidenceChain.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(chainData).toMatchObject({ evidenceType: "discovery", source: "aggregator", sourceUrl: SRC_URL });
    expect(chainData.evidenceData).toMatchObject({ kind: "model_first_seen", externalModelIds: ["x", "y"] });
  });

  it("归一合并（merged>1）的非首见事件另写 change 证据链，列全部 external id", async () => {
    const changes: DetectedChange[] = [
      ev({ kind: "listed", id: "00000000-0000-4000-8000-0000000000aa", externalModelId: "openai/gpt-4o", normalizedModelId: "gpt-4o" }, ["openai/gpt-4o", "openai/gpt-4o:free"]),
    ];
    const res = await persistCatalogChangeEvents(changes);
    expect(res).toEqual({ snapshotId: SN, events: 1, upserted: 1, evidenceChains: 1 });
    const chainData = (prismaState.evidenceChain.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(chainData).toMatchObject({ evidenceType: "change", source: "aggregator" });
    expect(chainData.evidenceData).toMatchObject({ normalizedModelId: "gpt-4o", externalModelIds: ["openai/gpt-4o", "openai/gpt-4o:free"] });
  });

  it("重放同批：二次调用仍走 upsert，不新建、不抛（无 create 用法）", async () => {
    const changes: DetectedChange[] = [ev({ kind: "delisted", id: "00000000-0000-4000-8000-0000000000b1" })];
    await persistCatalogChangeEvents(changes);
    await persistCatalogChangeEvents(changes);
    expect(prismaState.catalogChangeEvent.upsert).toHaveBeenCalledTimes(2);
    expect((prismaState.catalogChangeEvent as unknown as { create?: unknown }).create).toBeUndefined();
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
