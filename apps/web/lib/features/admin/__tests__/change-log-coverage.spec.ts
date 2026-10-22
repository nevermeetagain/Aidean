/**
 * TASK-076 · 后端红线核验②：model_change_logs 全写入面覆盖（REQ-F-055）
 *
 * 断言所有对 AiModel 的写路径都留痕 ModelChangeLog：
 *  - sync writers：UPDATE 分支（changeType=SYNC）、CREATE 分支（changeType=CREATE）
 *  - admin 手动：writeModelChangeLog（source=admin_manual，作为 CRUD/revert 的统一漏斗）
 * 并静态扫描业务源码，锁定写入面（modelChangeLog.create）清单，防新增越权写路径未留痕。
 *
 * 只读核验：仅 mock prisma，不改业务代码。发现缺陷即登记，不修业务码。
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const { upsertModel } = await import("../../../sync/writers/model-writers");
const { writeModelChangeLog } = await import("../model-change-log");

describe("model_change_logs 写入面覆盖（REQ-F-055）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaState.$transaction.mockImplementation(async (cb: (tx: typeof prismaState) => Promise<unknown>) => cb(prismaState));
    prismaState.modelChangeLog.findFirst.mockResolvedValue(null);
    prismaState.modelChangeLog.create.mockResolvedValue({});
    prismaState.vendor.findFirst.mockResolvedValue({ id: "v1" });
    prismaState.aiModel.create.mockResolvedValue({ id: "m-new" });
    prismaState.aiModel.update.mockResolvedValue({ id: "m1" });
  });

  it("sync UPDATE 分支写入 change-log（changeType=SYNC / source=sync_script）", async () => {
    prismaState.aiModel.findFirst.mockResolvedValue({ id: "m1", contextLength: 64000, parameterCount: "7B" });
    await upsertModel({ modelCode: "gpt-x", contextLength: 128000, checksum: "cs-u" }, "batch-u");

    expect(prismaState.modelChangeLog.create).toHaveBeenCalledTimes(1);
    const args = prismaState.modelChangeLog.create.mock.calls[0][0].data;
    expect(args).toMatchObject({ modelId: "m1", changeType: "SYNC", source: "sync_script", syncBatchId: "batch-u" });
  });

  it("sync CREATE 分支写入 change-log（changeType=CREATE / source=sync_script）", async () => {
    prismaState.aiModel.findFirst.mockResolvedValue(null); // 不存在 → CREATE
    await upsertModel({ modelCode: "gpt-new", contextLength: 32000, checksum: "cs-c" }, "batch-c");

    expect(prismaState.modelChangeLog.create).toHaveBeenCalledTimes(1);
    const args = prismaState.modelChangeLog.create.mock.calls[0][0].data;
    expect(args).toMatchObject({ modelId: "m-new", changeType: "CREATE", source: "sync_script", syncBatchId: "batch-c" });
  });

  it("admin writeModelChangeLog 写入 change-log（source=admin_manual / syncBatchId=null / validationStatus=pending）", async () => {
    await writeModelChangeLog({
      modelId: "m-adm",
      changeType: "UPDATE",
      changedFields: ["nameDisplay"],
      operatorId: "op-1",
    });

    expect(prismaState.modelChangeLog.create).toHaveBeenCalledTimes(1);
    const args = prismaState.modelChangeLog.create.mock.calls[0][0].data;
    expect(args).toMatchObject({
      modelId: "m-adm",
      changeType: "UPDATE",
      source: "admin_manual",
      syncBatchId: null,
      validationStatus: "pending",
      operatorId: "op-1",
    });
  });

  it("静态扫描：sync/admin 已知漏斗留痕调用数锁定（sync×2 + admin×1），防已知路径被删痕", () => {
    const writersSrc = readFileSync(fileURLToPath(new URL("../../../sync/writers/model-writers.ts", import.meta.url)), "utf8");
    const adminSrc = readFileSync(fileURLToPath(new URL("../model-change-log.ts", import.meta.url)), "utf8");

    const syncCreates = writersSrc.match(/modelChangeLog\.create\(/g) ?? [];
    const adminCreates = adminSrc.match(/modelChangeLog\.create\(/g) ?? [];

    // sync writers 恰有 UPDATE + CREATE 两处留痕；admin 漏斗恰一处（排版敏感，重构需同步）
    expect(syncCreates).toHaveLength(2);
    expect(adminCreates).toHaveLength(1);
  });

  it("写入口对账：枚举 admin 下所有改 AiModel 的路由，除已登记缺陷外必须留痕 change-log", () => {
    // DEFECT-076-A（另立卡修复，本卡不修业务码）：批量上下架/隐藏/软删仅 writeAudit，未 writeModelChangeLog
    const KNOWN_UNLOGGED_EXCEPTIONS = new Set(["models/batch"]);

    const adminRoot = fileURLToPath(new URL("../../../../app/api/v1/admin", import.meta.url));
    const routeFiles: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name === "route.ts") routeFiles.push(full);
      }
    };
    walk(adminRoot);

    const AI_WRITE = /aiModel\.(create|update|updateMany|delete|deleteMany)\s*\(/;
    const LOGGED = /writeModelChangeLog\s*\(/;
    const unlogged: string[] = [];
    let writeSurfaces = 0;
    for (const f of routeFiles) {
      const src = readFileSync(f, "utf8");
      if (!AI_WRITE.test(src)) continue;
      writeSurfaces++;
      if (!LOGGED.test(src)) {
        const rel = f.slice(adminRoot.length + 1).replace(/\\/g, "/").replace(/\/route\.ts$/, "");
        unlogged.push(rel);
      }
    }

    // 至少覆盖已知写入口（models create/[id] update、revert、batch）
    expect(writeSurfaces).toBeGreaterThanOrEqual(4);
    // 未留痕清单须恰等于已登记缺陷例外，防止新增未留痕写入口（真正的防护点）
    expect(unlogged.sort()).toEqual([...KNOWN_UNLOGGED_EXCEPTIONS].sort());
  });
});
