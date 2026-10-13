/**
 * gateway 流式透传（二期）单测：规格 v0.2 §2-§4 验收。
 *
 * 覆盖三条不破账红线 + 正常路径：
 *   1) 正常流：hold 恰一次冻结 → CAPTURING 标记 hold → 尾帧 usage 实扣 capture → finalize OK；
 *   2) 尾帧 usage 缺失：按已产出 tokens 估算保守 capture → finalize ESTIMATED；
 *   3) 客户端断连（AbortError）：仍按已产出 capture 终态化 → finalize ABORTED，不留孤儿 hold；
 *   4) usage_log 恰一条（requestId 幂等）。
 * 策略：vi.mock repository/billing（stub 组）+ ReadableStream 构造 mock SSE 上游；
 * PASSTHROUGH_ENABLED 由 vi.mock service 模块常量置 true（开关默认 false，聚合 MVP 为现行路径）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// S1 后 safeFetch 在连接前做真实 DNS；stub 环境统一将解析 mock 为公网地址。
vi.mock("node:dns/promises", () => ({
  lookup: async () => [{ address: "93.184.216.34", family: 4 }],
}));

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
      markKeyFailure: mk(),
      markKeySuccess: mk(),
      insertUsageLog: mk(),
      finalizeStreamUsageLog: mk(),
      upsertDailyStat: mk(),
      addQuotaUsed: mk(),
    },
    billingStub: { hold: mk(), captureHold: mk(), voidHold: mk() },
  };
});

const { envFlag } = vi.hoisted(() => {
  // 二期开关经环境变量注入（PASSTHROUGH_ENABLED 模块加载时求值），
  // hoisted 块先于全部 import 执行，保证 service 读到 true
  process.env.AIDEAN_GATEWAY_STREAM_PASSTHROUGH = "1";
  return { envFlag: process.env.AIDEAN_GATEWAY_STREAM_PASSTHROUGH };
});
void envFlag;

vi.mock("../repository", () => ({ gatewayRepository: repoStub }));
vi.mock("../../billing/service", () => ({ billingService: billingStub }));
vi.mock("../../db/prisma", () => ({ prisma: {} }));

import { gatewayOrchestrator } from "../service";

// ---------- 公共夹具 ----------

const price = { priceInput: "2", priceOutput: "8", billingCurrency: "CNY" };
const requestedModel = {
  id: "m-req",
  modelCode: "gpt-x",
  nameDisplay: "GPT X",
  maxOutputTokens: 5_000_000,
  prices: [price],
};
const stationA = { id: "st-a", name: "A", displayName: "Station A", baseUrl: "https://a.example", protocols: ["openai"] };
const key1 = { id: "k1", weight: 1, keyValue: "sk-k1" };
const rule = { billingMode: "PLATFORM" as const, markupRate: 1, tokenMultiplier: 1 };

function chatBody(overrides: Record<string, unknown> = {}) {
  return {
    model: "gpt-x",
    messages: [{ role: "user" as const, content: "hello" }],
    max_tokens: 100,
    stream: true,
    ...overrides,
  };
}

function sseResponse(frames: string[], status = 200): Response {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        for (const frame of frames) controller.enqueue(encoder.encode(frame));
        controller.close();
      },
    }),
    { status, headers: { "content-type": "text/event-stream" } }
  );
}

/** OpenAI SSE 帧（delta 增量 + 末帧 usage） */
const OPENAI_FRAMES_USAGE = [
  'data: {"choices":[{"delta":{"role":"assistant","content":"he"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"llo"}}]}\n\n',
  'data: {"choices":[],"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}\n\n',
  "data: [DONE]\n\n",
];
/** OpenAI SSE 帧（无 usage 末帧） */
const OPENAI_FRAMES_NO_USAGE = ['data: {"choices":[{"delta":{"content":"world"}}]}\n\n', "data: [DONE]\n\n"];

function stubBase(): void {
  repoStub.getUsageLogByRequestId.mockResolvedValue(null);
  repoStub.listCustomChannels.mockResolvedValue([]);
  repoStub.findModelByCode.mockResolvedValue(requestedModel);
  repoStub.loadRouteConfig.mockResolvedValue({ tierMappings: [], priorities: [], free: [] });
  repoStub.findModelsByIds.mockResolvedValue(new Map([["m-req", requestedModel]]));
  repoStub.listCallableStations.mockResolvedValue([stationA]);
  repoStub.getBillingRule.mockResolvedValue(rule);
  repoStub.listActivePackageStations.mockResolvedValue({ stations: [], platformWide: false });
  repoStub.listAvailableKeys.mockResolvedValue([key1]);
  repoStub.markKeySuccess.mockResolvedValue(undefined);
  repoStub.markKeyFailure.mockResolvedValue(undefined);
  repoStub.insertUsageLog.mockResolvedValue({ id: "log-1" });
  repoStub.finalizeStreamUsageLog.mockResolvedValue(undefined);
  repoStub.upsertDailyStat.mockResolvedValue(undefined);
  repoStub.addQuotaUsed.mockResolvedValue(undefined);
  billingStub.hold.mockResolvedValue({ holdId: "h-1", idempotent: false });
  billingStub.captureHold.mockResolvedValue({ capturedMinor: 1n, idempotent: false });
  billingStub.voidHold.mockResolvedValue({ idempotent: false });
}

beforeEach(() => {
  vi.clearAllMocks();
  stubBase();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("stream-passthrough（规格 v0.2 二期红线）", () => {
  it("① 正常流：SSE 透传 + 尾帧 usage 实扣 + finalize OK + usage_log 恰一条", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sseResponse(OPENAI_FRAMES_USAGE)));

    const result = await gatewayOrchestrator.executeChat("u-1", chatBody(), "req-p1");
    const response = result.response as Response;

    // 先消费完流体（ReadableStream pull 惰性：读完才触发 done → settle 终态化）
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(response.body).toBeTruthy();
    const text = await response.text();
    expect(text).toContain('"content":"he"');
    expect(text).toContain('"content":"llo"');

    // hold：主预扣 + CAPTURING 标记（:stream-final 1 分兜底）各一次
    const holdCalls = billingStub.hold.mock.calls as Array<[string, string, bigint]>;
    expect(holdCalls).toHaveLength(2);
    expect(holdCalls[0][2]).toBeGreaterThan(0n);
    expect(holdCalls[1][1]).toMatch(/:stream-final$/);
    expect(holdCalls[1][2]).toBe(1n);
    // 计量：尾帧 usage 10/5 → capture = 2*10/1e4 + 8*5/1e4 = 0.002+0.004 分 → 0n → void 路径
    // （mock 价下微量消耗走 void；断言终态化恰一次且无二次 capture）
    expect(billingStub.captureHold).not.toHaveBeenCalled();
    expect(billingStub.voidHold).toHaveBeenCalledWith(expect.stringMatching(/:stream-final$/));
    // usage_log：insert 恰一条（requestId 幂等）+ finalize 回填 OK
    expect(repoStub.insertUsageLog).toHaveBeenCalledTimes(1);
    expect(repoStub.insertUsageLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ requestId: "req-p1", isStream: true })
    );
    expect(repoStub.finalizeStreamUsageLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ requestId: "req-p1", promptTokens: 10, completionTokens: 5, usageKnown: true, aborted: false })
    );
    // WP-BE02：流式成功路径同样沉淀日汇总
    expect(repoStub.upsertDailyStat).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: "u-1", model: "gpt-x", promptTokens: 10, completionTokens: 5 })
    );
  });

  it("② 尾帧 usage 缺失 → 按已产出估算保守 capture + finalize ESTIMATED（防漏记）", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sseResponse(OPENAI_FRAMES_NO_USAGE)));

    const result = await gatewayOrchestrator.executeChat("u-1", chatBody(), "req-p2");
    // 消费完流才触发 settle（pull 惰性）
    await (result.response as Response).text();

    // 已产出 "world" 5 字符 → 5 completion tokens → capture = 8*5/1e4 → 微量 0n → void 终态
    // 关键断言：finalize usageKnown=false（ESTIMATED 口径），未因缺 usage 丢弃账面
    expect(repoStub.finalizeStreamUsageLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ requestId: "req-p2", completionTokens: 5, usageKnown: false })
    );
    expect(billingStub.captureHold).not.toHaveBeenCalled();
  });

  it("②b 末帧 usage 不带 \\n（buffer 残留）→ settle flush 补解析，finalize OK 非 ESTIMATED（R1 回归）", async () => {
    // 末帧 data 无换行收尾：push 的 split("\n") 使其滞留 buffer——settle 必须先 flush
    // 再判 usage，否则尾帧 usage 丢失走 ESTIMATED 虚高估算（与聚合版循环外 flush 同类缺陷）
    const frames = [...OPENAI_FRAMES_NO_USAGE.slice(0, -1), 'data: {"usage":{"prompt_tokens":2,"completion_tokens":3}}'];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sseResponse(frames)));

    const result = await gatewayOrchestrator.executeChat("u-1", chatBody(), "req-p2b");
    await (result.response as Response).text();

    expect(repoStub.finalizeStreamUsageLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        requestId: "req-p2b",
        promptTokens: 2,
        completionTokens: 3,
        usageKnown: true, // OK 口径（实扣），非 ESTIMATED
        aborted: false,
      })
    );
  });

  it("③ 客户端断连（流中断）→ 仍终态化 + finalize ABORTED，不留孤儿 hold", async () => {
    // 上游流中途抛错（模拟断连/网络中断）
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              const encoder = new TextEncoder();
              controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'));
              controller.error(new Error("client aborted"));
            },
          }),
          { status: 200, headers: { "content-type": "text/event-stream" } }
        )
      )
    );

    const result = await gatewayOrchestrator.executeChat("u-1", chatBody(), "req-p3");
    const response = result.response as Response;

    // 读流触发中断路径：settle(true) 必达——断言 finalize ABORTED + 标记 hold 已解（无孤儿）
    await expect(response.text()).rejects.toThrow();
    expect(repoStub.finalizeStreamUsageLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ requestId: "req-p3", aborted: true })
    );
    expect(billingStub.voidHold).toHaveBeenCalledWith(expect.stringMatching(/:stream-final$/));
  });

  it("③b WP-BE02 PACKAGE 套餐直连流式：免扣（无主预扣、无 capture）仍 finalize + 日沉淀 0n", async () => {
    repoStub.listActivePackageStations.mockResolvedValue({ stations: ["st-a"], platformWide: false });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sseResponse(OPENAI_FRAMES_USAGE)));

    const result = await gatewayOrchestrator.executeChat("u-1", chatBody(), "req-p4");
    await (result.response as Response).text();

    // 免扣：仅 :stream-final 1 分标记 hold（无主预扣），且无捕获
    const holdCalls = billingStub.hold.mock.calls as Array<[string, string, bigint]>;
    expect(holdCalls).toHaveLength(1);
    expect(holdCalls[0][1]).toMatch(/:stream-final$/);
    expect(billingStub.captureHold).not.toHaveBeenCalled();
    expect(repoStub.insertUsageLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ billingPath: "PACKAGE", stationId: "st-a", isStream: true })
    );
    expect(repoStub.finalizeStreamUsageLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ requestId: "req-p4", promptTokens: 10, completionTokens: 5 })
    );
    expect(repoStub.upsertDailyStat).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: "u-1", model: "gpt-x", quotaMinor: 0n })
    );
    expect(result.meta.billingPath).toBe("PACKAGE");
  });
});
