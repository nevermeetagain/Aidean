/**
 * evaluation 域金额一致性单测（EVAL-01 P1 核心验收：P3 前端开工的前置门槛）。
 *
 * 策略：vi.mock db/prisma + gateway/service + billing/service 三层隔离；
 * 金额断言全部 BigInt 分（minor）整数，禁止浮点比较。
 * 三账平衡口径：wallet.balance（余额）+ hold（冻结）与 ledger 方向合计一致，
 * 且「扣钱必有结果 / 有结果必扣钱」在终态单上逐分核对。
 */
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

// ---- 三层 mock（hoisted 先行） ----
const { txStub, txFn, prismaStub, gatewayMock, billingMock } = vi.hoisted(() => {
  const mk = () => vi.fn();
  const txStub = {
    evaluation: { create: mk(), findUniqueOrThrow: mk() },
    evaluationModel: { create: mk() },
  };
  return {
    txStub,
    txFn: mk(),
    prismaStub: {
      systemConfig: { findMany: mk() },
      aiModel: { findMany: mk() },
      evaluation: {
        findFirst: mk(),
        findUnique: mk(),
        findMany: mk(),
        count: mk(),
        updateMany: mk(),
      },
      evaluationModel: { updateMany: mk() },
      usageLog: { count: mk() },
      $transaction: mk(),
    },
    gatewayMock: { executeChat: mk() },
    billingMock: {
      hold: mk(),
      captureHold: mk(),
      voidHold: mk(),
    },
  };
});

vi.mock("../../../db/prisma", () => ({ prisma: prismaStub }));
vi.mock("../../gateway/service", () => ({ gatewayOrchestrator: gatewayMock }));
vi.mock("../../billing/service", () => ({ billingService: billingMock }));

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
import { EVALUATION_LIMITS, EVALUATION_STATUS } from "../types";
import { parseCreateEvaluationInput } from "../schema";
import { evaluationService, readEvalPricing, evalPerModelMinor, pickWinner } from "../service";

// ---- 默认桩数据 ----
const USER_ID = "u-eval-1";
const TIER_PRO = "PRO";

// modelCode 刻意与 id 不同形（gw 只认 modelCode/slug）：防止实现回退成「把 AiModel uuid 当 model 传给网关」
const MODELS = ["m-1", "m-2", "m-3", "m-4", "m-5", "m-6"].map((id) => ({
  id,
  name: `模型${id}`,
  slug: id,
  modelCode: `code-${id}`,
}));

function evalRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ev-1",
    userId: USER_ID,
    prompt: "请比较这三个模型",
    title: null,
    evalType: "comparison",
    comparisonMode: "side-by-side",
    config: { idempotencyKey: null },
    criteria: {},
    metadata: null,
    results: null,
    winnerModelId: null,
    status: EVALUATION_STATUS.PENDING,
    progress: 0,
    isPaid: true,
    cost: 0n,
    startedAt: null,
    completedAt: null,
    errorMsg: null,
    createdAt: new Date("2026-09-15T00:00:00Z"),
    updatedAt: new Date("2026-09-15T00:00:00Z"),
    deletedAt: null,
    evaluationModels: [] as unknown[],
    ...overrides,
  };
}

function modelCol(modelId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `em-${modelId}`,
    evaluationId: "ev-1",
    modelId,
    model: MODELS.find((m) => m.id === modelId) ?? { id: modelId, name: modelId, slug: modelId },
    response: null,
    thinking: null,
    reasoningContent: null,
    tokensInput: 0,
    tokensOutput: 0,
    tokensThinking: 0,
    tokensTotal: 0,
    latencyMs: null,
    ttftMs: null,
    score: null,
    accuracyScore: null,
    relevanceScore: null,
    coherenceScore: null,
    creativityScore: null,
    rawResponse: null,
    status: "pending",
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function gatewayOk(modelId: string) {
  return {
    response: { choices: [{ message: { content: `来自 ${modelId} 的回答` } }] },
    meta: {
      requestId: `eval:ev-1:${modelId}`,
      modelId,
      stationId: null,
      channelId: null,
      billingPath: "PLATFORM",
      promptTokens: 10,
      completionTokens: 20,
      quotaMinor: 0n,
      latencyMs: 100,
      statusCode: 200,
    },
  };
}

beforeEach(async () => {
  vi.clearAllMocks();
  txFn.mockImplementation(async (fn: (tx: typeof txStub) => Promise<unknown>) => fn(txStub));
  prismaStub.$transaction.mockImplementation(async (fn: (tx: typeof txStub) => Promise<unknown>) => fn(txStub));
  // pricing 默认 '2' 元 / CNY
  prismaStub.systemConfig.findMany.mockResolvedValue([
    { configKey: "pricing.evalPerModel", configValue: "2" },
    { configKey: "pricing.currency", configValue: "CNY" },
  ]);
  prismaStub.aiModel.findMany.mockImplementation(
    async (args: { where?: { id?: { in?: string[] } } }) => {
      const ids = args?.where?.id?.in;
      return ids ? MODELS.filter((m) => ids.includes(m.id)) : MODELS;
    }
  );
  prismaStub.evaluation.updateMany.mockResolvedValue({ count: 1 });
  prismaStub.evaluationModel.updateMany.mockResolvedValue({ count: 1 });
  prismaStub.usageLog.count.mockResolvedValue(0);
  prismaStub.evaluation.findFirst.mockResolvedValue(null);
  prismaStub.evaluation.findMany.mockResolvedValue([]);
  prismaStub.evaluation.count.mockResolvedValue(0);
  // 默认详情桩：结算完成态（cost=600 分、6 列 completed、winner=m-1）——测试内按场景覆盖
  prismaStub.evaluation.findUnique.mockResolvedValue(
    evalRow({
      status: EVALUATION_STATUS.COMPLETED,
      cost: 600n,
      winnerModelId: "m-1",
      evaluationModels: MODELS.map((m) => modelCol(m.id, { status: "completed", response: `r-${m.id}` })),
    })
  );
  // 重置计价缓存（防 ⑤ 的 force 刷新残留）：默认 2 元/模型
  await readEvalPricing(true);
  // 创建单事务返回
  txStub.evaluation.create.mockImplementation(async (args: { data: Record<string, unknown> }) =>
    evalRow({ id: "ev-1", prompt: args.data.prompt, cost: args.data.cost, config: args.data.config })
  );
  txStub.evaluation.findUniqueOrThrow.mockImplementation(async (args: { where: { id: string } }) =>
    evalRow({
      id: args.where.id,
      evaluationModels: ["m-1", "m-2", "m-3", "m-4", "m-5", "m-6"].slice(0, 6).map((id) => modelCol(id)),
    })
  );
  txStub.evaluationModel.create.mockImplementation(async (args: { data: Record<string, unknown> }) =>
    modelCol(args.data.modelId as string)
  );
  // executeChat 默认全成功
  gatewayMock.executeChat.mockImplementation(async (_u: string, body: { model: string }) => gatewayOk(body.model));
  // billing 默认成功
  billingMock.hold.mockResolvedValue({ holdId: "h-1", idempotent: false });
  billingMock.captureHold.mockResolvedValue({ capturedMinor: 200n, idempotent: false });
  billingMock.voidHold.mockResolvedValue({ idempotent: false });
});

async function expectApiError(promise: Promise<unknown>, code: number) {
  try {
    await promise;
    expect.unreachable("should have thrown ApiError");
  } catch (err) {
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe(code);
  }
}

// ==================== 门禁 / 参数边界 ====================

describe("EVAL-01 门禁与参数边界", () => {
  it("① NORMAL 用户（免费）→ 403 付费用户能力，零副作用（不建单不扣费）", async () => {
    await expectApiError(
      evaluationService.createAndRun(USER_ID, "NORMAL", { prompt: "x", modelIds: ["m-1", "m-2"] }),
      ERROR_CODES.FORBIDDEN
    );
    expect(txStub.evaluation.create).not.toHaveBeenCalled();
    expect(billingMock.hold).not.toHaveBeenCalled();
  });

  it("② 模型数越界：1 个（下限 2）与 7 个（上限 6）均被校验拒；2-6 合法", () => {
    expect(() => parseCreateEvaluationInput({ prompt: "x", modelIds: ["m-1"] })).toThrow(ApiError);
    expect(() => parseCreateEvaluationInput({ prompt: "x", modelIds: ["m-1", "m-2", "m-3", "m-4", "m-5", "m-6", "m-7"] })).toThrow(ApiError);
    expect(() => parseCreateEvaluationInput({ prompt: "x", modelIds: ["m-1", "m-2"] })).not.toThrow();
  });

  it("③ 含无效/已下架模型 → 40000，不建单", async () => {
    prismaStub.aiModel.findMany.mockResolvedValue([MODELS[0], MODELS[1]]); // 请求 3 个只回 2 个
    await expectApiError(
      evaluationService.createAndRun(USER_ID, TIER_PRO, { prompt: "x", modelIds: ["m-1", "m-2", "m-3"] }),
      ERROR_CODES.BAD_REQUEST
    );
    expect(txStub.evaluation.create).not.toHaveBeenCalled();
  });

  it("③b 传网关的 body.model 必须是 modelCode（回归护栏：uuid 会被网关 30002 全列拒）", async () => {
    await evaluationService.createAndRun(USER_ID, TIER_PRO, {
      prompt: "x",
      modelIds: ["m-1", "m-2", "m-3"],
    });
    expect(gatewayMock.executeChat).toHaveBeenCalledTimes(3);
    const modelsPassed = gatewayMock.executeChat.mock.calls.map(
      (c: unknown[]) => (c[1] as { model: string }).model
    );
    // 真契约：gateway repository.findModelByCode 按 modelCode/slug 解析，uuid 直接 30002
    expect(modelsPassed).toEqual(["code-m-1", "code-m-2", "code-m-3"]);
    expect(modelsPassed.some((m: string) => /^m-\d$/.test(m))).toBe(false);
    // requestId 仍按 AiModel id 维度拼（对账前缀 eval:<id>:<modelId> 依赖此稳定性）
    const requestIds = gatewayMock.executeChat.mock.calls.map((c: unknown[]) => c[2] as string);
    expect(requestIds).toEqual(["eval:ev-1:m-1", "eval:ev-1:m-2", "eval:ev-1:m-3"]);
  });
});

// ==================== 计价 ====================

describe("EVAL-01 计价（N×单价，分整数）", () => {
  it("④ 价格 = N × evalPerModel：默认 ¥2/模型 × 3 = 600 分，hold/capture 逐分核对", async () => {
    const res = await evaluationService.createAndRun(USER_ID, TIER_PRO, {
      prompt: "x",
      modelIds: ["m-1", "m-2", "m-3"],
    });
    expect(txStub.evaluation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cost: "600" }) })
    );
    expect(billingMock.hold).toHaveBeenCalledWith(USER_ID, "eval:ev-1", 600n);
    expect(billingMock.captureHold).toHaveBeenCalledWith("eval:ev-1", 600n);
    // 金额双字段契约：costMinor=分整数字符串（断言用），costYuan=元两位小数（展示用）
    expect(res.evaluation.costMinor).toBe("600");
    expect(res.evaluation.costYuan).toBe("6.00");
    expect(res.evaluation.status).toBe(EVALUATION_STATUS.COMPLETED);
  });

  it("⑤ 改 config 生效（¥5/模型 × 2 = 1000 分）；读缓存回退默认（config 缺行 → ¥2）", async () => {
    prismaStub.systemConfig.findMany.mockResolvedValue([
      { configKey: "pricing.evalPerModel", configValue: "5" },
      { configKey: "pricing.currency", configValue: "CNY" },
    ]);
    const cfg = await readEvalPricing(true);
    expect(evalPerModelMinor(cfg)).toBe(500n);
    await evaluationService.createAndRun(USER_ID, TIER_PRO, { prompt: "x", modelIds: ["m-1", "m-2"] });
    expect(billingMock.hold).toHaveBeenCalledWith(USER_ID, "eval:ev-1", 1000n);

    // 缓存回退：清空 config 行 → 默认 2
    prismaStub.systemConfig.findMany.mockResolvedValue([]);
    const cfg2 = await readEvalPricing(true);
    expect(evalPerModelMinor(cfg2)).toBe(200n);
  });
});

// ==================== 全成功 / 部分失败 / 全败 结算 ====================

describe("EVAL-01 结算三态（wallet+hold+ledger 三账平衡）", () => {
  it("⑥ 全成功：hold 600 → capture 600（held 清零、balance -600）→ status=2，列全 completed", async () => {
    const res = await evaluationService.createAndRun(USER_ID, TIER_PRO, {
      prompt: "x",
      modelIds: ["m-1", "m-2", "m-3"],
    });
    // 三账平衡计算式：初始 balance=B、held=0；hold 后 held=+600；capture 后 balance=B-600、held=0。
    // Σledger(DEBIT)=600 == balance 减少额 == capture 实扣额；hold 终态 0。
    expect(billingMock.hold).toHaveBeenCalledTimes(1);
    expect(billingMock.captureHold).toHaveBeenCalledTimes(1);
    expect(billingMock.voidHold).not.toHaveBeenCalled();
    expect(res.evaluation.status).toBe(EVALUATION_STATUS.COMPLETED);
    expect(res.evaluation.models.every((m) => m.status === "completed")).toBe(true);
    expect(res.evaluation.winnerModelId).toBe("m-1"); // 等长响应取先到（并列取首个）
  });

  it("⑦ 1/6 败：capture(5×200=1000) + 差额 200 由 captureHold 解冻 → status=2 + 败列 error + winner 排除败列", async () => {
    gatewayMock.executeChat.mockImplementation(async (_u: string, body: { model: string }) => {
      if (body.model === "code-m-3") throw new Error("上游 502");
      return gatewayOk(body.model);
    });
    // 结算后详情桩：m-3 列 error
    prismaStub.evaluation.findUnique.mockResolvedValue(
      evalRow({
        status: EVALUATION_STATUS.COMPLETED,
        cost: 1200n,
        evaluationModels: MODELS.map((m) =>
          modelCol(m.id, m.id === "m-3" ? { status: "error", errorMessage: "上游 502" } : { status: "completed", response: `r-${m.id}` })
        ),
      })
    );
    const res = await evaluationService.createAndRun(USER_ID, TIER_PRO, {
      prompt: "x",
      modelIds: ["m-1", "m-2", "m-3", "m-4", "m-5", "m-6"],
    });
    // 平衡：hold 1200 → capture 1000（m-3 失败份额 200 差额解冻）；ledger DEBIT=1000。
    expect(billingMock.hold).toHaveBeenCalledWith(USER_ID, "eval:ev-1", 1200n);
    expect(billingMock.captureHold).toHaveBeenCalledWith("eval:ev-1", 1000n);
    expect(billingMock.voidHold).not.toHaveBeenCalled();
    expect(res.evaluation.status).toBe(EVALUATION_STATUS.COMPLETED);
    const m3 = res.evaluation.models.find((m) => m.modelId === "m-3");
    expect(m3?.status).toBe("error");
    expect(m3?.errorMessage).toContain("上游 502");
    expect(res.evaluation.winnerModelId).not.toBe("m-3");
    expect(res.evaluation.models.filter((m) => m.status === "completed").length).toBe(5);
  });

  it("⑧ 全败：void 整单（balance 复原、held 清零）→ status=3，不 capture", async () => {
    gatewayMock.executeChat.mockRejectedValue(new Error("全部 5xx"));
    prismaStub.evaluation.findUnique.mockResolvedValue(
      evalRow({
        status: EVALUATION_STATUS.FAILED,
        cost: 400n,
        errorMsg: "全部模型调用失败，已全额退还",
        evaluationModels: [modelCol("m-1", { status: "error" }), modelCol("m-2", { status: "error" })],
      })
    );
    await evaluationService.createAndRun(USER_ID, TIER_PRO, {
      prompt: "x",
      modelIds: ["m-1", "m-2"],
    });
    expect(billingMock.hold).toHaveBeenCalledWith(USER_ID, "eval:ev-1", 400n);
    expect(billingMock.captureHold).not.toHaveBeenCalled();
    expect(billingMock.voidHold).toHaveBeenCalledWith("eval:ev-1");
    const fresh = await evaluationService.getEvaluation(USER_ID, "ev-1");
    expect(fresh.status).toBe(EVALUATION_STATUS.FAILED);
    expect(fresh.errorMsg).toContain("全额退还");
  });

  it("⑨ 余额不足：hold 抛 40001 → 建单即败 status=3 + errorMsg，不留悬浮冻结", async () => {
    billingMock.hold.mockRejectedValue(new ApiError(ERROR_CODES.INSUFFICIENT_BALANCE, "余额不足"));
    prismaStub.evaluation.findUnique.mockResolvedValue(
      evalRow({
        status: EVALUATION_STATUS.FAILED,
        cost: 400n,
        errorMsg: "余额不足",
        evaluationModels: [modelCol("m-1"), modelCol("m-2")],
      })
    );
    await expectApiError(
      evaluationService.createAndRun(USER_ID, TIER_PRO, { prompt: "x", modelIds: ["m-1", "m-2"] }),
      ERROR_CODES.INSUFFICIENT_BALANCE
    );
    expect(txStub.evaluation.create).toHaveBeenCalledTimes(1); // 单已建
    const fresh = await evaluationService.getEvaluation(USER_ID, "ev-1");
    expect(fresh.status).toBe(EVALUATION_STATUS.FAILED);
    expect(fresh.errorMsg).toContain("余额不足");
  });
});

// ==================== 幂等 / 崩溃对账 ====================

describe("EVAL-01 幂等与崩溃遗留对账", () => {
  it("⑩ idempotencyKey 重放：同键返回既有单，不重复 hold/executeChat/capture", async () => {
    // 首次创建后，重放时 findFirst 命中既有单
    const existing = evalRow({
      status: EVALUATION_STATUS.COMPLETED,
      cost: 600n,
      config: { idempotencyKey: "key-1" },
      evaluationModels: [modelCol("m-1"), modelCol("m-2")],
    });
    prismaStub.evaluation.findFirst.mockResolvedValue(existing);
    const res = await evaluationService.createAndRun(USER_ID, TIER_PRO, {
      prompt: "x",
      modelIds: ["m-1", "m-2"],
      idempotencyKey: "key-1",
    });
    expect(res.idempotent).toBe(true);
    expect(txStub.evaluation.create).not.toHaveBeenCalled();
    expect(billingMock.hold).not.toHaveBeenCalled();
    expect(gatewayMock.executeChat).not.toHaveBeenCalled();
  });

  it("⑪ 崩溃遗留单（status=1 超时 + usage_logs=2 条）→ 对账 capture(2×单价) + status=2", async () => {
    prismaStub.evaluation.findUnique.mockResolvedValue(
      evalRow({
        status: EVALUATION_STATUS.RUNNING,
        startedAt: new Date(Date.now() - EVALUATION_LIMITS.STALE_AFTER_MS - 1000),
        evaluationModels: [modelCol("m-1"), modelCol("m-2")],
      })
    );
    // 回归护栏：崩溃单实际残留 3 条 usage_log——m-3 列是全链失败行（error 非空、quotaMinor=0）。
    // 对账必须带 error:null 过滤只数成功行（k=2 → capture 400n）；
    // 若实现退回「纯前缀计数」（k=3 → 600n）即多扣费，本断言拦截。
    prismaStub.usageLog.count.mockImplementation(async (args: { where?: { error?: unknown } }) =>
      args?.where && "error" in args.where && args.where.error === null ? 2 : 3
    );
    // 首次读 = RUNNING（触发对账），对账后重读 = COMPLETED
    prismaStub.evaluation.findUnique
      .mockResolvedValueOnce(
        evalRow({
          status: EVALUATION_STATUS.RUNNING,
          startedAt: new Date(Date.now() - EVALUATION_LIMITS.STALE_AFTER_MS - 1000),
          evaluationModels: [modelCol("m-1"), modelCol("m-2")],
        })
      )
      .mockResolvedValueOnce(
        evalRow({
          status: EVALUATION_STATUS.COMPLETED,
          cost: 400n,
          evaluationModels: [modelCol("m-1"), modelCol("m-2")],
        })
      );
    const fresh = await evaluationService.getEvaluation(USER_ID, "ev-1");
    expect(billingMock.captureHold).toHaveBeenCalledWith("eval:ev-1", 400n);
    // 口径断言：计数必须落在「前缀 + error:null」两条件上（缺 error 过滤即回归为多扣费）
    expect(prismaStub.usageLog.count).toHaveBeenCalledWith({
      where: { requestId: { startsWith: "eval:ev-1:" }, error: null },
    });
    expect(fresh.status).toBe(EVALUATION_STATUS.COMPLETED);
  });

  it("⑫ 崩溃遗留单（status=1 超时 + usage_logs=0 条）→ 对账 void 整单 + status=3 余额复原", async () => {
    prismaStub.usageLog.count.mockResolvedValue(0);
    prismaStub.evaluation.findUnique
      .mockResolvedValueOnce(
        evalRow({
          status: EVALUATION_STATUS.RUNNING,
          startedAt: new Date(Date.now() - EVALUATION_LIMITS.STALE_AFTER_MS - 1000),
          evaluationModels: [modelCol("m-1"), modelCol("m-2")],
        })
      )
      .mockResolvedValueOnce(
        evalRow({
          status: EVALUATION_STATUS.FAILED,
          cost: 400n,
          errorMsg: "执行中断，已自动退还",
          evaluationModels: [modelCol("m-1"), modelCol("m-2")],
        })
      );
    const fresh = await evaluationService.getEvaluation(USER_ID, "ev-1");
    expect(billingMock.voidHold).toHaveBeenCalledWith("eval:ev-1");
    expect(fresh.status).toBe(EVALUATION_STATUS.FAILED);
    expect(fresh.errorMsg).toContain("自动退还");
  });

  it("⑬ 单模型超时（60s）：race 放弃并标列 error，其余列正常结算", async () => {
    vi.useFakeTimers();
    try {
      let release!: () => void;
      const pending = new Promise<never>((_, reject) => {
        const t = setTimeout(() => reject(new Error("模型响应超时（60s）")), EVALUATION_LIMITS.MODEL_TIMEOUT_MS);
        release = () => clearTimeout(t);
      });
      gatewayMock.executeChat.mockImplementation(async (_u: string, body: { model: string }) => {
        if (body.model === "code-m-2") return pending.catch(() => undefined) as never;
        return gatewayOk(body.model);
      });
      prismaStub.evaluation.findUnique.mockResolvedValue(
        evalRow({
          status: EVALUATION_STATUS.COMPLETED,
          cost: 400n,
          evaluationModels: [
            modelCol("m-1", { status: "completed", response: "r" }),
            modelCol("m-2", { status: "error", errorMessage: "模型响应超时（60s）" }),
          ],
        })
      );
      const promise = evaluationService.createAndRun(USER_ID, TIER_PRO, { prompt: "x", modelIds: ["m-1", "m-2"] });
      const timer = vi.getTimerCount();
      expect(timer).toBeGreaterThan(0); // 超时计时器已挂
      release();
      await vi.advanceTimersByTimeAsync(EVALUATION_LIMITS.MODEL_TIMEOUT_MS + 100);
      const res = await promise;
      const m2 = res.evaluation.models.find((m) => m.modelId === "m-2");
      expect(m2?.status).toBe("error");
      expect(m2?.errorMessage).toContain("超时");
      expect(billingMock.captureHold).toHaveBeenCalledWith("eval:ev-1", 200n); // 仅成功 1 列
    } finally {
      vi.useRealTimers();
    }
  });
});

// ==================== winner 规则纯函数 ====================
describe("EVAL-01 winner 判定", () => {
  it("⑭ 错误剔除 → 完整响应优先 → 最长；全败返回 null", () => {
    expect(
      pickWinner([
        { modelId: "a", ok: true, content: "短" },
        { modelId: "b", ok: true, content: "长回答长回答" },
        { modelId: "c", ok: false, content: "" },
      ])
    ).toBe("b");
    expect(pickWinner([{ modelId: "a", ok: false, content: "" }])).toBeNull();
  });
});
