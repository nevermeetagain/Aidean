/**
 * gateway 协议适配器（Task G.3.1）：入口/上游双格式请求转换与调用。
 *
 * 职责：
 *  - callUpstream：上游双客户端（OpenAI POST {base}/chat/completions Bearer / Anthropic POST {base}/v1/messages
 *    x-api-key + anthropic-version）；超时 UPSTREAM_TIMEOUT_MS；非 2xx 或响应不可解析归一 30004。
 *  - toUpstreamBody：入口 body → 上游 body 字段级转换（同格式零拷贝透传）。
 *  - toClientResponse：上游响应 → 入口格式响应回转（同格式零拷贝透传；跨格式转换核心语义字段）。
 *
 * 转换语义（确定性规则）：
 *  - OpenAI system role → Anthropic 顶层 system；Anthropic system → OpenAI messages 头部 system 消息。
 *  - OpenAI tool role 无 Anthropic 对应 → 折叠为 user（MVP 语义近似）。
 *  - OpenAI stop ↔ Anthropic stop_sequences；max_tokens OpenAI 缺省 → DEFAULT_MAX_TOKENS（Anthropic 必填）。
 *  - temperature OpenAI 0~2 → Anthropic clamp 至 ≤1（越界上游必 4xx，clamp 保链路可用）。
 *  - usage 命名映射经 normalizeUsage 口径：prompt_tokens↔input_tokens、completion_tokens↔output_tokens。
 */
import { DEFAULT_MAX_TOKENS, UPSTREAM_TIMEOUT_MS, type GatewayFormat } from "@aidean/shared";

import { ApiError, ERROR_CODES } from "../../../app/api/v1/_lib/errors";
import type { AnthropicChatBody, GatewayChat, OpenAIChatBody } from "@aidean/shared";
import {
  assertResponseSize,
  readCappedJson,
  safeFetch,
  MAX_RESPONSE_BYTES,
  type FetchPolicyOptions,
} from "../../security/url-policy";

// ==================== 上游调用 ====================

/** 去尾斜杠，拼接路径安全 */
function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}${path}`;
}

/**
 * 出站统一入口（S1 安全治理）：全部经 safeFetch ——
 * 连接前策略断言 + manual-redirect 跳转目标逐一断言 + secureDispatcher 连接时同源判定。
 * 任何失败均向上抛出原始错误，由调用方归一为 30004。
 */
async function postToUpstream(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  timeoutMs: number,
  policy?: FetchPolicyOptions,
): Promise<Response> {
  return safeFetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  }, policy);
}

/** 上游四协议请求构造（URL / 鉴权头 / 请求体）：
 *  - openai：POST {base}/chat/completions，Authorization Bearer（body 原样，含 model）；
 *  - anthropic：POST {base}/v1/messages，x-api-key + anthropic-version；
 *  - openai-responses：POST {base}/responses，Authorization Bearer（Responses API 从 body 取 model）；
 *  - gemini：POST {base}/v1beta/models/{model}:generateContent（stream 时 :streamGenerateContent?alt=sse），
 *    x-goog-api-key；Gemini 原生把模型名置于路径，故从 body 摘出 model 并剔除（原生 body 不含 model）。
 * body 始终浅拷贝后返回，绝不原地改写入参。 */
function buildUpstreamRequest(
  format: GatewayFormat,
  baseUrl: string,
  apiKey: string,
  body: unknown,
  opts?: { stream?: boolean }
): { url: string; headers: Record<string, string>; body: Record<string, unknown> } {
  const b = { ...(body as Record<string, unknown>) };
  const mkHeaders = (extra: Record<string, string>): Record<string, string> => {
    const h: Record<string, string> = { "content-type": "application/json", ...extra };
    if (opts?.stream) h.accept = "text/event-stream";
    return h;
  };
  if (format === "gemini") {
    const model = String(b.model ?? "");
    delete b.model;
    const action = opts?.stream ? ":streamGenerateContent?alt=sse" : ":generateContent";
    return {
      url: joinUrl(baseUrl, `/v1beta/models/${encodeURIComponent(model)}${action}`),
      headers: mkHeaders({ "x-goog-api-key": apiKey }),
      body: b,
    };
  }
  if (format === "openai-responses") {
    return {
      url: joinUrl(baseUrl, "/responses"),
      headers: mkHeaders({ authorization: `Bearer ${apiKey}` }),
      body: b,
    };
  }
  if (format === "anthropic") {
    return {
      url: joinUrl(baseUrl, "/v1/messages"),
      headers: mkHeaders({ "x-api-key": apiKey, "anthropic-version": "2023-06-01" }),
      body: b,
    };
  }
  // openai
  return {
    url: joinUrl(baseUrl, "/chat/completions"),
    headers: mkHeaders({ authorization: `Bearer ${apiKey}` }),
    body: b,
  };
}

export interface UpstreamCallResult {
  status: number;
  json: unknown;
}

/** SSE 透传安全性判定：仅当客户端与上游同格式且为 openai/anthropic 时，上游字节流可直接透传客户端；
 *  跨格式（含 gemini/openai-responses 上游）必须走聚合（callUpstreamAggregated）再回转。 */
export function isPassthroughSafe(clientFormat: GatewayFormat, upstreamFormat: GatewayFormat): boolean {
  return clientFormat === upstreamFormat && (upstreamFormat === "openai" || upstreamFormat === "anthropic");
}

/**
 * 上游调用（双客户端）：2xx 返回解析后的 JSON；非 2xx / JSON 不可解析 / 网络错误 → 30004。
 * 站点 baseUrl 决定端点；key 按上游格式取头（Bearer / x-api-key）。
 */
export async function callUpstream(input: {
  baseUrl: string;
  apiKey: string;
  format: GatewayFormat;
  body: unknown;
  timeoutMs?: number;
  /** SSRF 策略：管理端可信站点传 {allowPrivate:true}（seed/admin 录入 baseUrl）；用户自建渠道缺省（严守私网拒止） */
  policy?: FetchPolicyOptions;
}): Promise<UpstreamCallResult> {
  const { url, headers, body } = buildUpstreamRequest(input.format, input.baseUrl, input.apiKey, input.body);

  let res: Response;
  try {
    res = await postToUpstream(url, headers, body, input.timeoutMs ?? UPSTREAM_TIMEOUT_MS, input.policy);
  } catch (err) {
    throw new ApiError(
      ERROR_CODES.UPSTREAM_ERROR,
      `上游不可达: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // 非 2xx：状态码 + 前 300 字错误体（能到此处的均为通过 SSRF 策略的端点，错误文本用于诊断）
  if (!res.ok) {
    let detail = `上游 ${res.status}`;
    try {
      const text = await res.text();
      if (text) detail = `${detail}: ${text.slice(0, 300)}`;
    } catch {
      /* body 读取读取失败不掩盖状态码语义 */
    }
    throw new ApiError(ERROR_CODES.UPSTREAM_ERROR, detail);
  }

  try {
    assertResponseSize(res);
    return { status: res.status, json: await readCappedJson(res) };
  } catch {
    throw new ApiError(ERROR_CODES.UPSTREAM_ERROR, "上游响应不可解析（非 JSON）或超过大小上限");
  }
}

// ==================== 流式透传（规格 v0.2 二期）：body 原样上抛，编排层负责终态化 ====================

/** 上游流式透传产物：不做任何 SSE 解析/攒流，body 由编排层接管（首字节 CAPTURING → 流终态化） */
export interface UpstreamStreamResult {
  status: number;
  /** 上游 SSE 字节流；编排层边透传客户端边计量（尾帧 usage / 中断已产出量） */
  body: ReadableStream<Uint8Array>;
  contentType: string;
}

/**
 * 流式透传调用（规格 v0.2 §2）：与 callUpstreamAggregated 同请求构造
 * （OpenAI 强制 stream_options.include_usage），但不消费响应体——
 * 编排层在首字节到达即置 CAPTURING（`:stream-final` 幂等键，TTL 懒清理跳过），
 * 流终态时按尾帧 usage/估算保守 capture，中断按已产出量 capture（不足 1 分 void）。
 * - 非 2xx / body 缺失 → 30004（同口径）；
 * - 上游 SSE 帧格式错误不在本层兜底：透传面保持字节保真，账面仅依赖尾帧 usage 与已产出计量。
 */
export async function callUpstreamStream(input: {
  baseUrl: string;
  apiKey: string;
  format: GatewayFormat;
  body: unknown;
  timeoutMs?: number;
  /** SSRF 策略：管理端可信站点传 {allowPrivate:true}；用户自建渠道缺省（严守私网拒止） */
  policy?: FetchPolicyOptions;
}): Promise<UpstreamStreamResult> {
  // SSE 透传仅在 clientFormat===upstreamFormat 且为 openai/anthropic 时字节保真；
  // gemini/openai-responses 上游的 SSE 帧与 OpenAI/Anthropic 客户端不兼容，须走聚合（service 据 isPassthroughSafe 规避调用）。
  if (input.format === "gemini" || input.format === "openai-responses") {
    throw new ApiError(ERROR_CODES.UPSTREAM_ERROR, `${input.format} 上游不支持 SSE 透传（跨格式字节不兼容），请走聚合路径`);
  }
  const req = buildUpstreamRequest(input.format, input.baseUrl, input.apiKey, input.body, { stream: true });
  const upstreamBody: Record<string, unknown> =
    input.format === "openai"
      ? { ...req.body, stream: true, stream_options: { include_usage: true } }
      : { ...req.body, stream: true };

  let res: Response;
  try {
    res = await postToUpstream(req.url, req.headers, upstreamBody, input.timeoutMs ?? UPSTREAM_TIMEOUT_MS, input.policy);
  } catch (err) {
    throw new ApiError(
      ERROR_CODES.UPSTREAM_ERROR,
      `上游不可达: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!res.ok || !res.body) {
    let detail = `上游 ${res.status}`;
    try {
      const text = await res.text();
      if (text) detail = `${detail}: ${text.slice(0, 300)}`;
    } catch {
      /* body 读取失败不掩盖状态码语义 */
    }
    throw new ApiError(ERROR_CODES.UPSTREAM_ERROR, detail);
  }
  return { status: res.status, body: res.body, contentType: res.headers.get("content-type") ?? "text/event-stream" };
}

// ==================== 流式聚合调用（流式 MVP：上游流式、入口聚合） ====================

/** SSE data: 前缀长度（"data: "） */
const SSE_DATA_PREFIX = "data: ";
/** OpenAI 流式末帧哨兵 */
const SSE_DONE_SENTINEL = "[DONE]";

/** 上游聚合流解析产物：与 callUpstream 同形状（status + 归一 JSON），供编排层零改造复用 */
export interface AggregatedCallResult {
  status: number;
  json: Record<string, unknown>;
}

/** 从 OpenAI 流式 chunk 提取增量文本与 usage（末帧 usage 仅在 include_usage 时出现） */
function readOpenAIChunk(chunk: Record<string, unknown>): { text: string; usage?: { prompt_tokens: number; completion_tokens: number } } {
  const choices = Array.isArray(chunk.choices) ? chunk.choices : [];
  const first = (choices[0] ?? {}) as { delta?: { content?: unknown } };
  const usageRaw = chunk.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
  return {
    text: typeof first.delta?.content === "string" ? first.delta.content : "",
    ...(usageRaw
      ? { usage: { prompt_tokens: usageRaw.prompt_tokens ?? 0, completion_tokens: usageRaw.completion_tokens ?? 0 } }
      : {}),
  };
}

/** 从 Anthropic 流式事件提取增量文本与 usage（message_start 带输入、message_delta 带累计输出） */
function readAnthropicEvent(event: Record<string, unknown>): {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
} {
  const type = event.type as string | undefined;
  const delta = event.delta as { text?: unknown; output_tokens?: unknown } | undefined;
  const message = event.message as { usage?: { input_tokens?: unknown; output_tokens?: unknown } } | undefined;
  const usage = event.usage as { input_tokens?: unknown; output_tokens?: unknown } | undefined;
  if (type === "content_block_delta") {
    return { text: typeof delta?.text === "string" ? delta.text : "" };
  }
  if (type === "message_start" && message?.usage) {
    return { text: "", inputTokens: Number(message.usage.input_tokens ?? 0), outputTokens: Number(message.usage.output_tokens ?? 0) };
  }
  if (type === "message_delta" && usage) {
    return { text: "", outputTokens: Number(usage.output_tokens ?? 0) };
  }
  return { text: "" };
}

/** 从 Gemini 流式块（streamGenerateContent?alt=sse）提取增量文本与累计 usage */
function readGeminiChunk(chunk: Record<string, unknown>): {
  text: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
} {
  const cands = Array.isArray(chunk.candidates) ? chunk.candidates : [];
  let text = "";
  for (const c of cands) {
    const parts = (c as { content?: { parts?: unknown[] } })?.content?.parts;
    if (Array.isArray(parts)) {
      for (const p of parts) {
        const t = (p as { text?: unknown })?.text;
        if (typeof t === "string") text += t;
      }
    }
  }
  const um = chunk.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number } | undefined;
  return {
    text,
    ...(um ? { usage: { prompt_tokens: um.promptTokenCount ?? 0, completion_tokens: um.candidatesTokenCount ?? 0 } } : {}),
  };
}

/** 从 OpenAI Responses 流式事件提取增量文本与终态 usage（response.output_text.delta / response.completed） */
function readResponsesChunk(chunk: Record<string, unknown>): {
  text: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
} {
  const type = chunk.type as string | undefined;
  if (type === "response.output_text.delta") {
    return { text: typeof chunk.delta === "string" ? chunk.delta : "" };
  }
  if (type === "response.completed") {
    const resp = (chunk.response ?? {}) as Record<string, unknown>;
    const u = (resp.usage ?? {}) as { input_tokens?: number; output_tokens?: number };
    return { text: "", usage: { prompt_tokens: u.input_tokens ?? 0, completion_tokens: u.output_tokens ?? 0 } };
  }
  return { text: "" };
}

/** 四协议 SSE 块统一吸收：按格式分派读取器，返回本次增量文本与刷新后的累计 usage（无 usage 帧则沿用 prevUsage） */
function absorbStreamChunk(
  format: GatewayFormat,
  chunk: Record<string, unknown>,
  prevUsage: { prompt_tokens: number; completion_tokens: number } | null
): { text: string; usage: { prompt_tokens: number; completion_tokens: number } | null } {
  if (format === "openai") {
    const { text, usage } = readOpenAIChunk(chunk);
    return { text, usage: usage ?? prevUsage };
  }
  if (format === "gemini") {
    const { text, usage } = readGeminiChunk(chunk);
    return { text, usage: usage ?? prevUsage };
  }
  if (format === "openai-responses") {
    const { text, usage } = readResponsesChunk(chunk);
    return { text, usage: usage ?? prevUsage };
  }
  // anthropic：message_start 带输入、message_delta 带累计输出
  const { text, inputTokens, outputTokens } = readAnthropicEvent(chunk);
  if (inputTokens !== undefined || outputTokens !== undefined) {
    const prev = prevUsage ?? { prompt_tokens: 0, completion_tokens: 0 };
    return {
      text,
      usage: {
        prompt_tokens: inputTokens ?? prev.prompt_tokens,
        completion_tokens: outputTokens ?? prev.completion_tokens,
      },
    };
  }
  return { text, usage: prevUsage };
}

/**
 * 流式聚合调用（流式账本规格 v0.1 §2.3.2）：上游按流式发起（OpenAI stream_options.include_usage
 * 强制透传；Anthropic 天然流式含 usage 事件），服务端攒流拼接为与 callUpstream 同形状的
 * 归一 JSON（OpenAI chat.completion / Anthropic message），编排层 hold/capture/usage_log 零改造复用。
 * - 尾帧 usage 缺失 → json 不含 usage 字段，由编排层按估算保守 capture（规格 §2.3.1.1）；
 * - 中途读流异常（网络/截断）→ 已攒内容随 30004 上抛，编排层按失败路径 void 处置；
 * - 非 2xx / SSE data 不可解析 → 30004（与 callUpstream 同口径）。
 */
export async function callUpstreamAggregated(input: {
  baseUrl: string;
  apiKey: string;
  format: GatewayFormat;
  body: unknown;
  timeoutMs?: number;
  /** SSRF 策略：管理端可信站点传 {allowPrivate:true}；用户自建渠道缺省（严守私网拒止） */
  policy?: FetchPolicyOptions;
}): Promise<AggregatedCallResult> {
  const req = buildUpstreamRequest(input.format, input.baseUrl, input.apiKey, input.body, { stream: true });
  let upstreamBody: Record<string, unknown>;
  if (input.format === "openai") {
    // 规格计量口径：include_usage 强制透传，保证末帧 usage 可得
    upstreamBody = { ...req.body, stream: true, stream_options: { include_usage: true } };
  } else if (input.format === "gemini") {
    // Gemini 流式由 URL（:streamGenerateContent?alt=sse）决定，body 不带 stream 字段
    upstreamBody = req.body;
  } else {
    // anthropic / openai-responses
    upstreamBody = { ...req.body, stream: true };
  }

  let res: Response;
  try {
    res = await postToUpstream(req.url, req.headers, upstreamBody, input.timeoutMs ?? UPSTREAM_TIMEOUT_MS, input.policy);
  } catch (err) {
    throw new ApiError(
      ERROR_CODES.UPSTREAM_ERROR,
      `上游不可达: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!res.ok || !res.body) {
    let detail = `上游 ${res.status}`;
    try {
      const text = await res.text();
      if (text) detail = `${detail}: ${text.slice(0, 300)}`;
    } catch {
      /* body 读取失败不掩盖状态码语义 */
    }
    throw new ApiError(ERROR_CODES.UPSTREAM_ERROR, detail);
  }

  // 攒流解析（SSE 行协议）：增量文本拼接 + usage 归一 + 2 MiB 累计封顶
  let text = "";
  let usage: { prompt_tokens: number; completion_tokens: number } | null = null;
  let streamError: string | null = null;
  try {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let receivedBytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > MAX_RESPONSE_BYTES) {
        throw new Error(`upstream stream exceeded ${MAX_RESPONSE_BYTES} bytes`);
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // 半行留待下一片
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith(SSE_DATA_PREFIX)) continue;
        const payload = trimmed.slice(SSE_DATA_PREFIX.length);
        if (payload === SSE_DONE_SENTINEL) continue;
        let chunk: Record<string, unknown>;
        try {
          chunk = JSON.parse(payload) as Record<string, unknown>;
        } catch {
          streamError = streamError ?? `SSE 片段不可解析: ${payload.slice(0, 80)}`;
          continue;
        }
        const r = absorbStreamChunk(input.format, chunk, usage);
        text += r.text;
        usage = r.usage;
      }
    }
    // 流结束 flush：末片可能不带 \n（buffer 残留尾行）——漏解析即丢末帧 usage，
    // 触发估算兜底虚高记账，须在循环外补一次行解析
    if (buffer.trim().length > 0 && buffer.trim().startsWith(SSE_DATA_PREFIX)) {
      const payload = buffer.trim().slice(SSE_DATA_PREFIX.length);
      if (payload !== SSE_DONE_SENTINEL) {
        try {
          const chunk = JSON.parse(payload) as Record<string, unknown>;
          const r = absorbStreamChunk(input.format, chunk, usage);
          text += r.text;
          usage = r.usage;
        } catch {
          streamError = streamError ?? `SSE 片段不可解析: ${payload.slice(0, 80)}`;
        }
      }
    }
  } catch (err) {
    throw new ApiError(
      ERROR_CODES.UPSTREAM_ERROR,
      `上游流式中断: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (streamError) {
    throw new ApiError(ERROR_CODES.UPSTREAM_ERROR, streamError);
  }

  // 归一为「上游原生形状」：下游 toClientResponse(clientFormat, upstreamFormat, json) 与 parseUpstreamUsage
  // 均按 upstreamFormat 解析，故聚合结果必须保持对应协议（openai/anthropic/gemini/responses）的原生形状。
  const modelForJson = String((input.body as Record<string, unknown>)?.model ?? "");
  const json = buildAggregatedNative(input.format, modelForJson, text, usage);
  return { status: res.status, json };
}

/** 聚合攒流结果→上游原生形状（保证与同协议非流式 callUpstream 响应同构，下游零感知） */
export function buildAggregatedNative(
  format: GatewayFormat,
  model: string,
  text: string,
  usage: { prompt_tokens: number; completion_tokens: number } | null
): Record<string, unknown> {
  const ts = Date.now();
  switch (format) {
    case "gemini":
      return {
        candidates: [{ index: 0, content: { role: "model", parts: [{ text }] }, finishReason: "STOP" }],
        ...(usage
          ? {
              usageMetadata: {
                promptTokenCount: usage.prompt_tokens,
                candidatesTokenCount: usage.completion_tokens,
                totalTokenCount: usage.prompt_tokens + usage.completion_tokens,
              },
            }
          : {}),
        modelVersion: model,
      };
    case "openai-responses":
      return {
        id: `agg-${ts}`,
        object: "response",
        status: "completed",
        model,
        output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text, annotations: [] }] }],
        output_text: text,
        ...(usage
          ? { usage: { input_tokens: usage.prompt_tokens, output_tokens: usage.completion_tokens, total_tokens: usage.prompt_tokens + usage.completion_tokens } }
          : {}),
      };
    case "anthropic":
      return {
        id: `agg-${ts}`,
        type: "message",
        role: "assistant",
        model,
        content: [{ type: "text", text }],
        stop_reason: "end_turn",
        stop_sequence: null,
        ...(usage ? { usage: { input_tokens: usage.prompt_tokens, output_tokens: usage.completion_tokens } } : {}),
      };
    default: // openai
      return {
        id: `agg-${ts}`,
        object: "chat.completion",
        created: Math.floor(ts / 1000),
        model,
        choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
        ...(usage ? { usage: { ...usage, total_tokens: usage.prompt_tokens + usage.completion_tokens } } : {}),
      };
  }
}

// ==================== 请求转换（入口 → 上游） ====================

/** 入口 OpenAI body → 上游 Anthropic body */
export function openaiToAnthropic(body: OpenAIChatBody): Record<string, unknown> {
  type OpenAIMessage = OpenAIChatBody["messages"][number];
  const system = body.messages
    .filter((m: OpenAIMessage) => m.role === "system")
    .map((m: OpenAIMessage) => m.content)
    .join("\n");
  const messages = body.messages
    .filter((m: OpenAIMessage) => m.role !== "system")
    .map((m: OpenAIMessage) => ({ role: m.role === "tool" ? "user" : m.role, content: m.content }));
  return {
    model: body.model,
    messages,
    ...(system ? { system } : {}),
    max_tokens: body.max_tokens ?? DEFAULT_MAX_TOKENS,
    ...(body.temperature !== undefined ? { temperature: Math.min(body.temperature, 1) } : {}),
    ...(body.top_p !== undefined ? { top_p: body.top_p } : {}),
    ...(body.stop ? { stop_sequences: Array.isArray(body.stop) ? body.stop : [body.stop] } : {}),
  };
}

/** 入口 Anthropic body → 上游 OpenAI body */
export function anthropicToOpenai(body: AnthropicChatBody): Record<string, unknown> {
  type AnthropicMessage = AnthropicChatBody["messages"][number];
  const messages: Array<{ role: string; content: string }> = [
    ...(body.system ? [{ role: "system", content: body.system }] : []),
    ...body.messages.map((m: AnthropicMessage) => ({ role: m.role, content: m.content })),
  ];
  return {
    model: body.model,
    messages,
    max_tokens: body.max_tokens,
    ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
    ...(body.top_p !== undefined ? { top_p: body.top_p } : {}),
    ...(body.stop_sequences?.length ? { stop: body.stop_sequences } : {}),
  };
}

/** 入口 body → 上游 body：同格式零拷贝；跨格式经 OpenAI 中枢扇出（openai 为 hub） */
export function toUpstreamBody(clientFormat: GatewayFormat, upstreamFormat: GatewayFormat, body: GatewayChat): unknown {
  if (clientFormat === upstreamFormat) return body; // 同格式零拷贝透传
  // 归一到 OpenAI 中枢形态（入口 clientFormat 实取 openai/anthropic）
  const hub = (clientFormat === "openai" ? body : anthropicToOpenai(body as AnthropicChatBody)) as OpenAIChatBody;
  switch (upstreamFormat) {
    case "openai":
      return hub;
    case "anthropic":
      return openaiToAnthropic(hub);
    case "gemini":
      return openaiToGemini(hub);
    case "openai-responses":
      return openaiToResponses(hub);
    default:
      return hub;
  }
}

/** content 体裁（字符串 / [{type,text}] 分块）→ 纯文本 */
function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((p) => ((p && typeof p === "object" ? (p as { text?: unknown }).text : "") as string) ?? "").filter((t) => typeof t === "string").join("");
  }
  return content == null ? "" : String(content);
}

/** OpenAI 中枢 body → Gemini 上游 body（model 保留供 builder 摘入路径；system→systemInstruction；assistant→model） */
export function openaiToGemini(body: OpenAIChatBody): Record<string, unknown> {
  type M = OpenAIChatBody["messages"][number];
  const systemText = body.messages.filter((m: M) => m.role === "system").map((m: M) => textOf(m.content)).join("\n");
  const contents = body.messages
    .filter((m: M) => m.role !== "system")
    .map((m: M) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: textOf(m.content) }] }));
  const gc: Record<string, unknown> = {};
  if (body.max_tokens !== undefined) gc.maxOutputTokens = body.max_tokens;
  if (body.temperature !== undefined) gc.temperature = body.temperature;
  if (body.top_p !== undefined) gc.topP = body.top_p;
  const stop = body.stop ? (Array.isArray(body.stop) ? body.stop : [body.stop]) : undefined;
  if (stop && stop.length > 0) gc.stopSequences = stop;
  return {
    model: body.model,
    contents,
    ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
    ...(Object.keys(gc).length > 0 ? { generationConfig: gc } : {}),
  };
}

/** OpenAI 中枢 body → OpenAI Responses 上游 body（messages→input；system→instructions；max_tokens→max_output_tokens） */
export function openaiToResponses(body: OpenAIChatBody): Record<string, unknown> {
  type M = OpenAIChatBody["messages"][number];
  const instructions = body.messages.filter((m: M) => m.role === "system").map((m: M) => textOf(m.content)).join("\n");
  const input = body.messages
    .filter((m: M) => m.role !== "system")
    .map((m: M) => ({ role: m.role === "assistant" ? "assistant" : "user", content: textOf(m.content) }));
  return {
    model: body.model,
    input,
    ...(instructions ? { instructions } : {}),
    ...(body.max_tokens !== undefined ? { max_output_tokens: body.max_tokens } : {}),
    ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
    ...(body.top_p !== undefined ? { top_p: body.top_p } : {}),
  };
}

// ==================== 响应回转（上游 → 入口格式） ====================

/** 上游 Anthropic content 数组 → 纯文本（拼接全部 text 块） */
function anthropicContentText(json: Record<string, unknown>): string {
  const content: unknown[] = Array.isArray(json.content) ? json.content : [];
  return content
    .map((c: unknown) => (c && typeof c === "object" && (c as { text?: unknown }).text ? String((c as { text: unknown }).text) : ""))
    .join("");
}

/** 上游 OpenAI 响应 → Anthropic 客户端形状（usage 经两命名映射） */
export function openaiResponseToAnthropic(json: Record<string, unknown>): Record<string, unknown> {
  const choices = Array.isArray(json.choices) ? json.choices : [];
  const first = (choices[0] ?? {}) as { message?: { content?: unknown }; finish_reason?: unknown };
  const usage = (json.usage ?? {}) as { prompt_tokens?: number; completion_tokens?: number };
  const finish = first.finish_reason;
  return {
    id: json.id,
    model: json.model,
    role: "assistant",
    content: [{ type: "text", text: typeof first.message?.content === "string" ? first.message.content : "" }],
    stop_reason:
      finish === "stop" ? "end_turn" : finish === "length" ? "max_tokens" : (finish ?? null),
    stop_sequence: null,
    usage: { input_tokens: usage.prompt_tokens ?? 0, output_tokens: usage.completion_tokens ?? 0 },
  };
}

/** 上游 Anthropic 响应 → OpenAI 客户端形状 */
export function anthropicResponseToOpenai(json: Record<string, unknown>): Record<string, unknown> {
  const usage = (json.usage ?? {}) as { input_tokens?: number; output_tokens?: number };
  const prompt = usage.input_tokens ?? 0;
  const completion = usage.output_tokens ?? 0;
  const stop = json.stop_reason;
  return {
    id: json.id,
    model: json.model,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: anthropicContentText(json) },
        finish_reason: stop === "end_turn" ? "stop" : stop === "max_tokens" ? "length" : (stop ?? null),
      },
    ],
    usage: { prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion },
  };
}

/** 上游 Gemini 响应 → OpenAI 中枢形状（candidates[].content.parts[].text → message.content；usageMetadata → usage） */
export function geminiResponseToOpenai(json: Record<string, unknown>): Record<string, unknown> {
  const cands = Array.isArray(json.candidates) ? (json.candidates as Record<string, unknown>[]) : [];
  const first = (cands[0] ?? {}) as Record<string, unknown>;
  const content = (first.content ?? {}) as { parts?: unknown[] };
  const text = Array.isArray(content.parts)
    ? content.parts.map((p) => (p as { text?: unknown })?.text).filter((t) => typeof t === "string").join("")
    : "";
  const finish = first.finishReason;
  const um = (json.usageMetadata ?? {}) as { promptTokenCount?: number; candidatesTokenCount?: number };
  const prompt = um.promptTokenCount ?? 0;
  const completion = um.candidatesTokenCount ?? 0;
  return {
    id: typeof json.responseId === "string" ? json.responseId : `gemini-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: json.modelVersion ?? "",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: finish === "STOP" ? "stop" : finish === "MAX_TOKENS" ? "length" : finish ? String(finish).toLowerCase() : null,
      },
    ],
    usage: { prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion },
  };
}

/** 上游 OpenAI Responses 响应 → OpenAI 中枢形状（优先 output_text；回退 output[].content[].text；usage.input/output_tokens → prompt/completion） */
export function responsesResponseToOpenai(json: Record<string, unknown>): Record<string, unknown> {
  let text = typeof json.output_text === "string" ? json.output_text : "";
  if (!text && Array.isArray(json.output)) {
    for (const item of json.output as Record<string, unknown>[]) {
      const carr = Array.isArray(item.content) ? (item.content as Record<string, unknown>[]) : [];
      for (const c of carr) if (typeof c.text === "string") text += c.text;
    }
  }
  const u = (json.usage ?? {}) as { input_tokens?: number; output_tokens?: number };
  const prompt = u.input_tokens ?? 0;
  const completion = u.output_tokens ?? 0;
  return {
    id: json.id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: json.model ?? "",
    choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
    usage: { prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion },
  };
}

/** 上游响应 → 入口格式：同格式零拷贝；跨格式经 OpenAI 中枢扇入扇出 */
export function toClientResponse(
  clientFormat: GatewayFormat,
  upstreamFormat: GatewayFormat,
  upstreamJson: unknown
): Record<string, unknown> {
  const json = upstreamJson as Record<string, unknown>;
  if (clientFormat === upstreamFormat) return json; // 同格式零拷贝透传
  // 上游→OpenAI 中枢
  let hub: Record<string, unknown>;
  switch (upstreamFormat) {
    case "anthropic":
      hub = anthropicResponseToOpenai(json);
      break;
    case "gemini":
      hub = geminiResponseToOpenai(json);
      break;
    case "openai-responses":
      hub = responsesResponseToOpenai(json);
      break;
    default:
      hub = json; // openai
  }
  // 中枢→客户端（入口 clientFormat 实取 openai/anthropic；gemini/responses 由接入层 serializeAccessResponse 再转）
  if (clientFormat === "anthropic") return openaiResponseToAnthropic(hub);
  return hub;
}
