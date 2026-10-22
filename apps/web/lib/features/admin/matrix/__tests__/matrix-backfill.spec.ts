/**
 * B11-03a 数据写入路径：ai_models → 协议/能力矩阵回填派生与幂等落库。
 */
import { describe, expect, it, vi } from "vitest";
import { backfillMatrices, chunk, deriveCapabilityRows, deriveProtocolRows, type BackfillModel } from "../backfill";
import type { MatrixProtocol } from "../constants";

/** 按审计基线分布构造 1000 模型：OPENAI 971 / CUSTOM 15 / ANTHROPIC 6 / GOOGLE 6 / RESPONSES 2，分属 4 个厂商 */
function baselineModels(): BackfillModel[] {
  const dist: Array<[MatrixProtocol, number]> = [["OPENAI", 971], ["CUSTOM", 15], ["ANTHROPIC", 6], ["GOOGLE", 6], ["RESPONSES", 2]];
  const out: BackfillModel[] = [];
  let i = 0;
  for (const [protocol, n] of dist) {
    for (let k = 0; k < n; k++, i++) {
      out.push({
        id: `m-${String(i).padStart(4, "0")}`,
        vendorId: `v-${i % 4}`,
        protocol,
        modelType: i % 10 === 0 ? "REASONING" : "CHAT",
        isReasoning: false,
        isMultiModal: i % 7 === 0,
        contextLength: i % 3 === 0 ? null : i % 2 === 0 ? 200_000 : 32_000,
      });
    }
  }
  return out;
}

describe("deriveProtocolRows", () => {
  it("model 行分布与 ai_models.protocol 逐值一致（971/15/6/6/2）", () => {
    const rows = deriveProtocolRows(baselineModels()).filter((r) => r.entityType === "model");
    const dist: Record<string, number> = {};
    for (const r of rows) dist[r.protocol] = (dist[r.protocol] ?? 0) + 1;
    expect(dist).toEqual({ OPENAI: 971, CUSTOM: 15, ANTHROPIC: 6, GOOGLE: 6, RESPONSES: 2 });
    expect(rows.every((r) => r.supported && r.probeMethod === "backfill")).toBe(true);
  });

  it("vendor 聚合行 = 厂商×协议去重，且 modelCount 求和 = 模型总数", () => {
    const rows = deriveProtocolRows(baselineModels()).filter((r) => r.entityType === "vendor");
    const keys = new Set(rows.map((r) => `${r.entityId}:${r.protocol}`));
    expect(keys.size).toBe(rows.length);
    expect(rows.reduce((s, r) => s + (r.probeResult.modelCount ?? 0), 0)).toBe(1000);
  });

  it("空输入 → 空输出", () => {
    expect(deriveProtocolRows([])).toEqual([]);
  });
});

describe("deriveCapabilityRows", () => {
  const m = (over: Partial<BackfillModel>): BackfillModel => ({
    id: "m1", vendorId: "v1", protocol: "OPENAI", modelType: "CHAT", isReasoning: false, isMultiModal: false, contextLength: null, ...over,
  });
  it("只写有证据的行：无信号模型 0 行（不臆造 supported=false）", () => {
    expect(deriveCapabilityRows([m({})])).toEqual([]);
  });
  it("reasoning / vision / long_context 派生与阈值 128K", () => {
    const rows = deriveCapabilityRows([
      m({ id: "a", isReasoning: true }),
      m({ id: "b", modelType: "VISION" }),
      m({ id: "c", contextLength: 128_000 }),
      m({ id: "d", contextLength: 127_999 }),
    ]);
    expect(rows.map((r) => `${r.modelId}:${r.capability}:${r.supported}`)).toEqual([
      "a:reasoning:true", "b:vision:true", "c:long_context:true", "d:long_context:false",
    ]);
    expect(rows.find((r) => r.modelId === "d")!.maxContextLength).toBe(127_999);
    expect(rows.every((r) => r.source === "official")).toBe(true);
  });
});

describe("backfillMatrices", () => {
  const makeDb = (models: BackfillModel[]) => ({
    aiModel: { findMany: vi.fn().mockResolvedValue(models) },
    protocolCompatibility: { createMany: vi.fn(async ({ data }: { data: unknown[]; skipDuplicates?: boolean }) => ({ count: data.length })) },
    capabilityMatrix: { createMany: vi.fn(async ({ data }: { data: unknown[]; skipDuplicates?: boolean }) => ({ count: data.length })) },
  });

  it("分块 500 + skipDuplicates（不覆盖人工行），返回分布与计数", async () => {
    const db = makeDb(baselineModels());
    const r = await backfillMatrices(db as never);
    expect(db.aiModel.findMany.mock.calls[0]![0].where).toEqual({ deletedAt: null });
    expect(r.models).toBe(1000);
    expect(r.protocolDistribution).toEqual({ OPENAI: 971, CUSTOM: 15, ANTHROPIC: 6, GOOGLE: 6, RESPONSES: 2 });
    expect(r.protocolInserted).toBe(r.protocolDerived);
    for (const call of db.protocolCompatibility.createMany.mock.calls) {
      expect(call[0].skipDuplicates).toBe(true);
      expect(call[0].data.length).toBeLessThanOrEqual(500);
    }
    expect(db.protocolCompatibility.createMany).toHaveBeenCalledTimes(Math.ceil(r.protocolDerived / 500));
  });

  it("dryRun 不写库", async () => {
    const db = makeDb(baselineModels());
    const r = await backfillMatrices(db as never, { dryRun: true });
    expect(r.dryRun).toBe(true);
    expect(r.protocolInserted).toBe(0);
    expect(db.protocolCompatibility.createMany).not.toHaveBeenCalled();
    expect(db.capabilityMatrix.createMany).not.toHaveBeenCalled();
  });

  it("重复执行（DB 已有全部行，ON CONFLICT DO NOTHING 返回 0）→ 新增 0", async () => {
    const db = makeDb(baselineModels());
    db.protocolCompatibility.createMany.mockResolvedValue({ count: 0 } as never);
    db.capabilityMatrix.createMany.mockResolvedValue({ count: 0 } as never);
    const r = await backfillMatrices(db as never);
    expect(r.protocolInserted).toBe(0);
    expect(r.capabilityInserted).toBe(0);
  });

  it("chunk 边界", () => {
    expect(chunk([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
    expect(chunk([], 2)).toEqual([]);
  });
});
