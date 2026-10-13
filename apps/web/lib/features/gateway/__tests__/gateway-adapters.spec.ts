/**
 * gateway 协议适配器单测（Task G.3.1 验收取证）。
 * 覆盖：双格式请求转换语义、Anthropic 入口 → OpenAI 上游 → 回转等价、上游调用头/URL/30004 归一。
 */
import { afterEach, describe, expect, it, vi } from "vitest";

// S1 接线后 callUpstream 先走 assertSafeUrl；统一将 DNS 解析 mock 为公网地址，
// 使 stub 的 fetch 能被触达（hermetic，不产生真实网络）。
vi.mock("node:dns/promises", () => ({
  lookup: async () => [{ address: "93.184.216.34", family: 4 }],
}));

import { ApiError, ERROR_CODES} from "../../../../app/api/v1/_lib/errors";
import type { OpenAIChatBody } from "@aidean/shared";
import {
  anthropicResponseToOpenai,
  anthropicToOpenai,
  buildAggregatedNative,
  callUpstream,
  geminiResponseToOpenai,
  isPassthroughSafe,
  openaiResponseToAnthropic,
  openaiToAnthropic,
  openaiToGemini,
  openaiToResponses,
  responsesResponseToOpenai,
  toClientResponse,
  toUpstreamBody,
} from "../adapters";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("请求转换（入口 → 上游）", () => {
  it("openaiToAnthropic：system 提取 + tool 折叠 + stop→stop_sequences + max_tokens 缺省 + temperature clamp", () => {
    const out = openaiToAnthropic({
      model: "m1",
      messages: [
        { role: "system", content: "be nice" },
        { role: "user", content: "hi" },
        { role: "tool", content: "tool output" },
      ],
      temperature: 1.7,
      stop: ["END"],
    });
    expect(out).toMatchObject({
      model: "m1",
      system: "be nice",
      max_tokens: 4096,
      temperature: 1, // clamp 至 Anthropic 上限
      stop_sequences: ["END"],
    });
    expect(out.messages).toEqual([
      { role: "user", content: "hi" },
      { role: "user", content: "tool output" }, // tool 无 Anthropic 对应 → 折叠 user
    ]);
  });

  it("anthropicToOpenai：system → messages 头部 + stop_sequences → stop + max_tokens 透传", () => {
    const out = anthropicToOpenai({
      model: "m2",
      messages: [{ role: "user", content: "hello" }],
      max_tokens: 256,
      system: "you are",
      stop_sequences: ["."],
    });
    expect(out).toMatchObject({ model: "m2", max_tokens: 256, stop: ["."] });
    expect(out.messages).toEqual([
      { role: "system", content: "you are" },
      { role: "user", content: "hello" },
    ]);
  });

  it("toUpstreamBody：同格式零拷贝透传；跨格式走对应转换", () => {
    const openaiBody: OpenAIChatBody = { model: "m", messages: [{ role: "user", content: "hi" }] };
    expect(toUpstreamBody("openai", "openai", openaiBody)).toBe(openaiBody); // 引用相等 = 零拷贝
    const cross = toUpstreamBody("anthropic", "openai", {
      model: "m",
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 64,
      system: "sys",
    });
    expect((cross as { messages: unknown[] }).messages).toHaveLength(2); // system 注入头部
  });
});

describe("响应回转（上游 → 入口格式）与往返等价", () => {
  const openaiResp = {
    id: "resp-1",
    model: "m",
    choices: [{ index: 0, message: { role: "assistant", content: "answer" }, finish_reason: "stop" }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  };
  const anthropicResp = {
    id: "resp-2",
    model: "m",
    role: "assistant",
    content: [{ type: "text", text: "answer" }],
    stop_reason: "end_turn",
    usage: { input_tokens: 10, output_tokens: 20 },
  };

  it("Anthropic 入口 → OpenAI 上游 → 回转：语义等价（文本/usage/finish）", () => {
    const back = toClientResponse("anthropic", "openai", openaiResp);
    expect(back).toMatchObject({
      id: "resp-1",
      model: "m",
      role: "assistant",
      stop_reason: "end_turn", // finish_reason "stop" → "end_turn"
      usage: { input_tokens: 10, output_tokens: 20 },
    });
    expect((back.content as Array<{ text: string }>)[0].text).toBe("answer");
  });

  it("OpenAI 入口 → Anthropic 上游 → 回转：语义等价", () => {
    const back = toClientResponse("openai", "anthropic", anthropicResp);
    expect(back).toMatchObject({
      id: "resp-2",
      object: "chat.completion",
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    });
    expect((back.choices as Array<{ message: { content: string }; finish_reason: string }>)[0].message.content).toBe(
      "answer"
    );
    expect((back.choices as Array<{ finish_reason: string }>)[0].finish_reason).toBe("stop");
  });

  it("同格式响应零拷贝透传", () => {
    expect(toClientResponse("openai", "openai", openaiResp)).toBe(openaiResp);
  });

  it("openaiResponseToAnthropic：finish length → max_tokens；anthropicResponseToOpenai：max_tokens → length", () => {
    const a = openaiResponseToAnthropic({ ...openaiResp, choices: [{ finish_reason: "length" as const }] });
    expect(a.stop_reason).toBe("max_tokens");
    const b = anthropicResponseToOpenai({ ...anthropicResp, stop_reason: "max_tokens" });
    expect((b.choices as Array<{ finish_reason: string }>)[0].finish_reason).toBe("length");
  });
});

describe("callUpstream（上游双客户端 + 30004 归一）", () => {
  it("OpenAI 客户端：POST {base}/chat/completions + Bearer 头", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } })
    );
    vi.stubGlobal("fetch", fetchMock);

    await callUpstream({ baseUrl: "https://up.example.com/", apiKey: "sk-1", format: "openai", body: { a: 1 } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://up.example.com/chat/completions"); // 去尾斜杠
    // safeFetch 内部将 headers 转为 Headers 实例
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer sk-1");
    expect(init.method).toBe("POST");
  });

  it("Anthropic 客户端：POST {base}/v1/messages + x-api-key + anthropic-version", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("{}", { status: 200, headers: { "content-type": "application/json" } })
    );
    vi.stubGlobal("fetch", fetchMock);

    await callUpstream({ baseUrl: "https://up.example.com", apiKey: "ak-1", format: "anthropic", body: {} });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://up.example.com/v1/messages");
    const headers = new Headers(init.headers);
    expect(headers.get("x-api-key")).toBe("ak-1");
    expect(headers.get("anthropic-version")).toBe("2023-06-01");
  });

  it("非 2xx → 30004 UPSTREAM_ERROR（状态码 + 错误体前 300 字，通过策略的端点错误文本用于诊断）", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("quota exceeded secret-internal", { status: 429 }))
    );
    const err = (await callUpstream({ baseUrl: "https://u.example", apiKey: "k", format: "openai", body: {} }).catch(
      (e) => e
    )) as ApiError;
    expect(err).toMatchObject({ code: ERROR_CODES.UPSTREAM_ERROR });
    expect(err.message).toContain("429");
    expect(err.message).toContain("quota exceeded secret-internal");
  });

  it("私网 baseUrl：连接前即拒（不触达 fetch），归一 30004", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const err = await callUpstream({
      baseUrl: "http://169.254.169.254/",
      apiKey: "k",
      format: "openai",
      body: {},
    }).catch((e: ApiError) => e);
    expect(err).toMatchObject({ code: ERROR_CODES.UPSTREAM_ERROR });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("网络异常 → 30004", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    await expect(
      callUpstream({ baseUrl: "https://u.example", apiKey: "k", format: "openai", body: {} })
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("2xx 非 JSON → 30004", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>not json</html>", { status: 200 }))
    );
    await expect(
      callUpstream({ baseUrl: "https://u.example", apiKey: "k", format: "openai", body: {} })
    ).rejects.toMatchObject({ code: ERROR_CODES.UPSTREAM_ERROR });
  });
});

// ==================== M3：上游协议扩展（gemini / openai-responses） ====================

describe("M3 请求转换（OpenAI 中枢 → gemini/responses 上游）", () => {
  const hub: OpenAIChatBody = {
    model: "gemini-1.5-pro",
    messages: [
      { role: "system", content: "be nice" },
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ],
    max_tokens: 128,
    temperature: 0.5,
    stop: ["END"],
  };

  it("openaiToGemini：system→systemInstruction、assistant→model、generationConfig 映射、model 保留供 URL 摘取", () => {
    const out = openaiToGemini(hub);
    expect(out).toMatchObject({
      model: "gemini-1.5-pro",
      systemInstruction: { parts: [{ text: "be nice" }] },
      generationConfig: { maxOutputTokens: 128, temperature: 0.5, stopSequences: ["END"] },
    });
    expect(out.contents).toEqual([
      { role: "user", parts: [{ text: "hi" }] },
      { role: "model", parts: [{ text: "hello" }] },
    ]);
  });

  it("openaiToResponses：system→instructions、非 system→input、max_tokens→max_output_tokens", () => {
    const out = openaiToResponses(hub);
    expect(out).toMatchObject({
      model: "gemini-1.5-pro",
      instructions: "be nice",
      max_output_tokens: 128,
      temperature: 0.5,
    });
    expect(out.input).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ]);
  });

  it("toUpstreamBody：openai→gemini / openai→responses 跨格式经中枢扇出；同格式零拷贝", () => {
    expect(toUpstreamBody("openai", "openai", hub)).toBe(hub);
    const g = toUpstreamBody("openai", "gemini", hub) as { contents?: unknown[] };
    expect(Array.isArray(g.contents)).toBe(true);
    const r = toUpstreamBody("openai", "openai-responses", hub) as { input?: unknown[] };
    expect(Array.isArray(r.input)).toBe(true);
  });
});

describe("M3 响应回转（gemini/responses 上游 → 客户端）", () => {
  const geminiResp = {
    candidates: [{ content: { role: "model", parts: [{ text: "answer" }] }, finishReason: "STOP" }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 },
    modelVersion: "gemini-1.5-pro",
  };
  const responsesResp = {
    id: "resp_1",
    object: "response",
    model: "gpt-4o",
    output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: "answer" }] }],
    output_text: "answer",
    usage: { input_tokens: 10, output_tokens: 20 },
  };

  it("geminiResponseToOpenai：文本/usage/finish 归一为 OpenAI chat.completion", () => {
    const out = geminiResponseToOpenai(geminiResp);
    expect(out).toMatchObject({
      object: "chat.completion",
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    });
    expect((out.choices as Array<{ message: { content: string }; finish_reason: string }>)[0].message.content).toBe("answer");
    expect((out.choices as Array<{ finish_reason: string }>)[0].finish_reason).toBe("stop");
  });

  it("responsesResponseToOpenai：output_text 优先，usage input/output→prompt/completion", () => {
    const out = responsesResponseToOpenai(responsesResp);
    expect(out).toMatchObject({
      id: "resp_1",
      object: "chat.completion",
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    });
    expect((out.choices as Array<{ message: { content: string } }>)[0].message.content).toBe("answer");
  });

  it("toClientResponse：gemini/responses 上游 → OpenAI 客户端；→ Anthropic 客户端经中枢二次扇出", () => {
    const oai = toClientResponse("openai", "gemini", geminiResp);
    expect(oai).toMatchObject({ object: "chat.completion" });
    const ant = toClientResponse("anthropic", "openai-responses", responsesResp);
    expect(ant).toMatchObject({ role: "assistant", usage: { input_tokens: 10, output_tokens: 20 } });
    expect((ant.content as Array<{ text: string }>)[0].text).toBe("answer");
  });

  it("isPassthroughSafe：仅同格式且 openai/anthropic 可透传；gemini/responses 上游恒假", () => {
    expect(isPassthroughSafe("openai", "openai")).toBe(true);
    expect(isPassthroughSafe("anthropic", "anthropic")).toBe(true);
    expect(isPassthroughSafe("openai", "anthropic")).toBe(false);
    expect(isPassthroughSafe("openai", "gemini")).toBe(false);
    expect(isPassthroughSafe("openai", "openai-responses")).toBe(false);
  });

  it("buildAggregatedNative：gemini/responses 攒流结果保持上游原生形状", () => {
    const g = buildAggregatedNative("gemini", "gemini-1.5-pro", "hi", { prompt_tokens: 3, completion_tokens: 4 });
    expect(g).toMatchObject({
      candidates: [{ content: { parts: [{ text: "hi" }] } }],
      usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 4 },
    });
    const r = buildAggregatedNative("openai-responses", "gpt-4o", "hi", { prompt_tokens: 3, completion_tokens: 4 });
    expect(r).toMatchObject({ object: "response", output_text: "hi", usage: { input_tokens: 3, output_tokens: 4 } });
  });
});

describe("M3 callUpstream 上游四协议 URL/鉴权", () => {
  it("Gemini 客户端：POST {base}/v1beta/models/{model}:generateContent + x-goog-api-key，body 摘除 model", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await callUpstream({ baseUrl: "https://gen.example", apiKey: "gk-1", format: "gemini", body: { model: "gemini-1.5-pro", contents: [] } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://gen.example/v1beta/models/gemini-1.5-pro:generateContent");
    const headers = new Headers(init.headers);
    expect(headers.get("x-goog-api-key")).toBe("gk-1");
    expect(JSON.parse(init.body as string).model).toBeUndefined(); // body 不含 model
  });

  it("Responses 客户端：POST {base}/responses + Bearer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await callUpstream({ baseUrl: "https://oai.example", apiKey: "sk-9", format: "openai-responses", body: { model: "gpt-4o", input: "hi" } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://oai.example/responses");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer sk-9");
  });
});
