/**
 * TASK-010 · R-01 固化复现（REQ-F-019 / REQ-F-14 / REQ-F-12）——PG16 集成回归测试
 *
 * 缺陷：schema.prisma 的 `@@unique([modelId, isCurrent])` 使同一 modelId 下
 * (model_id, is_current=false) 也只能存在一行。persistPrices 的写序为
 * 「updateMany(current→false) → create(新 current=true)」，于是：
 *   第 1 次采集 → [P1 true]
 *   第 2 次采集 → P1→false，create P2 true → [P1 false, P2 true]
 *   第 3 次采集 → updateMany 试图把 P2→false，但 P1 已是 false → 撞 (model_id,false) 唯一键
 *                → PostgreSQL 23505 = Prisma P2002
 * 即「同一模型连续第三次采集写价失败」。规划期已在 PGlite PG16.4 复现，本卡固化为真库回归测试。
 *
 * 修复（M-001 / TASK-011）：改为部分唯一索引 UNIQUE(model_id) WHERE is_current=true，
 * 历史行（false）不再受限，当前行（true）每模型唯一 → 三次写价全部成功、current 恰 1 条。
 * 本用例在 TASK-011 之前为「红」（第 3 轮 action=failed/P2002），之后转「绿」。
 *
 * 运行门控（TASK-089 / V0.8.0 D8-01）：须显式 RUN_DB_TESTS=1 且设置 DATABASE_URL 才执行。
 * 仅凭 DATABASE_URL 不足以开启——CI 作业级占位串（.github/workflows/ci.yml env.DATABASE_URL，
 * 供 prisma generate / next build 只解析不连接）曾误触发本套件连接 127.0.0.1:5432 而失败。
 * 默认 `pnpm --filter web test`（含 CI 占位 DATABASE_URL）一律 skip。真库验证命令：
 *   RUN_DB_TESTS=1 DATABASE_URL=postgresql://... pnpm --filter web exec vitest run \
 *     lib/sync/writers/__tests__/persist-prices.int.spec.ts
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// 门控：显式 RUN_DB_TESTS=1 ∧ DATABASE_URL 才执行；否则整组 skip（防 CI 占位串误触发、避免误连共享开发库）。
const DB_ENABLED = process.env.RUN_DB_TESTS === "1" && !!process.env.DATABASE_URL;
const suite = DB_ENABLED ? describe : describe.skip;

suite("persistPrices 多次采集写价（R-01 / REQ-F-019）", () => {
  // 延迟动态导入，确保 DATABASE_URL 生效后单例才建连。
  // 注：仓库 ESLint 基线为 next/core-web-vitals，未启用 @typescript-eslint/no-explicit-any，
  // 故此处不使用 eslint-disable 指令（否则 ESLint 报「rule not found」），prisma 以 any 延迟注入。
  let prisma: any;
  let upsertModel: (data: import("../../types/sync").NormalizedModelData, batchId: string) => Promise<import("../../types/sync").SyncModelResult>;

  const stamp = Date.now();
  const vendorCode = `it-r01-v-${stamp}`;
  const modelCode = `it-r01-m-${stamp}`; // 三次采集回归模型
  const dupModelCode = `it-r01-d-${stamp}`; // 「唯一当前行」断言专用隔离模型
  let vendorId: string;
  let modelId: string;
  let dupModelId: string;
  let batchId: string; // ModelChangeLog.syncBatchId 有 FK，须真实 sync_batches 行

  beforeAll(async () => {
    const mod = await import("../../../db/prisma");
    prisma = mod.prisma;
    const writers = await import("../model-writers");
    upsertModel = writers.upsertModel;

    const vendor = await prisma.vendor.create({
      data: { code: vendorCode, name: "IT R-01 Vendor" },
      select: { id: true },
    });
    vendorId = vendor.id;

    const model = await prisma.aiModel.create({
      data: {
        modelCode,
        nameDisplay: modelCode,
        slug: modelCode,
        vendorId,
        modelType: "CHAT",
        protocol: "OPENAI",
      },
      select: { id: true },
    });
    modelId = model.id;

    const dupModel = await prisma.aiModel.create({
      data: {
        modelCode: dupModelCode,
        nameDisplay: dupModelCode,
        slug: dupModelCode,
        vendorId,
        modelType: "CHAT",
        protocol: "OPENAI",
      },
      select: { id: true },
    });
    dupModelId = dupModel.id;

    const batch = await prisma.syncBatch.create({
      data: { batchCode: `it-r01-b-${stamp}`, source: "crawler", status: "running" },
      select: { id: true },
    });
    batchId = batch.id;
  });

  afterAll(async () => {
    if (!prisma) return;
    // 逆序清理：价格 / 变更日志 → 模型（级联价格）→ 厂商。全程吞异常保证尽力回收。
    for (const id of [modelId, dupModelId]) {
      try { await prisma.modelPrice.deleteMany({ where: { modelId: id } }); } catch { /* noop */ }
      try { await prisma.modelChangeLog.deleteMany({ where: { modelId: id } }); } catch { /* noop */ }
      try { await prisma.aiModel.delete({ where: { id } }); } catch { /* noop */ }
    }
    try { await prisma.vendor.delete({ where: { id: vendorId } }); } catch { /* noop */ }
    try { await prisma.syncBatch.delete({ where: { id: batchId } }); } catch { /* noop */ }
  });

  // 每轮换 checksum 规避 dedup.shouldSkip；单条价格避免触发 TASK-012 的多 current 场景。
  const makeData = (checksum: string, input: number) => ({
    modelCode,
    vendorName: "IT R-01 Vendor",
    contextLength: 128000,
    checksum,
    prices: [
      {
        inputPrice: input,
        outputPrice: input * 2,
        currency: "CNY",
        unit: "per_1k_tokens",
        effectiveAt: new Date("2026-01-01T00:00:00Z"),
      },
    ],
  });

  it("同一模型连续三次采集写价全部成功、当前价恰 1 条（M-001 修复后为绿）", async () => {
    const r1 = await upsertModel(makeData("c1", 1), batchId);
    expect(r1.action, `round1: ${r1.error ?? ""}`).toBe("updated");

    const r2 = await upsertModel(makeData("c2", 2), batchId);
    expect(r2.action, `round2: ${r2.error ?? ""}`).toBe("updated");

    // 红→绿关键点：旧全列唯一约束下此处 updateMany 抛 P2002/23505，upsertModel 捕获后 action=failed。
    const r3 = await upsertModel(makeData("c3", 3), batchId);
    expect(r3.action, `round3 (R-01 repro): ${r3.error ?? ""}`).toBe("updated");

    const currentCount = await prisma.modelPrice.count({ where: { modelId, isCurrent: true } });
    expect(currentCount).toBe(1);

    const totalCount = await prisma.modelPrice.count({ where: { modelId } });
    expect(totalCount).toBe(3);
  });

  it("同一模型的第二条 is_current=true 写入被唯一索引拒绝（当前行唯一不变量）", async () => {
    const mk = (input: number, from: string) => ({
      modelId: dupModelId,
      priceInput: input,
      priceOutput: input,
      effectiveFrom: new Date(from),
      isCurrent: true,
      sourceType: "OFFICIAL",
    });

    // 首条当前行成功
    await expect(prisma.modelPrice.create({ data: mk(1, "2026-02-01T00:00:00Z") })).resolves.toBeTruthy();
    // 第二条当前行必须被拒（旧：@@unique(model,true)；新：部分唯一索引 WHERE is_current=true）
    await expect(prisma.modelPrice.create({ data: mk(2, "2026-02-02T00:00:00Z") })).rejects.toMatchObject({ code: "P2002" });
  });
});
