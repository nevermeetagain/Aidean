/**
 * 网关响应「客户端侧」解析纯函数（WP-FE01 控制台调用链路）。
 *
 * 背景（现网实测，2026-09-14）：
 * - `/api/v1/gateway/chat` 的 stream=true 现存**两条**返回形态：
 *   a) 默认（`AIDEAN_GATEWAY_STREAM_PASSTHROUGH` 未置 1）：聚合路径——响应 `content-type: application/json`，
 *      体裁与非流式同形（OpenAI `choices[0].message.content` / Anthropic `content[].text`），服务端已把
 *      上游 SSE 攒流归一，客户端**拿不到增量**；
 *   b) 开关置 1：SSE 透传——响应 `content-type: text/event-stream` + 头 `x-aidean-stream: passthrough`，
 *      客户端需自行解析增量与 usage，并在流终态化后以流水为准对账（该路径响应头不含 `x-aidean-quota-minor`）。
 * - 因此前端**必须按 content-type 分支**：SSE 走增量累加，JSON 走单次渲染。本模块给出两条分支的纯解析口径，
 *   与服务端 `adapters.ts` 的 `readOpenAIChunk` / `readAnthropicEvent` 逐字段对齐，避免双端口径漂移。
 *
 * 本模块零依赖、零副作用、可在 client 组件中直接引用（不引 prisma / node 内置）。
 */

export type GatewayFormat = "openai" | "anthropic";

/**
 * 客户端接入格式（问题 5：调用测试台 4 格式）——与上游 GatewayFormat 正交。
 * 与 shared GATEWAY_ACCESS_FORMATS 同名同义（本模块零依赖，故本地声明）。
 */
export type GatewayAccessFormat = "openai" | "anthropic" | "openai-responses" | "gemini";

/** SSE `data:` 前缀与 OpenAI 流末哨兵（与服务端 adapters.ts 同字面量） */
const SSE_DATA_PREFIX = "data:";
/** OpenAI 流式末帧哨兵 */
const SSE_DONE_SENTINEL = "[DONE]";

export interface NormalizedUsage {
  promptTokens: number;
  completionTokens: number;
  /**
   * 缓存命中 tokens（上游缺失则不带此键）。
   * 口径与 @aidean/shared `NormalizedUsage.cachedTokens` 对齐：
   * OpenAI `prompt_tokens_details.cached_tokens` / DeepSeek 兼容 `prompt_cache_hit_tokens`；
   * Anthropic `cache_read_input_tokens`。
   */
  cachedTokens?: number;
  /** 推理 tokens（OpenAI `completion_tokens_details.reasoning_tokens`；Anthropic 无此口径） */
  reasoningTokens?: number;
}

/** 单条流事件归一结果 */
export interface StreamEvent {
  /** 本片段新增文本（无增量时为空串） */
  delta: string;
  /** 累计用量（出现即覆盖，语义同服务端 readOpenAIChunk/readAnthropicEvent） */
  usage?: NormalizedUsage;
  /** 上游终止哨兵已到达 */
  stop?: boolean;
}

/** 可选的明细字段：仅在值可解析为有限数时挂载，避免污染归一形状 */
function withTokenDetails(
  base: { promptTokens: number; completionTokens: number },
  cached: unknown,
  reasoning: unknown
): NormalizedUsage {
  const usage: NormalizedUsage = { ...base };
  const cachedNum = Number(cached);
  if (cached !== undefined && cached !== null && Number.isFinite(cachedNum)) usage.cachedTokens = cachedNum;
  const reasoningNum = Number(reasoning);
  if (reasoning !== undefined && reasoning !== null && Number.isFinite(reasoningNum)) {
    usage.reasoningTokens = reasoningNum;
  }
  return usage;
}

/**
 * 单条 SSE data 载荷 → 归一事件。
 * 返回 null 表示「与本口径无关或不可解析」——调用方按「忽略」处理（不阻断整条流）。
 */
export function parseStreamEvent(format: GatewayFormat, payload: string): StreamEvent | null {
  const raw = payload.trim();
  if (!raw) return null;
  if (raw === SSE_DONE_SENTINEL) return { delta: "", stop: true };

  let chunk: Record<string, unknown>;
  try {
    chunk = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (chunk === null || typeof chunk !== "object") return null;

  if (format === "openai") {
    const choices = Array.isArray(chunk.choices) ? chunk.choices : [];
    const first = (choices[0] ?? {}) as { delta?: { content?: unknown } };
    const usageRaw = chunk.usage as
      | {
          prompt_tokens?: unknown;
          completion_tokens?: unknown;
          prompt_tokens_details?: { cached_tokens?: unknown };
          prompt_cache_hit_tokens?: unknown;
          completion_tokens_details?: { reasoning_tokens?: unknown };
        }
      | undefined;
    const event: StreamEvent = {
      delta: typeof first.delta?.content === "string" ? first.delta.content : "",
    };
    if (usageRaw) {
      event.usage = withTokenDetails(
        {
          promptTokens: Number(usageRaw.prompt_tokens ?? 0),
          completionTokens: Number(usageRaw.completion_tokens ?? 0),
        },
        usageRaw.prompt_tokens_details?.cached_tokens ?? usageRaw.prompt_cache_hit_tokens,
        usageRaw.completion_tokens_details?.reasoning_tokens
      );
    }
    return event;
  }

  // Anthropic Messages 事件流
  const type = typeof chunk.type === "string" ? chunk.type : undefined;
  if (type === "content_block_delta") {
    const delta = chunk.delta as { text?: unknown } | undefined;
    return { delta: typeof delta?.text === "string" ? delta.text : "" };
  }
  if (type === "message_start") {
    const message = chunk.message as
      | { usage?: { input_tokens?: unknown; output_tokens?: unknown; cache_read_input_tokens?: unknown } }
      | undefined;
    if (message?.usage) {
      return {
        delta: "",
        usage: withTokenDetails(
          {
            promptTokens: Number(message.usage.input_tokens ?? 0),
            completionTokens: Number(message.usage.output_tokens ?? 0),
          },
          message.usage.cache_read_input_tokens,
          undefined
        ),
      };
    }
    return { delta: "" };
  }
  if (type === "message_delta") {
    const usage = chunk.usage as
      | { input_tokens?: unknown; output_tokens?: unknown; cache_read_input_tokens?: unknown }
      | undefined;
    if (usage) {
      return {
        delta: "",
        usage: withTokenDetails(
          {
            // message_delta 仅携带 output_tokens 增量口径，input 侧缺省由调用方沿用已有值
            promptTokens: usage.input_tokens === undefined ? Number.NaN : Number(usage.input_tokens),
            completionTokens: Number(usage.output_tokens ?? 0),
          },
          usage.cache_read_input_tokens,
          undefined
        ),
      };
    }
    return { delta: "" };
  }
  if (type === "message_stop") return { delta: "", stop: true };
  return { delta: "" };
}

export interface StreamSnapshot {
  text: string;
  promptTokens: number;
  completionTokens: number;
  /** 缓存命中 tokens（上游未提供则为 undefined） */
  cachedTokens?: number;
  /** 推理 tokens（上游未提供则为 undefined） */
  reasoningTokens?: number;
  /** 是否收到上游终止哨兵（缺 usage 时用于「已结束但用量待结算」判别） */
  stopped: boolean;
  /** 已消费的 SSE 帧数（含不可解析帧，仅作诊断） */
  frames: number;
}

/**
 * 流式累加器：喂入任意切片的文本，回吐本次新增事件。
 * 内部维护半行缓冲（SSE 帧可跨 chunk 边界切断），并在 finish() 时补解析残留尾行
 * ——与服务端「末片不带 \n 即丢末帧 usage」的 flush 口径一致。
 */
export function createStreamAccumulator(format: GatewayFormat) {
  let buffer = "";
  let text = "";
  let promptTokens = 0;
  let completionTokens = 0;
  let cachedTokens: number | undefined;
  let reasoningTokens: number | undefined;
  let hasUsage = false;
  let stopped = false;
  let frames = 0;

  function consumeLine(line: string): StreamEvent | null {
    const trimmed = line.trim();
    if (!trimmed.startsWith(SSE_DATA_PREFIX)) return null;
    const payload = trimmed.slice(SSE_DATA_PREFIX.length);
    const event = parseStreamEvent(format, payload);
    if (!event) return null;
    frames += 1;
    if (event.delta) text += event.delta;
    if (event.usage) {
      // Anthropic message_delta 的 input 侧以 NaN 表示「本帧未携带」→ 沿用既有值
      promptTokens = Number.isNaN(event.usage.promptTokens) ? promptTokens : event.usage.promptTokens;
      completionTokens = event.usage.completionTokens;
      if (event.usage.cachedTokens !== undefined) cachedTokens = event.usage.cachedTokens;
      if (event.usage.reasoningTokens !== undefined) reasoningTokens = event.usage.reasoningTokens;
      hasUsage = true;
    }
    if (event.stop) stopped = true;
    return event;
  }

  return {
    /** 喂入一个网络切片，返回本切片内解析出的有效事件（按行序） */
    push(slice: string): StreamEvent[] {
      buffer += slice;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // 半行留待下一片
      const events: StreamEvent[] = [];
      for (const line of lines) {
        const event = consumeLine(line);
        if (event) events.push(event);
      }
      return events;
    },
    /** 流结束：补解析残留尾行（末帧可能无换行），返回其事件（无则 null） */
    finish(): StreamEvent | null {
      const result = buffer.trim() ? consumeLine(buffer) : null;
      buffer = "";
      return result;
    },
    snapshot(): StreamSnapshot {
      return {
        text,
        promptTokens,
        completionTokens,
        ...(cachedTokens === undefined ? {} : { cachedTokens }),
        ...(reasoningTokens === undefined ? {} : { reasoningTokens }),
        stopped,
        frames,
      };
    },
    /** 是否已捕获到上游 usage（缺省时 UI 应提示「用量以流水为准」） */
    hasUsage(): boolean {
      return hasUsage;
    },
  };
}

export type StreamAccumulator = ReturnType<typeof createStreamAccumulator>;

/** content-type → 是否 SSE 透传路径 */
export function isSseResponse(contentType: string | null | undefined): boolean {
  return (contentType ?? "").toLowerCase().includes("text/event-stream");
}

/**
 * 聚合/非流式 JSON 体 → 归一文本与用量。
 * OpenAI：`choices[0].message.content`；Anthropic：`content[]` 中 `type==="text"` 的 `text` 拼接。
 * usage 同时兼容两套命名（prompt_tokens/completion_tokens 与 input_tokens/output_tokens）。
 */
export function parseAggregatedBody(
  format: GatewayFormat,
  body: unknown
): { text: string; usage: NormalizedUsage | null } {
  if (body === null || typeof body !== "object") return { text: "", usage: null };
  const obj = body as Record<string, unknown>;

  let text = "";
  if (format === "openai") {
    const choices = Array.isArray(obj.choices) ? obj.choices : [];
    const first = (choices[0] ?? {}) as { message?: { content?: unknown }; text?: unknown };
    if (typeof first.message?.content === "string") text = first.message.content;
    else if (typeof first.text === "string") text = first.text;
  } else {
    const blocks = Array.isArray(obj.content) ? obj.content : [];
    text = blocks
      .map((b) => {
        const block = b as { type?: unknown; text?: unknown };
        return block?.type === "text" && typeof block.text === "string" ? block.text : "";
      })
      .join("");
  }

  const usageRaw = obj.usage as
    | {
        prompt_tokens?: unknown;
        completion_tokens?: unknown;
        input_tokens?: unknown;
        output_tokens?: unknown;
        prompt_tokens_details?: { cached_tokens?: unknown };
        prompt_cache_hit_tokens?: unknown;
        completion_tokens_details?: { reasoning_tokens?: unknown };
        cache_read_input_tokens?: unknown;
      }
    | undefined;
  let usage: NormalizedUsage | null = null;
  if (usageRaw) {
    usage = withTokenDetails(
      {
        promptTokens: Number(usageRaw.prompt_tokens ?? usageRaw.input_tokens ?? 0),
        completionTokens: Number(usageRaw.completion_tokens ?? usageRaw.output_tokens ?? 0),
      },
      usageRaw.prompt_tokens_details?.cached_tokens ??
        usageRaw.prompt_cache_hit_tokens ??
        usageRaw.cache_read_input_tokens,
      usageRaw.completion_tokens_details?.reasoning_tokens
    );
  }
  return { text, usage };
}

/**
 * 接入格式聚合/非流 JSON 体 → 文本与用量（问题 5）。
 * openai/anthropic 委托 parseAggregatedBody；openai-responses 取 output_text/output[].content[]；gemini 取 candidates[].content.parts[].text。
 */
export function parseAccessAggregatedBody(
  access: GatewayAccessFormat,
  body: unknown
): { text: string; usage: NormalizedUsage | null } {
  if (access === "openai" || access === "anthropic") return parseAggregatedBody(access, body);
  if (body === null || typeof body !== "object") return { text: "", usage: null };
  const obj = body as Record<string, unknown>;
  if (access === "openai-responses") {
    let text = typeof obj.output_text === "string" ? obj.output_text : "";
    if (!text) {
      const output = Array.isArray(obj.output) ? obj.output : [];
      text = output
        .map((o) => {
          const content = (o as { content?: unknown })?.content;
          const blocks = Array.isArray(content) ? content : [];
          return blocks
            .map((bl) => {
              const b = bl as { text?: unknown };
              return typeof b?.text === "string" ? b.text : "";
            })
            .join("");
        })
        .join("");
    }
    const u = obj.usage as { input_tokens?: unknown; output_tokens?: unknown } | undefined;
    const usage: NormalizedUsage | null = u
      ? { promptTokens: Number(u.input_tokens ?? 0) || 0, completionTokens: Number(u.output_tokens ?? 0) || 0 }
      : null;
    return { text, usage };
  }
  // gemini generateContent
  const candidates = Array.isArray(obj.candidates) ? obj.candidates : [];
  const text = candidates
    .map((c) => {
      const parts = (c as { content?: { parts?: unknown } })?.content?.parts;
      const arr = Array.isArray(parts) ? parts : [];
      return arr
        .map((p) => {
          const pp = p as { text?: unknown };
          return typeof pp?.text === "string" ? pp.text : "";
        })
        .join("");
    })
    .join("");
  const um = obj.usageMetadata as { promptTokenCount?: unknown; candidatesTokenCount?: unknown } | undefined;
  const usage: NormalizedUsage | null = um
    ? { promptTokens: Number(um.promptTokenCount ?? 0) || 0, completionTokens: Number(um.candidatesTokenCount ?? 0) || 0 }
    : null;
  return { text, usage };
}

/** 网关业务错误码 → 用户可执行的中文引导（WP-FE01 §验收：空错态有文案动作） */
export interface GatewayErrorHint {
  title: string;
  /** 处置建议（可执行动作） */
  action: string;
  /** 是否建议跳转充值 */
  recharge?: boolean;
  /** 是否可原样重试（换幂等键） */
  retryable: boolean;
}

const ERROR_HINTS: Record<number, GatewayErrorHint> = {
  10004: { title: "登录状态已失效", action: "请重新登录后再发起调用。", retryable: false },
  10006: { title: "请求过于频繁", action: "稍候片刻再重试。", retryable: true },
  30001: { title: "站点暂不可用", action: "已自动尝试降级链路，可稍后重试。", retryable: true },
  30002: { title: "无可用路由", action: "该模型当前没有可调用站点，请联系管理员或换用其它模型。", retryable: false },
  30003: { title: "候选链路全部失败", action: "所有可用站点均调用失败，稍后重试或换用其它模型。", retryable: true },
  30004: { title: "上游返回错误", action: "上游服务异常，稍后重试。", retryable: true },
  40000: { title: "请求不合法或幂等键重复", action: "检查参数；若为重复提交，点击重试将自动换用新的幂等键。", retryable: true },
  40001: { title: "余额不足", action: "扣费失败，请先充值后重试。", recharge: true, retryable: false },
  40003: { title: "订单状态异常", action: "请刷新页面后重试。", retryable: false },
  50000: { title: "服务内部错误", action: "稍后重试；若持续出现请联系管理员。", retryable: true },
};

/** 业务码 → 引导文案；未知码给出通用可重试提示 */
export function gatewayErrorHint(code: number, fallbackMessage?: string): GatewayErrorHint {
  const hit = ERROR_HINTS[code];
  if (hit) return hit;
  return {
    title: fallbackMessage?.trim() || "调用失败",
    action: "稍后重试；若持续出现请联系管理员。",
    retryable: true,
  };
}

/** 分（minor）→ 元字符串（两位小数）；非有限值回退 "0.00"。与 shared fenToYuan 同口径的容错版 */
export function minorToYuan(minor: number | null | undefined): string {
  if (minor === null || minor === undefined || !Number.isFinite(minor)) return "0.00";
  return (minor / 100).toFixed(2);
}

/** 计费路径 → 中文标签（与 /user/balance 流水口径一致） */
export const BILLING_PATH_LABELS: Record<string, string> = {
  PLATFORM: "平台余额",
  UPSTREAM: "自有 Key 上游",
  PACKAGE: "套餐额度",
  FREE_PROXY: "自定义渠道（免费代理）",
  FREE_QUOTA: "免费额度",
};

export function billingPathLabel(path: string | null | undefined): string {
  if (!path) return "—";
  return BILLING_PATH_LABELS[path] ?? path;
}
