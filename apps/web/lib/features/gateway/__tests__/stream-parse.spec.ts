/**
 * stream-parse 单测（WP-FE01 §控制台链路：流式增量 / 聚合回退 / 用量归一 / 错误码引导）。
 *
 * 帧样本取自现网 mock 上游 `app/api/v1/mock-upstream/[...path]/route.ts` 的真实回放格式
 * （OpenAI delta + usage 末帧 + [DONE]；Anthropic message_start → content_block_delta → message_delta → message_stop），
 * 保证「前端解析口径 == 服务端期望上游格式」。
 */
import { describe, expect, it } from "vitest";

import {
  billingPathLabel,
  createStreamAccumulator,
  gatewayErrorHint,
  isSseResponse,
  minorToYuan,
  parseAggregatedBody,
  parseStreamEvent,
} from "../stream-parse";

const frame = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;

describe("parseStreamEvent / OpenAI", () => {
  it("首帧 role-only 无增量，次帧产出文本增量", () => {
    expect(parseStreamEvent("openai", JSON.stringify({ choices: [{ delta: { role: "assistant", content: "" } }] }))).toEqual({
      delta: "",
    });
    expect(parseStreamEvent("openai", JSON.stringify({ choices: [{ delta: { content: "你好" } }] }))).toEqual({
      delta: "你好",
    });
  });

  it("末帧 choices 为空但携带 usage → 归一 prompt/completion", () => {
    const event = parseStreamEvent(
      "openai",
      JSON.stringify({
        choices: [],
        usage: { prompt_tokens: 11, completion_tokens: 5, total_tokens: 16 },
      })
    );
    expect(event).toEqual({ delta: "", usage: { promptTokens: 11, completionTokens: 5 } });
  });

  it("[DONE] → stop 哨兵；空行/非 JSON → null（不阻断整条流）", () => {
    expect(parseStreamEvent("openai", "[DONE]")).toEqual({ delta: "", stop: true });
    expect(parseStreamEvent("openai", "   ")).toBeNull();
    expect(parseStreamEvent("openai", "{not-json")).toBeNull();
  });
});

describe("parseStreamEvent / Anthropic", () => {
  it("message_start 带输入用量", () => {
    const event = parseStreamEvent(
      "anthropic",
      JSON.stringify({ type: "message_start", message: { usage: { input_tokens: 42, output_tokens: 0 } } })
    );
    expect(event?.usage).toEqual({ promptTokens: 42, completionTokens: 0 });
  });

  it("content_block_delta 产出文本增量", () => {
    expect(
      parseStreamEvent("anthropic", JSON.stringify({ type: "content_block_delta", delta: { text: "片段" } }))
    ).toEqual({ delta: "片段" });
  });

  it("message_delta 仅带 output_tokens 时 input 侧以 NaN 表示「未携带」", () => {
    const event = parseStreamEvent(
      "anthropic",
      JSON.stringify({ type: "message_delta", usage: { output_tokens: 7 } })
    );
    expect(event?.usage?.completionTokens).toBe(7);
    expect(Number.isNaN(event?.usage?.promptTokens)).toBe(true);
  });

  it("message_stop → stop 哨兵", () => {
    expect(parseStreamEvent("anthropic", JSON.stringify({ type: "message_stop" }))).toEqual({
      delta: "",
      stop: true,
    });
  });
});

describe("createStreamAccumulator", () => {
  it("OpenAI 全流：文本拼接 + 末帧 usage 归一 + stopped 标记", () => {
    const acc = createStreamAccumulator("openai");
    const push = (s: string) => acc.push(s);
    push(frame({ choices: [{ delta: { role: "assistant", content: "" } }] }));
    push(frame({ choices: [{ delta: { content: "Mock upstream reply" } }] }));
    push(frame({ choices: [], usage: { prompt_tokens: 11, completion_tokens: 5, total_tokens: 16 } }));
    push("data: [DONE]\n\n");
    acc.finish();

    expect(acc.snapshot()).toEqual({
      text: "Mock upstream reply",
      promptTokens: 11,
      completionTokens: 5,
      stopped: true,
      frames: 4,
    });
    expect(acc.hasUsage()).toBe(true);
  });

  it("跨 chunk 切断的帧可被半行缓冲正确重组（网络分片无关性）", () => {
    const acc = createStreamAccumulator("openai");
    const whole = frame({ choices: [{ delta: { content: "跨切片文本" } }] });
    const cut = 17;
    acc.push(whole.slice(0, cut));
    expect(acc.snapshot().text).toBe("");
    acc.push(whole.slice(cut));
    acc.finish();
    expect(acc.snapshot().text).toBe("跨切片文本");
  });

  it("Anthropic 全流：message_delta 的 output 覆盖，input 沿用 message_start", () => {
    const acc = createStreamAccumulator("anthropic");
    acc.push(frame({ type: "message_start", message: { usage: { input_tokens: 42, output_tokens: 0 } } }));
    acc.push(frame({ type: "content_block_delta", delta: { text: "A" } }));
    acc.push(frame({ type: "content_block_delta", delta: { text: "B" } }));
    acc.push(frame({ type: "message_delta", usage: { output_tokens: 5 } }));
    acc.push(frame({ type: "message_stop" }));
    acc.finish();

    expect(acc.snapshot()).toEqual({
      text: "AB",
      promptTokens: 42,
      completionTokens: 5,
      stopped: true,
      frames: 5,
    });
  });

  it("abort 场景（尾帧缺失、无 DONE）：stopped=false 且 hasUsage=false，供 UI 提示「用量待结算」", () => {
    const acc = createStreamAccumulator("openai");
    acc.push(frame({ choices: [{ delta: { content: "半截" } }] }));
    acc.push(frame({ choices: [], usage: undefined }));
    acc.finish();
    const snap = acc.snapshot();
    expect(snap.text).toBe("半截");
    expect(snap.stopped).toBe(false);
    expect(acc.hasUsage()).toBe(false);
  });

  it("末片无换行（buffer 残留尾行）在 finish() 补解析，不丢末帧 usage", () => {
    const acc = createStreamAccumulator("openai");
    acc.push(frame({ choices: [{ delta: { content: "x" } }] }));
    acc.push('data: {"choices":[],"usage":{"prompt_tokens":3,"completion_tokens":4}}'); // 无 \n\n
    expect(acc.hasUsage()).toBe(false); // 未 finish 前仍悬在半行缓冲
    acc.finish();
    expect(acc.snapshot().promptTokens).toBe(3);
    expect(acc.snapshot().completionTokens).toBe(4);
  });
});

describe("parseAggregatedBody（默认聚合路径）", () => {
  it("OpenAI 聚合体 → choices[0].message.content + usage", () => {
    const body = {
      id: "agg-1",
      object: "chat.completion",
      choices: [{ index: 0, message: { role: "assistant", content: "Mock upstream reply" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 11, completion_tokens: 5, total_tokens: 16 },
    };
    expect(parseAggregatedBody("openai", body)).toEqual({
      text: "Mock upstream reply",
      usage: { promptTokens: 11, completionTokens: 5 },
    });
  });

  it("Anthropic 聚合体 → content[].text 拼接 + input/output 命名兼容", () => {
    const body = {
      id: "mock-1",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: "前半" }, { type: "text", text: "后半" }],
      usage: { input_tokens: 9, output_tokens: 6 },
    };
    expect(parseAggregatedBody("anthropic", body)).toEqual({
      text: "前半后半",
      usage: { promptTokens: 9, completionTokens: 6 },
    });
  });

  it("非对象/无 usage → 空文本 + null 用量（UI 走「用量以流水为准」提示）", () => {
    expect(parseAggregatedBody("openai", null)).toEqual({ text: "", usage: null });
    expect(parseAggregatedBody("openai", { choices: [] })).toEqual({ text: "", usage: null });
  });
});

describe("缓存命中 / 推理 tokens 明细（与 @aidean/shared NormalizedUsage 口径对齐）", () => {
  it("OpenAI prompt_tokens_details.cached_tokens + completion_tokens_details.reasoning_tokens", () => {
    const event = parseStreamEvent(
      "openai",
      JSON.stringify({
        choices: [],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 40,
          prompt_tokens_details: { cached_tokens: 64 },
          completion_tokens_details: { reasoning_tokens: 12 },
        },
      })
    );
    expect(event?.usage).toEqual({
      promptTokens: 100,
      completionTokens: 40,
      cachedTokens: 64,
      reasoningTokens: 12,
    });
  });

  it("DeepSeek 兼容 prompt_cache_hit_tokens 作为 cached 兜底命名", () => {
    const event = parseStreamEvent(
      "openai",
      JSON.stringify({ choices: [], usage: { prompt_tokens: 20, completion_tokens: 5, prompt_cache_hit_tokens: 8 } })
    );
    expect(event?.usage).toEqual({ promptTokens: 20, completionTokens: 5, cachedTokens: 8 });
    // reasoning 缺失 → 键不应存在（避免污染归一形状）
    expect(event?.usage && "reasoningTokens" in event.usage).toBe(false);
  });

  it("Anthropic cache_read_input_tokens 映射到 cachedTokens，且无 reasoning 口径", () => {
    const event = parseStreamEvent(
      "anthropic",
      JSON.stringify({
        type: "message_start",
        message: { usage: { input_tokens: 30, output_tokens: 0, cache_read_input_tokens: 10 } },
      })
    );
    expect(event?.usage).toEqual({ promptTokens: 30, completionTokens: 0, cachedTokens: 10 });
    expect(event?.usage && "reasoningTokens" in event.usage).toBe(false);
  });

  it("累加器 snapshot 透传明细字段", () => {
    const acc = createStreamAccumulator("openai");
    acc.push(
      frame({
        choices: [],
        usage: {
          prompt_tokens: 7,
          completion_tokens: 3,
          prompt_tokens_details: { cached_tokens: 2 },
          completion_tokens_details: { reasoning_tokens: 1 },
        },
      })
    );
    acc.finish();
    const snap = acc.snapshot();
    expect(snap.cachedTokens).toBe(2);
    expect(snap.reasoningTokens).toBe(1);
  });

  it("聚合体同口径解析明细字段", () => {
    const parsed = parseAggregatedBody("openai", {
      choices: [{ message: { content: "ok" } }],
      usage: {
        prompt_tokens: 9,
        completion_tokens: 4,
        prompt_tokens_details: { cached_tokens: 5 },
      },
    });
    expect(parsed.text).toBe("ok");
    expect(parsed.usage).toEqual({ promptTokens: 9, completionTokens: 4, cachedTokens: 5 });
  });
});

describe("响应分支判别与展示口径", () => {
  it("isSseResponse 只认 text/event-stream（含 charset 后缀）", () => {
    expect(isSseResponse("text/event-stream")).toBe(true);
    expect(isSseResponse("text/event-stream; charset=utf-8")).toBe(true);
    expect(isSseResponse("application/json")).toBe(false);
    expect(isSseResponse(null)).toBe(false);
  });

  it("minorToYuan：分→元两位小数，非法值回退 0.00", () => {
    expect(minorToYuan(0)).toBe("0.00");
    expect(minorToYuan(165)).toBe("1.65");
    expect(minorToYuan(55)).toBe("0.55");
    expect(minorToYuan(null)).toBe("0.00");
    expect(minorToYuan(Number.NaN)).toBe("0.00");
  });

  it("billingPathLabel 覆盖契约五路径并提供未知值兜底", () => {
    expect(billingPathLabel("PLATFORM")).toBe("平台余额");
    expect(billingPathLabel("FREE_QUOTA")).toBe("免费额度");
    expect(billingPathLabel("FREE_PROXY")).toBe("自定义渠道（免费代理）");
    expect(billingPathLabel("UNKNOWN")).toBe("UNKNOWN");
    expect(billingPathLabel(null)).toBe("—");
  });

  it("gatewayErrorHint：40001 指引充值且不可重试；40000 可重试换幂等键；未知码通用兜底", () => {
    const insufficient = gatewayErrorHint(40001);
    expect(insufficient.recharge).toBe(true);
    expect(insufficient.retryable).toBe(false);

    expect(gatewayErrorHint(40000).retryable).toBe(true);
    expect(gatewayErrorHint(30003).retryable).toBe(true);
    expect(gatewayErrorHint(10004).retryable).toBe(false);

    const unknown = gatewayErrorHint(99999, "自定义错误");
    expect(unknown.title).toBe("自定义错误");
    expect(unknown.retryable).toBe(true);
  });
});
