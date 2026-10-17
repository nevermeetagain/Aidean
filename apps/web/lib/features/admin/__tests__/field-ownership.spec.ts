/**
 * TASK-076 · 后端红线核验①：字段所有权（D-2=C，REQ-F-054）
 *
 * 断言 sync 写入器在 UPDATE 分支「只 SET sync 拥有字段」，人工/受控字段
 * （nameDisplay/slug/vendorId/modelType/protocol/isActive/visibility/isFeatured/
 *  featuredWeight/sortOrder/tags/nameCn/nameEn/categoryId 等）绝不被 sync 覆盖。
 *
 * 只读核验：仅 mock prisma，不改业务代码。发现越权写入 → 用例失败即登记缺陷。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SYNC_OWNED_MODEL_FIELDS } from "../../../sync/types/sync";

const prismaState = vi.hoisted(() => ({
  aiModel: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  vendor: { findFirst: vi.fn(), create: vi.fn() },
  modelChangeLog: { findFirst: vi.fn(), create: vi.fn() },
  modelPrice: { updateMany: vi.fn(), create: vi.fn() },
  benchmark: { findFirst: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../../../sync/writers/dedup", () => ({ shouldSkip: vi.fn(async () => false) }));
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));

const { upsertModel } = await import("../../../sync/writers/index");
import type { NormalizedModelData } from "../../../sync/types/sync";

// 明确禁止 sync 写入的人工/受控字段（功能设计文档 §五 字段所有权矩阵）
const HUMAN_OWNED_FIELDS = [
  "nameDisplay", "nameCn", "nameEn", "slug", "vendorId", "modelType",
  "categoryId", "protocol", "isActive", "isFeatured", "featuredWeight",
  "sortOrder", "tags", "visibility",
];

describe("sync 字段所有权红线（D-2=C / REQ-F-054）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaState.$transaction.mockImplementation(async (cb: (tx: typeof prismaState) => Promise<unknown>) => cb(prismaState));
    prismaState.modelChangeLog.findFirst.mockResolvedValue(null);
    prismaState.modelChangeLog.create.mockResolvedValue({});
    prismaState.aiModel.update.mockResolvedValue({ id: "m1" });
    // UPDATE 分支：命中已存在模型
    prismaState.aiModel.findFirst.mockResolvedValue({ id: "m1", contextLength: 64000, parameterCount: "7B" });
  });

  it("UPDATE 分支 aiModel.update 的 data 键 ⊆ SYNC_OWNED_MODEL_FIELDS", async () => {
    const data: NormalizedModelData = {
      modelCode: "gpt-x",
      contextLength: 128000,
      parameterCount: "8B",
      officialUrl: "https://x",
      benchmarkScore: 90,
      popularityScore: 5,
      status: "ACTIVE",
      checksum: "cs-1",
    };

    await upsertModel(data, "batch-abc-0001");

    expect(prismaState.aiModel.update).toHaveBeenCalledTimes(1);
    const updatedKeys = Object.keys(prismaState.aiModel.update.mock.calls[0][0].data);
    const syncSet = new Set<string>(SYNC_OWNED_MODEL_FIELDS as readonly string[]);
    for (const k of updatedKeys) {
      expect(syncSet.has(k), `sync 越权写入非归属字段: ${k}`).toBe(true);
    }
  });

  it("UPDATE 分支从不 SET 人工/受控字段", async () => {
    const data: NormalizedModelData = { modelCode: "gpt-x", contextLength: 128000, checksum: "cs-2" };
    await upsertModel(data, "batch-abc-0002");
    expect(prismaState.aiModel.update).toHaveBeenCalledTimes(1);
    const updatedKeys = Object.keys(prismaState.aiModel.update.mock.calls[0][0].data);
    for (const human of HUMAN_OWNED_FIELDS) {
      expect(updatedKeys, `人工字段被 sync 覆盖: ${human}`).not.toContain(human);
    }
  });

  it("SYNC_OWNED_MODEL_FIELDS 与人工字段集合互斥（所有权矩阵不自相矛盾）", () => {
    const syncSet = new Set<string>(SYNC_OWNED_MODEL_FIELDS as readonly string[]);
    for (const human of HUMAN_OWNED_FIELDS) {
      expect(syncSet.has(human), `字段 ${human} 同时被列为 sync 拥有与人工拥有`).toBe(false);
    }
  });
});
