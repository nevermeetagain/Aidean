// TASK-082 批量调价契约单测：rows 1..500 / requestId=uuid / 同批 modelId 去重 / 响应 DTO
import { describe, expect, it } from "vitest";
import { PRICE_BATCH_MAX_ROWS, PriceBatchUpsertResponseSchema, PriceBatchUpsertSchema } from "../index";

const rid = "0192f1a4-7c1e-7d2b-9a51-3c5f0b7e8d21";
const row = (i: number) => ({ modelId: `m-${i}`, priceInput: 1, priceOutput: "2.5" });

describe("PriceBatchUpsertSchema（TASK-082）", () => {
  it("上限常量为 500", () => expect(PRICE_BATCH_MAX_ROWS).toBe(500));
  it("1 行与 500 行通过；行复用 AdminPriceCreateSchema 默认 billingMode=PER_TOKEN", () => {
    const one = PriceBatchUpsertSchema.parse({ requestId: rid, rows: [row(0)] });
    expect(one.rows[0].billingMode).toBe("PER_TOKEN");
    expect(one.rows[0].priceOutput).toBe(2.5);
    const max = Array.from({ length: 500 }, (_, i) => row(i));
    expect(PriceBatchUpsertSchema.safeParse({ requestId: rid, rows: max }).success).toBe(true);
  });
  it("0 行与 501 行拒绝", () => {
    expect(PriceBatchUpsertSchema.safeParse({ requestId: rid, rows: [] }).success).toBe(false);
    const over = Array.from({ length: 501 }, (_, i) => row(i));
    expect(PriceBatchUpsertSchema.safeParse({ requestId: rid, rows: over }).success).toBe(false);
  });
  it("requestId 非 uuid / 缺失拒绝", () => {
    expect(PriceBatchUpsertSchema.safeParse({ requestId: "abc", rows: [row(0)] }).success).toBe(false);
    expect(PriceBatchUpsertSchema.safeParse({ rows: [row(0)] }).success).toBe(false);
  });
  it("负价拒绝（沿用单行口径）", () => {
    expect(PriceBatchUpsertSchema.safeParse({ requestId: rid, rows: [{ ...row(0), priceInput: -1 }] }).success).toBe(false);
  });
  it("同批重复 modelId 拒绝并指向后一行", () => {
    const r = PriceBatchUpsertSchema.safeParse({ requestId: rid, rows: [row(1), row(2), row(1)] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["rows", 2, "modelId"]);
  });
  it("strict：未知顶层键拒绝", () => {
    expect(PriceBatchUpsertSchema.safeParse({ requestId: rid, rows: [row(0)], dryRun: true }).success).toBe(false);
  });
});

describe("PriceBatchUpsertResponseSchema（TASK-082）", () => {
  it("合法响应可解析", () => {
    const ok = PriceBatchUpsertResponseSchema.safeParse({
      requestId: rid,
      total: 3,
      created: 1,
      updated: 1,
      failed: [{ index: 2, modelId: "m-2", code: 20001, message: "模型不存在" }],
      replayed: false,
    });
    expect(ok.success).toBe(true);
  });
});
