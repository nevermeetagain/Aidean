import { describe, expect, it } from "vitest";
import {
  AdminRedemptionBatchCreateSchema,
  AdminRedemptionListQuerySchema,
  AnthropicChatBodySchema,
  GatewayChatSchema,
  MatrixResponseSchema,
  ModelListQuerySchema,
  OpenAIChatBodySchema,
  PaginationMetaSchema,
  RechargeTierSchema,
  RedeemInputSchema,
  ViewMode as ViewModeEnum,
  envelope,
} from "../index";

describe("common.envelope", () => {
  const Env = envelope(PaginationMetaSchema);

  it("标准四要素 parse 通过,data 为对象", () => {
    const r = Env.safeParse({
      code: 0,
      message: "ok",
      data: { page: 1, pageSize: 20, total: 41, totalPages: 3 },
      requestId: "req-1",
    });
    expect(r.success).toBe(true);
  });

  it("data 允许 null 且 requestId 缺失即失败", () => {
    expect(
      Env.safeParse({ code: 0, message: "ok", data: null, requestId: "r" }).success,
    ).toBe(true);
    expect(Env.safeParse({ code: 0, message: "ok", data: null }).success).toBe(false);
  });
});

describe("gateway 双格式判别联合（v2.0 口径：按 body 形态判别，无 format 字段）", () => {
  it("openai 体解析通过（无 format/priorityHint 字段）", () => {
    const r = OpenAIChatBodySchema.safeParse({
      model: "gpt-x",
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 100,
    });
    expect(r.success).toBe(true);
  });

  it("anthropic 体 messages 仅允许 user/assistant；空 messages 拒绝", () => {
    expect(
      AnthropicChatBodySchema.safeParse({
        model: "m",
        messages: [{ role: "assistant", content: "yo" }],
        max_tokens: 10,
      }).success,
    ).toBe(true);
    expect(
      GatewayChatSchema.safeParse({
        model: "m",
        messages: [],
        max_tokens: 10,
      }).success,
    ).toBe(false);
  });
});

describe("其余域抽样", () => {
  it("ModelListQuery 默认值与 coerce 生效", () => {
    const q = ModelListQuerySchema.parse({});
    expect(q.page).toBe(1);
    expect(q.pageSize).toBe(20);
  });

  it("RechargeTier 字符串金额 coerce 成 bigint,bonus 默认 0", () => {
    const t = RechargeTierSchema.parse({ id: "t1", amountMinor: "5000", totalMinor: 6000 });
    expect(t.amountMinor).toBe(5000n);
    expect(t.bonusMinor).toBe(0n);
  });

  it("RedeemInput 长度边界 8/64", () => {
    expect(RedeemInputSchema.safeParse({ code: "A".repeat(8) }).success).toBe(true);
    expect(RedeemInputSchema.safeParse({ code: "A".repeat(64) }).success).toBe(true);
    expect(RedeemInputSchema.safeParse({ code: "A".repeat(7) }).success).toBe(false);
  });

  it("ladder 枚举仅 models|stations;ViewMode 仅 table|chart", () => {
    expect(
      MatrixResponseSchema.safeParse({ type: "models", rows: [{ tierLabel: "T0", vendors: [] }] })
        .success,
    ).toBe(true);
    expect(MatrixResponseSchema.safeParse({ type: "tools", rows: [] }).success).toBe(false);
    expect(ViewModeEnum.safeParse("chart").success).toBe(true);
    expect(ViewModeEnum.safeParse("grid").success).toBe(false);
  });
});

describe("admin.redemption 查询与批次边界（v1.15 低风险收口）", () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const past = new Date(Date.now() - 86_400_000).toISOString();
  const batch = (over: Record<string, unknown> = {}) => ({
    targetType: "BALANCE",
    balanceMinor: "5000",
    count: 1,
    prefix: "",
    ...over,
  });

  it("列表查询 status 白名单：合法枚举放行、非法值拒绝", () => {
    expect(AdminRedemptionListQuerySchema.safeParse({ status: "DISABLED" }).success).toBe(true);
    expect(AdminRedemptionListQuerySchema.safeParse({ status: "BOGUS" }).success).toBe(false);
    expect(AdminRedemptionListQuerySchema.safeParse({ batchNo: "B20260901ABC123", pageSize: 50 }).success).toBe(true);
  });

  it("批次生成：合法未来有效期 + 面额在限内 → 放行", () => {
    expect(AdminRedemptionBatchCreateSchema.safeParse(batch({ expiresAt: future })).success).toBe(true);
  });

  it("批次生成：过期时间（过去）拒绝；面额超 1e8 分上限拒绝", () => {
    expect(AdminRedemptionBatchCreateSchema.safeParse(batch({ expiresAt: past })).success).toBe(false);
    expect(AdminRedemptionBatchCreateSchema.safeParse(batch({ balanceMinor: "100000001" })).success).toBe(false);
  });

  it("批次生成：数量 >500 拒绝；套餐码缺 packageId 拒绝", () => {
    expect(AdminRedemptionBatchCreateSchema.safeParse(batch({ count: 501 })).success).toBe(false);
    expect(
      AdminRedemptionBatchCreateSchema.safeParse({ targetType: "PACKAGE", count: 1 }).success,
    ).toBe(false);
  });
});