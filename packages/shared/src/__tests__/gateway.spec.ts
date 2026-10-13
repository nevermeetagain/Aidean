import { describe, expect, it } from "vitest";

import {
  AnthropicChatBodySchema,
  CustomChannelUpsertSchema,
  GatewayChatSchema,
  OpenAIChatBodySchema,
  UpstreamUsageSchema,
  detectAccessFormat,
  detectGatewayFormat,
  maskApiKey,
  normalizeAccessRequest,
  normalizeUsage,
  serializeAccessResponse,
} from "../schemas/gateway.schema";
import {
  GATEWAY_FORMATS,
  channelEnumToGatewayFormat,
  gatewayFormatToChannelEnum,
} from "../constants/gateway.constants";

describe("网关契约（G.1.1）", () => {
  it("入口形态判别：顶层 system/stop_sequences → anthropic，其余 → openai", () => {
    expect(
      detectGatewayFormat({ model: "m", messages: [{ role: "user", content: "hi" }], max_tokens: 100 }),
    ).toBe("openai");
    expect(
      detectGatewayFormat({ model: "m", system: "you are", messages: [{ role: "user", content: "hi" }], max_tokens: 1 }),
    ).toBe("anthropic");
    expect(detectGatewayFormat({ model: "m", messages: [{ role: "user", content: "hi" }], stop_sequences: ["."] })).toBe(
      "anthropic",
    );
  });

  it("OpenAI 入口样例 parse 通过", () => {
    const parsed = OpenAIChatBodySchema.safeParse({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "be nice" },
        { role: "user", content: "hello" },
      ],
      max_tokens: 512,
      stream: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("Anthropic 入口样例 parse 通过（system 顶层 + max_tokens 必填）", () => {
    const parsed = AnthropicChatBodySchema.safeParse({
      model: "claude-sonnet-4",
      system: "be nice",
      messages: [{ role: "user", content: "hello" }],
      max_tokens: 256,
    });
    expect(parsed.success).toBe(true);
    const bad = AnthropicChatBodySchema.safeParse({
      model: "claude-sonnet-4",
      messages: [{ role: "user", content: "hello" }],
    });
    expect(bad.success).toBe(false); // max_tokens 缺失
  });

  it("上游 usage 两命名 union parse + 归一", () => {
    const o = UpstreamUsageSchema.parse({ prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 });
    const a = UpstreamUsageSchema.parse({ input_tokens: 5, output_tokens: 7 });
    expect(normalizeUsage(o)).toEqual({ promptTokens: 10, completionTokens: 20 });
    expect(normalizeUsage(a)).toEqual({ promptTokens: 5, completionTokens: 7 });
  });

  it("usage 归一：OpenAI details / DeepSeek cache 命中 / Anthropic cache_read 提取 cached/reasoning", () => {
    const o = UpstreamUsageSchema.parse({
      prompt_tokens: 100,
      completion_tokens: 20,
      prompt_tokens_details: { cached_tokens: 40 },
      completion_tokens_details: { reasoning_tokens: 8 },
    });
    expect(normalizeUsage(o)).toEqual({ promptTokens: 100, completionTokens: 20, cachedTokens: 40, reasoningTokens: 8 });
    const ds = UpstreamUsageSchema.parse({ prompt_tokens: 50, completion_tokens: 10, prompt_cache_hit_tokens: 25 });
    expect(normalizeUsage(ds)).toEqual({ promptTokens: 50, completionTokens: 10, cachedTokens: 25 });
    const a = UpstreamUsageSchema.parse({
      input_tokens: 30,
      output_tokens: 6,
      cache_read_input_tokens: 12,
      cache_creation_input_tokens: 3,
    });
    expect(normalizeUsage(a)).toEqual({ promptTokens: 30, completionTokens: 6, cachedTokens: 12 });
  });

  it("自定义渠道 upsert：baseUrl 必须 URL、apiKey 下限 8", () => {
    expect(
      CustomChannelUpsertSchema.safeParse({
        name: "我的渠道",
        baseUrl: "https://api.example.com",
        apiKey: "sk-12345678",
      }).success,
    ).toBe(true);
    expect(
      CustomChannelUpsertSchema.safeParse({ name: "x", baseUrl: "not-a-url", apiKey: "sk-12345678" }).success,
    ).toBe(false);
  });

  it("掩码工具不泄露明文", () => {
    expect(maskApiKey("sk-abcdefghijklmn")).toBe("sk-****klmn");
    expect(maskApiKey("short")).toBe("****");
  });
});

describe("接入格式归一层（问题 5：调用测试台 4 格式）", () => {
  it("detectAccessFormat：contents→gemini，input无messages→responses，system→anthropic，其余→openai", () => {
    expect(detectAccessFormat({ model: "m", contents: [{ role: "user", parts: [{ text: "hi" }] }] })).toBe("gemini");
    expect(detectAccessFormat({ model: "m", input: "hi" })).toBe("openai-responses");
    expect(detectAccessFormat({ model: "m", system: "s", messages: [{ role: "user", content: "hi" }] })).toBe("anthropic");
    expect(detectAccessFormat({ model: "m", messages: [{ role: "user", content: "hi" }] })).toBe("openai");
  });

  it("normalizeAccessRequest(responses)：instructions→system、input 分块→messages，且过 GatewayChatSchema", () => {
    const norm = normalizeAccessRequest("openai-responses", {
      model: "gpt-4o",
      instructions: "be nice",
      input: [{ role: "user", content: [{ type: "input_text", text: "hello" }] }],
      max_output_tokens: 128,
      temperature: 0.5,
    });
    expect(norm.model).toBe("gpt-4o");
    expect(norm.messages[0]).toEqual({ role: "system", content: "be nice" });
    expect(norm.messages[1]).toEqual({ role: "user", content: "hello" });
    expect(norm.max_tokens).toBe(128);
    expect(GatewayChatSchema.safeParse(norm).success).toBe(true);
    expect(detectGatewayFormat(norm)).toBe("openai");
  });

  it("normalizeAccessRequest(gemini)：systemInstruction/parts→messages，role model→assistant，generationConfig 映射", () => {
    const norm = normalizeAccessRequest("gemini", {
      model: "gemini-2.0-flash",
      systemInstruction: { parts: [{ text: "sys" }] },
      contents: [
        { role: "user", parts: [{ text: "hi" }] },
        { role: "model", parts: [{ text: "yo" }] },
      ],
      generationConfig: { maxOutputTokens: 64, temperature: 0.2, topP: 0.9, stopSequences: ["END"] },
    });
    expect(norm.messages).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "hi" },
      { role: "assistant", content: "yo" },
    ]);
    expect(norm.max_tokens).toBe(64);
    expect(norm.top_p).toBe(0.9);
    expect(norm.stop).toEqual(["END"]);
    expect(GatewayChatSchema.safeParse(norm).success).toBe(true);
  });

  it("serializeAccessResponse(responses)：openai 内部体 → output_text/usage 回写", () => {
    const out = serializeAccessResponse(
      "openai-responses",
      {
        id: "cc_1",
        model: "gpt-4o",
        choices: [{ message: { content: "hi there" } }],
        usage: { prompt_tokens: 11, completion_tokens: 5 },
      },
      "r-1"
    ) as Record<string, any>;
    expect(out.object).toBe("response");
    expect(out.output_text).toBe("hi there");
    expect(out.output[0].content[0]).toMatchObject({ type: "output_text", text: "hi there" });
    expect(out.usage).toEqual({ input_tokens: 11, output_tokens: 5, total_tokens: 16 });
  });

  it("serializeAccessResponse(gemini)：内部体 → candidates/parts + usageMetadata", () => {
    const out = serializeAccessResponse(
      "gemini",
      { choices: [{ message: { content: "yo" } }], usage: { prompt_tokens: 3, completion_tokens: 4 }, model: "g" },
      "r-2"
    ) as Record<string, any>;
    expect(out.candidates[0].content.parts[0].text).toBe("yo");
    expect(out.usageMetadata).toEqual({ promptTokenCount: 3, candidatesTokenCount: 4, totalTokenCount: 7 });
  });
});

describe("M3 上游协议单一真源与 wire↔enum 边界", () => {
  it("GATEWAY_FORMATS 扩为四值", () => {
    expect(GATEWAY_FORMATS).toEqual(["openai", "anthropic", "openai-responses", "gemini"]);
  });

  it("gatewayFormatToChannelEnum：连字符→下划线（openai-responses→OPENAI_RESPONSES）", () => {
    expect(gatewayFormatToChannelEnum("openai")).toBe("OPENAI");
    expect(gatewayFormatToChannelEnum("anthropic")).toBe("ANTHROPIC");
    expect(gatewayFormatToChannelEnum("openai-responses")).toBe("OPENAI_RESPONSES");
    expect(gatewayFormatToChannelEnum("gemini")).toBe("GEMINI");
  });

  it("channelEnumToGatewayFormat：枚举成员名→wire；未知回落 openai；双向回环", () => {
    expect(channelEnumToGatewayFormat("OPENAI_RESPONSES")).toBe("openai-responses");
    expect(channelEnumToGatewayFormat("GEMINI")).toBe("gemini");
    expect(channelEnumToGatewayFormat("WEIRD")).toBe("openai");
    for (const f of GATEWAY_FORMATS) {
      expect(channelEnumToGatewayFormat(gatewayFormatToChannelEnum(f))).toBe(f);
    }
  });
});
