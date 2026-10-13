/**
 * gateway 调用编排单测（Task G.3.2 验收取证）。
 *
 * 策略：vi.mock repository / billingService（stub 组），fetch 用 vi.stubGlobal 模拟上游。
 * 覆盖：预扣→按实捕获（差额释放）、失败 void+Key 计数+降级 free、40001 移除付费候选、
 * requestId 重放幂等、stream 拦截、Key 冷却切换、渠道 FREE_PROXY 优先、UPSTREAM 站跳过、全链失败 30003。
 */
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

// S1 后 safeFetch 在连接前做真实 DNS；stub 环境统一将解析 mock 为公网地址。
vi.mock("node:dns/promises", () => ({
  // 普通函数而非 vi.fn —— afterEach(restoreAllMocks) 会重置 vi.fn 实现致后续用例返回 undefined
  lookup: async () => [{ address: "93.184.216.34", family: 4 }],
}));

// L2-1：PASSTHROUGH_ENABLED 默认已改为 true（!== "0"）；本测试文件覆盖聚合路径
// （callUpstreamAggregated 攒流归一 JSON），需显式置 "0" 回退聚合模式。
// 透传路径由 stream-passthrough.spec.ts 独立覆盖（该文件置 "1"）。
const { _envFlag } = vi.hoisted(() => {
  process.env.AIDEAN_GATEWAY_STREAM_PASSTHROUGH = "0";
  return { _envFlag: process.env.AIDEAN_GATEWAY_STREAM_PASSTHROUGH };
});
void _envFlag;

const { repoStub, billingStub } = vi.hoisted(() => {
  const mk = () => vi.fn();
  return {
    repoStub: {
      getUsageLogByRequestId: mk(),
      listCustomChannels: mk(),
      findModelByCode: mk(),
      loadRouteConfig: mk(),
      getQuotaUsed: mk(),
      findModelsByIds: mk(),
      listCallableStations: mk(),
      getBillingRule: mk(),
      listActivePackageStations: mk(),
      listAvailableKeys: mk(),
      findActiveStationUserKey: mk(),
      markKeyFailure: mk(),
      markKeySuccess: mk(),
      insertUsageLog: mk(),
      upsertDailyStat: mk(),
      addQuotaUsed: mk(),
    },
    billingStub: { hold: mk(), captureHold: mk(), voidHold: mk() },
  };
});

vi.mock("../repository", () => ({ gatewayRepository: repoStub }));
vi.mock("../../billing/service", () => ({ billingService: billingStub }));
vi.mock("../../db/prisma", () => ({ prisma: {} }));
// GW-KEY-01：UPSTREAM 分支经 decryptSecret 解密自有 Key——mock 返回可断言的固定明文
vi.mock("../../apikey/crypto", () => ({ decryptSecret: vi.fn((c: string) => `sk-decrypted-${c}`) }));

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
import { estimatePrepayMinor, gatewayOrchestrator, pickKeyWeighted, upstreamFormatOfStation } from "../service";

// ---------- 公共夹具 ----------

const price = { priceInput: "2", priceOutput: "8", billingCurrency: "CNY" }; // 元/百万 token
const requestedModel = {
  id: "m-req",
  modelCode: "gpt-x",
  nameDisplay: "GPT X",
  maxOutputTokens: 5_000_000,
  prices: [price],
};
const freeModel = { id: "m-free", modelCode: "free-x", nameDisplay: "Free X", maxOutputTokens: 1000, prices: [price] };
const stationA = { id: "st-a", name: "A", displayName: "Station A", baseUrl: "https://a.example", protocols: ["openai"] };
const stationB = { id: "st-b", name: "B", displayName: "Station B", baseUrl: "https://b.example", protocols: ["openai"] };
const key1 = { id: "k1", weight: 1, keyValue: "sk-k1" };
const key2 = { id: "k2", weight: 1, keyValue: "sk-k2" };
const rule = { billingMode: "PLATFORM" as const, markupRate: 1, tokenMultiplier: 1 };

/** 请求体：40 万字符 → promptEst=10 万 tokens → 预扣 input=200n；max_tokens=5 万 → 预扣 output=400n；合计 600n */
function chatBody(overrides: Record<string, unknown> = {}) {
  return {
    model: "gpt-x",
    messages: [{ role: "user" as const, content: "a".repeat(400_000) }],
    max_tokens: 50_000,
    ...overrides,
  };
}

function stubBase() {
  repoStub.getUsageLogByRequestId.mockResolvedValue(null);
  repoStub.listCustomChannels.mockResolvedValue([]);
  repoStub.findModelByCode.mockResolvedValue(requestedModel);
  repoStub.loadRouteConfig.mockResolvedValue({
    tierMappings: [],
    priorities: [],
    free: [{ modelId: "m-free", quotaTokens: 100_000, refreshCycle: "DAY" }],
  });
  repoStub.getQuotaUsed.mockResolvedValue(0);
  repoStub.findModelsByIds.mockResolvedValue(
    new Map([
      ["m-req", requestedModel],
      ["m-free", freeModel],
    ])
  );
  repoStub.listCallableStations.mockImplementation((_c: unknown, name: string) =>
    Promise.resolve(name === "GPT X" ? [stationA] : [stationB])
  );
  repoStub.getBillingRule.mockResolvedValue(rule);
  repoStub.listActivePackageStations.mockResolvedValue({ stations: [], platformWide: false });
  repoStub.listAvailableKeys.mockImplementation((_c: unknown, stationId: string) =>
    Promise.resolve(stationId === "st-a" ? [key1] : [key2])
  );
  repoStub.findActiveStationUserKey.mockResolvedValue(null);
  repoStub.markKeyFailure.mockResolvedValue(undefined);
  repoStub.markKeySuccess.mockResolvedValue(undefined);
  repoStub.insertUsageLog.mockResolvedValue({});
  repoStub.upsertDailyStat.mockResolvedValue(undefined);
  repoStub.addQuotaUsed.mockResolvedValue(undefined);

  billingStub.hold.mockResolvedValue({ holdId: "h-1", idempotent: false });
  billingStub.captureHold.mockResolvedValue({ capturedMinor: 1n, idempotent: false });
  billingStub.voidHold.mockResolvedValue({ idempotent: false });
}

function okFetchOnce(json: unknown) {
  return new Response(JSON.stringify(json), { status: 200 });
}
function failFetchOnce(status: number, text = "upstream down") {
  return new Response(text, { status });
}

beforeEach(() => {
  vi.clearAllMocks();
  stubBase();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const fetchGlobal = () => globalThis.fetch as unknown as Mock;

// ---------- 编排用例 ----------

describe("gatewayOrchestrator.executeChat（G.3.2）", () => {
  it("PLATFORM 预扣 60n → 上游按实捕获 20n（差额 40n 解冻）+ usage_log 落库", async () => {
    // 上游 usage: prompt 100_000 / completion 0 → 捕获 = 2*1e5/1e4 = 20n
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okFetchOnce({ id: "r1", choices: [{ message: { content: "ok" }, finish_reason: "stop" }], usage: { prompt_tokens: 100_000, completion_tokens: 0 } })
      )
    );

    const result = await gatewayOrchestrator.executeChat("u-1", chatBody(), "req-1");

    // 预扣：input 2*100_000/1e4=20n + output 8*50_000/1e4=40n = 60n
    expect(billingStub.hold).toHaveBeenCalledTimes(1);
    const [holdUserId, holdKey, holdAmount] = billingStub.hold.mock.calls[0] as [string, string, bigint];
    expect(holdUserId).toBe("u-1");
    expect(holdKey).toMatch(/^gw:req-1:a0$/);
    expect(holdAmount).toBe(60n);
    // 按实捕获（同 holdKey）：20n ≤ 60n
    expect(billingStub.captureHold).toHaveBeenCalledWith(holdKey, 20n);
    expect(billingStub.voidHold).not.toHaveBeenCalled();
    expect(repoStub.markKeySuccess).toHaveBeenCalledWith(expect.anything(), "k1");
    expect(repoStub.insertUsageLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        requestId: "req-1",
        userId: "u-1",
        modelId: "m-req",
        stationId: "st-a",
        billingPath: "PLATFORM",
        quotaMinor: 20n,
        promptTokens: 100_000,
        completionTokens: 0,
        statusCode: 200,
        error: null,
      })
    );
    expect(result.meta.quotaMinor).toBe(20n);
    expect(result.response).toMatchObject({ id: "r1" }); // 同格式透传
  });

  it("上游失败：void 预扣 + Key 失败计数 + 降级 free 候选（FREE_QUOTA 记账）", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(failFetchOnce(429, "rate limited"))
        .mockResolvedValueOnce(
          okFetchOnce({ choices: [{ message: { content: "free ok" }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 50 } })
        )
    );

    const result = await gatewayOrchestrator.executeChat("u-1", chatBody(), "req-2");

    expect(billingStub.hold).toHaveBeenCalledTimes(1); // 仅付费候选预扣
    expect(billingStub.voidHold).toHaveBeenCalledTimes(1); // 失败释放
    expect(billingStub.captureHold).not.toHaveBeenCalled(); // free 不扣费
    expect(repoStub.markKeyFailure).toHaveBeenCalledWith(expect.anything(), "k1", expect.any(Date));
    expect(repoStub.markKeySuccess).toHaveBeenCalledWith(expect.anything(), "k2");
    // free 额度记账：100 + 50 = 150 tokens
    expect(repoStub.addQuotaUsed).toHaveBeenCalledWith(expect.anything(), "u-1", "m-free", expect.any(Date), 150);
    expect(repoStub.insertUsageLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ billingPath: "FREE_QUOTA", quotaMinor: 0n, modelId: "m-free" })
    );
    expect(result.meta.billingPath).toBe("FREE_QUOTA");
  });

  it("余额不足 40001：移除付费候选（不再预扣），free 兜底续行", async () => {
    billingStub.hold.mockRejectedValue(new ApiError(ERROR_CODES.INSUFFICIENT_BALANCE, "余额不足"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okFetchOnce({ choices: [{ message: { content: "free ok" }, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 5 } })
      )
    );

    const result = await gatewayOrchestrator.executeChat("u-1", chatBody(), "req-3");

    expect(billingStub.hold).toHaveBeenCalledTimes(1); // 第二候选（free）无 hold
    expect(repoStub.markKeyFailure).not.toHaveBeenCalled(); // 预扣失败非上游故障
    expect(result.meta.billingPath).toBe("FREE_QUOTA");
  });

  it("requestId 重放幂等：已使用 → 40000，上游零调用", async () => {
    repoStub.getUsageLogByRequestId.mockResolvedValue({ id: "log-1", requestId: "req-4" });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(gatewayOrchestrator.executeChat("u-1", chatBody(), "req-4")).rejects.toMatchObject({
      code: ERROR_CODES.BAD_REQUEST,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(billingStub.hold).not.toHaveBeenCalled();
  });

  it("stream=true → 聚合语义：stream_options.include_usage 透传 + isStream=true 落库（流式 MVP）", async () => {
    // 上游回吐 OpenAI 流式末帧（含 usage）：prompt 100_000 / completion 0 → 捕获 20n（与非流式同口径）
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          [
            'data: {"choices":[{"delta":{"role":"assistant","content":""}}]}',
            'data: {"choices":[{"delta":{"content":"ok"}}]}',
            'data: {"choices":[],"usage":{"prompt_tokens":100000,"completion_tokens":0,"total_tokens":100000}}',
            "data: [DONE]",
            "",
          ].join("\n"),
          { status: 200 }
        )
      )
    );

    const result = await gatewayOrchestrator.executeChat("u-1", chatBody({ stream: true }), "req-5");

    // include_usage 强制透传（规格 §2.3.1.1）
    const [, init] = fetchGlobal().mock.calls[0] as [string, RequestInit];
    const sentBody = JSON.parse(String(init.body)) as { stream?: boolean; stream_options?: { include_usage?: boolean } };
    expect(sentBody.stream).toBe(true);
    expect(sentBody.stream_options?.include_usage).toBe(true);
    // 聚合文本 + 按实捕获 + isStream=true 落库（usage_log 审计面）
    expect(billingStub.captureHold).toHaveBeenCalledWith(expect.any(String), 20n);
    expect(repoStub.insertUsageLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ billingPath: "PLATFORM", isStream: true, quotaMinor: 20n })
    );
    // 入口聚合：客户端拿到非流式同形状响应（choices 数组）
    expect((result.response as { choices?: unknown[] }).choices).toHaveLength(1);
  });

  it("全链失败 → 30003 + 失败 usage_log（error 非空）", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(failFetchOnce(500, "boom")));
    // free 额度耗尽：链仅剩付费候选
    repoStub.loadRouteConfig.mockResolvedValue({ tierMappings: [], priorities: [], free: [] });
    repoStub.findModelsByIds.mockResolvedValue(new Map([["m-req", requestedModel]]));

    await expect(gatewayOrchestrator.executeChat("u-1", chatBody(), "req-6")).rejects.toMatchObject({
      code: ERROR_CODES.GATEWAY_ALL_FAILED,
    });
    expect(billingStub.voidHold).toHaveBeenCalledTimes(1); // 预扣释放
    expect(repoStub.insertUsageLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ requestId: "req-6", error: expect.stringContaining("boom"), statusCode: null })
    );
  });

  it("Key 冷却切换：首 Key 失败计数后换次 Key 成功（随机源固定选首个）", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // 恒选剩余池首个
    repoStub.listAvailableKeys.mockResolvedValue([key1, key2]); // 同站双 Key
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(failFetchOnce(502))
        .mockResolvedValueOnce(
          okFetchOnce({ choices: [{ message: { content: "ok" }, finish_reason: "stop" }], usage: { prompt_tokens: 100_000, completion_tokens: 0 } })
        )
    );

    const result = await gatewayOrchestrator.executeChat("u-1", chatBody(), "req-7");

    expect(fetchGlobal()).toHaveBeenCalledTimes(2);
    expect(repoStub.markKeyFailure).toHaveBeenCalledWith(expect.anything(), "k1", expect.any(Date));
    expect(repoStub.markKeySuccess).toHaveBeenCalledWith(expect.anything(), "k2");
    // 两次尝试使用不同幂等键（a0/a1），第二次捕获成功
    expect(billingStub.voidHold).toHaveBeenCalledTimes(1);
    expect(billingStub.captureHold).toHaveBeenCalledTimes(1);
    expect(result.meta.quotaMinor).toBe(20n);
  });

  it("自定义渠道优先：FREE_PROXY 成功不扣费不预扣（响应同格式透传）", async () => {
    const channel = { id: "ch-1", name: "my-relay", baseUrl: "https://relay.example", keyCipher: "sk-relay", format: "OPENAI" as const, isActive: true };
    repoStub.listCustomChannels.mockResolvedValue([channel]);
    const upstreamJson = { id: "r9", choices: [{ message: { content: "relay" }, finish_reason: "stop" }], usage: { prompt_tokens: 8, completion_tokens: 4 } };
    const fetchMock = vi.fn().mockResolvedValue(okFetchOnce(upstreamJson));
    vi.stubGlobal("fetch", fetchMock);

    const result = await gatewayOrchestrator.executeChat("u-1", chatBody(), "req-8");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://relay.example/chat/completions");
    expect(billingStub.hold).not.toHaveBeenCalled();
    expect(repoStub.insertUsageLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ billingPath: "FREE_PROXY", channelId: "ch-1", quotaMinor: 0n })
    );
    expect(result.response).toEqual(upstreamJson); // 同格式透传（Response.json 解析产生新对象，深度相等）
    expect(result.meta.billingPath).toBe("FREE_PROXY");
  });

  it("GW-KEY-01 UPSTREAM 命中：用户自有 Key 直调上游，不扣平台余额（hold/capture/void 零调用），usage_logs=UPSTREAM", async () => {
    repoStub.getBillingRule.mockResolvedValue({ billingMode: "UPSTREAM", markupRate: 1, tokenMultiplier: 1 });
    repoStub.findActiveStationUserKey.mockResolvedValue({
      id: "suk-1",
      userId: "u-1",
      stationId: "st-a",
      keyCipher: "v1:iv:tag:ct",
      isActive: true,
    });
    const upstreamJson = { id: "r-u", choices: [{ message: { content: "own-key" }, finish_reason: "stop" }], usage: { prompt_tokens: 8, completion_tokens: 4 } };
    const fetchMock = vi.fn().mockResolvedValue(okFetchOnce(upstreamJson));
    vi.stubGlobal("fetch", fetchMock);

    const result = await gatewayOrchestrator.executeChat("u-1", chatBody(), "req-9");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://a.example/chat/completions");
    // 解密发生在调上游前；日志/响应不回明文；headers 在 safeFetch 内为 Headers 实例
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer sk-decrypted-v1:iv:tag:ct");
    // wallet/ledger 逐分不变：预扣/捕获/作废三原语零触达
    expect(billingStub.hold).not.toHaveBeenCalled();
    expect(billingStub.captureHold).not.toHaveBeenCalled();
    expect(billingStub.voidHold).not.toHaveBeenCalled();
    // 仍写用量：billingPath=UPSTREAM、quotaMinor=0n
    expect(repoStub.insertUsageLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ billingPath: "UPSTREAM", stationId: "st-a", quotaMinor: 0n, promptTokens: 8, completionTokens: 4 })
    );
    expect(result.meta.billingPath).toBe("UPSTREAM");
    expect(result.meta.quotaMinor).toBe(0n);
    expect(result.response).toEqual(upstreamJson);
  });

  it("GW-KEY-01 UPSTREAM 无有效自有 Key → 跳过候选走既有降级序（全链败 30003、fetch 未触达、hold 未预扣）", async () => {
    repoStub.getBillingRule.mockResolvedValue({ billingMode: "UPSTREAM", markupRate: 1, tokenMultiplier: 1 });
    repoStub.loadRouteConfig.mockResolvedValue({ tierMappings: [], priorities: [], free: [] });
    repoStub.findModelsByIds.mockResolvedValue(new Map([["m-req", requestedModel]]));
    // findActiveStationUserKey 默认 null（stubBase）
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(gatewayOrchestrator.executeChat("u-1", chatBody(), "req-9")).rejects.toMatchObject({
      code: ERROR_CODES.GATEWAY_ALL_FAILED,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(billingStub.hold).not.toHaveBeenCalled();
  });

  it("GW-KEY-01 UPSTREAM 用户 Key 上游失败 → 不扣费，续降级至 FREE 兜底成功（FREE_QUOTA）", async () => {
    repoStub.getBillingRule.mockImplementation((_c: unknown, stationId: string) =>
      Promise.resolve(stationId === "st-a" ? { billingMode: "UPSTREAM", markupRate: 1, tokenMultiplier: 1 } : rule)
    );
    repoStub.findActiveStationUserKey.mockResolvedValue({ id: "suk-1", keyCipher: "v1:x", isActive: true });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(failFetchOnce(502))
        .mockResolvedValueOnce(
          okFetchOnce({ choices: [{ message: { content: "free-ok" }, finish_reason: "stop" }], usage: { prompt_tokens: 5, completion_tokens: 3 } })
        )
    );

    const result = await gatewayOrchestrator.executeChat("u-1", chatBody(), "req-11");

    // UPSTREAM 失败不扣费；FREE 兜底免扣——billing 全程零触达
    expect(billingStub.hold).not.toHaveBeenCalled();
    expect(billingStub.captureHold).not.toHaveBeenCalled();
    expect(billingStub.voidHold).not.toHaveBeenCalled();
    // 终态 usage_logs 单条制：仅 FREE_QUOTA 成功行（UPSTREAM 失败不落用量行）
    expect(repoStub.insertUsageLog).toHaveBeenCalledTimes(1);
    expect(repoStub.insertUsageLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ billingPath: "FREE_QUOTA", stationId: "st-b" })
    );
    expect(result.meta.billingPath).toBe("FREE_QUOTA");
  });

  it("GW-KEY-01 UPSTREAM + stream=true → 跳过该候选（流式属二期），降级链聚合路径成功", async () => {
    repoStub.getBillingRule.mockImplementation((_c: unknown, stationId: string) =>
      Promise.resolve(stationId === "st-a" ? { billingMode: "UPSTREAM", markupRate: 1, tokenMultiplier: 1 } : rule)
    );
    repoStub.findActiveStationUserKey.mockResolvedValue({ id: "suk-1", keyCipher: "v1:x", isActive: true });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(['data: {"choices":[{"delta":{"content":"free-s"}}]}', "data: [DONE]", ""].join("\n"), { status: 200 })
      )
    );

    const result = await gatewayOrchestrator.executeChat("u-1", chatBody({ stream: true }), "req-12");

    expect(result.meta.billingPath).toBe("FREE_QUOTA");
    expect(billingStub.hold).not.toHaveBeenCalled();
  });

  it("stream=true 尾帧 usage 缺失 → 按估算 tokens 保守 capture（规格 §2.3.1.1 防漏记）", async () => {
    // 上游流式回吐仅 content 增量，无 usage 末帧：prompt 400_000 ASCII/4=100_000；
    // completion=max_tokens 50_000 → 预扣 60n、估算捕获 2*1e5/1e4 + 8*5e4/1e4 = 60n（与预扣同式）
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          ['data: {"choices":[{"delta":{"content":"partial"}}]}', "data: [DONE]", ""].join("\n"),
          { status: 200 }
        )
      )
    );

    const result = await gatewayOrchestrator.executeChat("u-1", chatBody({ stream: true }), "req-10");

    expect(billingStub.captureHold).toHaveBeenCalledWith(expect.any(String), 60n);
    expect(repoStub.insertUsageLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ isStream: true, billingPath: "PLATFORM", quotaMinor: 60n, promptTokens: 100_000, completionTokens: 50_000 })
    );
    expect((result.response as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content).toBe("partial");
  });
});

// ---------- #26 billingExempt：评估域调用网关不计费 ----------

describe("#26 billingExempt：评估域调用网关 PLATFORM 路径免扣费", () => {
  it("billingExempt=true → 不 hold/capture/void，usage_log quotaMinor=0n billingPath=PLATFORM", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okFetchOnce({ object: "chat.completion", choices: [{ message: { content: "ok" } }] })));
    const result = await gatewayOrchestrator.executeChat(
      "u-1",
      { model: "gpt-x", messages: [{ role: "user", content: "hi" }], max_tokens: 16 },
      "eval:ev-x:m-1",
      new Date(),
      { billingExempt: true }
    );
    expect(result.meta.billingPath).toBe("PLATFORM");
    expect(result.meta.quotaMinor).toBe(0n);
    expect(billingStub.hold).not.toHaveBeenCalled();
    expect(billingStub.captureHold).not.toHaveBeenCalled();
    expect(billingStub.voidHold).not.toHaveBeenCalled();
    expect(repoStub.insertUsageLog).toHaveBeenCalledOnce();
    const logArg = repoStub.insertUsageLog.mock.calls[0][1];
    expect(logArg.quotaMinor).toBe(0n);
    expect(logArg.billingPath).toBe("PLATFORM");
    expect(logArg.error).toBeNull();
  });

  it("billingExempt 缺省（正常网关调用）→ 正常 hold（计费交互发生）", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okFetchOnce({ object: "chat.completion", choices: [{ message: { content: "ok" } }] })));
    await gatewayOrchestrator.executeChat(
      "u-1",
      chatBody({ model: "gpt-x" }),
      "gw:normal-1"
    );
    // billingExempt 缺省 → hold 必发生（capture/void 取决于实算 quotaMinor，此处只断言计费交互存在）
    expect(billingStub.hold).toHaveBeenCalledOnce();
  });
});

// ---------- 纯函数直测 ----------

describe("pickKeyWeighted / estimatePrepayMinor / upstreamFormatOfStation", () => {
  it("pickKeyWeighted：注入随机源确定可测；空池/全零权重 → null", () => {
    const keys = [
      { id: "a", weight: 1 },
      { id: "b", weight: 3 },
    ];
    expect(pickKeyWeighted(keys, () => 0)).toMatchObject({ id: "a" });
    expect(pickKeyWeighted(keys, () => 0.99)).toMatchObject({ id: "b" });
    expect(pickKeyWeighted([], () => 0)).toBeNull();
    expect(pickKeyWeighted([{ id: "a", weight: 0 }], () => 0.5)).toBeNull();
  });

  it("estimatePrepayMinor：输入含 system、输出 clamp maxOutputTokens、无价 → 0n", () => {
    // 400_000 chars → prompt 100_000 tokens → 2*1e5/1e4=20n；max_tokens 50_000 → 8*5e4/1e4=40n；合计 60n
    expect(estimatePrepayMinor(requestedModel, chatBody(), rule)).toBe(60n);
    // clamp：maxOutputTokens=1000 < max_tokens → 20n + round(8*1000/1e4)=1n = 21n
    expect(estimatePrepayMinor(freeModel, chatBody(), rule)).toBe(21n);
    // 无当期价 → 0n（调用方最小预扣 1n 兜底）
    expect(estimatePrepayMinor({ ...requestedModel, prices: [] }, chatBody(), rule)).toBe(0n);
  });

  it("estimatePrepayMinor：Anthropic 形态顶层 system 计入输入估算", () => {
    const body = { model: "m", messages: [{ role: "user" as const, content: "a".repeat(200_000) }], max_tokens: 50_000, system: "b".repeat(200_000) };
    // (200_000 + 200_000)/4 = 100_000 tokens → input 20n；output 40n；合计 60n
    expect(estimatePrepayMinor(requestedModel, body, rule)).toBe(60n);
  });

  it("estimatePrepayMinor：非 ASCII（CJK）字符按全 token 加权，预扣不被低估", () => {
    // 50_000 个中文字符（非 ASCII 权重 4）→ 50_000 tokens；output 40n → input 2*5e4/1e4=10n + 40n = 50n
    const cjk = "中".repeat(50_000);
    const body = { model: "m", messages: [{ role: "user" as const, content: cjk }], max_tokens: 50_000 };
    // 旧口径 50_000/4=12_500 → 2.5n，实际消耗（≈1 token/字）将远超预扣——回归守卫
    expect(estimatePrepayMinor(requestedModel, body, rule)).toBe(50n);
    // 混合文本：25_000 ASCII + 25_000 CJK → (25_000 + 100_000)/4 = 31_250 → input 6.25n→7n？实为 floor(2N+D)/2D=round(6.25)=6n + 40n = 46n
    const mixed = "a".repeat(25_000) + "中".repeat(25_000);
    const mixedBody = { model: "m", messages: [{ role: "user" as const, content: mixed }], max_tokens: 50_000 };
    expect(estimatePrepayMinor(requestedModel, mixedBody, rule)).toBe(46n);
  });

  it("upstreamFormatOfStation：protocols 含 anthropic → anthropic；否则 openai 缺省", () => {
    expect(upstreamFormatOfStation(["OpenAI", "anthropic"])).toBe("anthropic");
    expect(upstreamFormatOfStation(["openai"])).toBe("openai");
    expect(upstreamFormatOfStation([])).toBe("openai");
    expect(upstreamFormatOfStation(null)).toBe("openai");
  });
});

// ---------- WP-BE02：cached/reasoning 提取 + UsageDailyStat 沉淀 ----------

describe("WP-BE02 用量沉淀与细粒度 token", () => {
  it("非流式：OpenAI details cached/reasoning 落库 + usage_daily_stats 沉淀（quotaMinor 同源）", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okFetchOnce({
          id: "r1",
          choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
          usage: {
            prompt_tokens: 100_000,
            completion_tokens: 0,
            prompt_tokens_details: { cached_tokens: 60_000 },
            completion_tokens_details: { reasoning_tokens: 0 },
          },
        })
      )
    );

    await gatewayOrchestrator.executeChat("u-1", chatBody(), "req-w1");

    expect(repoStub.insertUsageLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ cachedTokens: 60_000, reasoningTokens: 0, billingPath: "PLATFORM" })
    );
    expect(repoStub.upsertDailyStat).toHaveBeenCalledTimes(1);
    const statCall = (repoStub.upsertDailyStat.mock.calls as Array<[unknown, Record<string, unknown>]>)[0][1];
    expect(statCall).toMatchObject({ userId: "u-1", model: "gpt-x", promptTokens: 100_000 });
    expect(statCall.quotaMinor).toBe(20n); // 与 capture 同口径
    expect(statCall.day).toBeInstanceOf(Date);
  });

  it("渠道 FREE_PROXY 成功：免扣仍落 usage_log（cached/reasoning）+ 日沉淀 quotaMinor=0n", async () => {
    repoStub.listCustomChannels.mockResolvedValue([
      { id: "ch-1", name: "我的渠道", baseUrl: "https://ch.example", format: "OPENAI", isActive: true, keyCipher: "sk-ch" },
    ]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okFetchOnce({
          id: "r2",
          choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 5, prompt_cache_hit_tokens: 4 },
        })
      )
    );

    const result = await gatewayOrchestrator.executeChat("u-1", chatBody(), "req-w2");

    expect(result.meta.billingPath).toBe("FREE_PROXY");
    expect(repoStub.insertUsageLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ billingPath: "FREE_PROXY", cachedTokens: 4, quotaMinor: 0n })
    );
    expect(repoStub.upsertDailyStat).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: "u-1", model: "gpt-x", quotaMinor: 0n })
    );
  });

  it("全链失败 30003：不沉淀日汇总（失败请求不进成功口径聚合）", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(failFetchOnce(500)));
    await expect(gatewayOrchestrator.executeChat("u-1", chatBody(), "req-w3")).rejects.toThrow();
    expect(repoStub.insertUsageLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ error: expect.any(String), quotaMinor: 0n })
    );
    expect(repoStub.upsertDailyStat).not.toHaveBeenCalled();
  });

  it("WP-BE02 PACKAGE 套餐直连：站点被生效套餐覆盖 → 免扣（无 hold/capture）仍写 usage_log + 日沉淀 0n", async () => {
    repoStub.listActivePackageStations.mockResolvedValue({ stations: ["st-a"], platformWide: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okFetchOnce({ id: "r3", choices: [{ message: { content: "pkg" }, finish_reason: "stop" }], usage: { prompt_tokens: 100_000, completion_tokens: 0 } })
      )
    );

    const result = await gatewayOrchestrator.executeChat("u-1", chatBody(), "req-w4");

    expect(billingStub.hold).not.toHaveBeenCalled();
    expect(billingStub.captureHold).not.toHaveBeenCalled();
    expect(repoStub.insertUsageLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ billingPath: "PACKAGE", stationId: "st-a", quotaMinor: 0n, statusCode: 200 })
    );
    expect(repoStub.upsertDailyStat).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: "u-1", model: "gpt-x", quotaMinor: 0n })
    );
    expect(result.meta.billingPath).toBe("PACKAGE");
    expect(result.response).toMatchObject({ id: "r3" }); // 同格式透传
  });

  it("WP-BE02 PACKAGE 平台通用套餐（stationId=null）覆盖全部站点 → 免扣直连", async () => {
    repoStub.listActivePackageStations.mockResolvedValue({ stations: [], platformWide: true });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okFetchOnce({ choices: [{ message: { content: "ok" }, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 5 } })
      )
    );

    const result = await gatewayOrchestrator.executeChat("u-1", chatBody(), "req-w5");

    expect(billingStub.hold).not.toHaveBeenCalled();
    expect(billingStub.captureHold).not.toHaveBeenCalled();
    expect(result.meta.billingPath).toBe("PACKAGE");
  });
});
