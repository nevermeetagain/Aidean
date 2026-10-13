// 统一计费网关公开契约。
// 红线:平台内部加价系数与 token 计费倍率等敏感定价参数永不进入本文件(由网关核心与管理端白名单序列化层持有)。
// 鉴权口径:网关 MVP 仅 JWT 会话（v2.0 schema 无 user_api_keys 表）；入口按 body 形态判别格式（真实 SDK 客户端不带 format 字段）。
import { z } from "zod";
import { GATEWAY_FORMATS, PRIORITY_MIN, PRIORITY_MAX } from "../constants/gateway.constants";

// ==================== 入口请求（双格式，按形态判别） ====================

/** OpenAI /chat/completions 语义（MVP：content 仅字符串；数组分块留待流式阶段一并扩展） */
export const OpenAIChatBodySchema = z.object({
  model: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant", "tool"]),
        content: z.string(),
      }),
    )
    .min(1),
  stream: z.boolean().optional(),
  max_tokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
});
export type OpenAIChatBody = z.infer<typeof OpenAIChatBodySchema>;

/** Anthropic /v1/messages 语义（max_tokens 官方必填；system 顶层字符串） */
export const AnthropicChatBodySchema = z.object({
  model: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1),
  max_tokens: z.number().int().positive(),
  system: z.string().optional(),
  stream: z.boolean().optional(),
  temperature: z.number().min(0).max(1).optional(),
  top_p: z.number().min(0).max(1).optional(),
  stop_sequences: z.array(z.string()).optional(),
});
export type AnthropicChatBody = z.infer<typeof AnthropicChatBodySchema>;

/**
 * 形态判别（确定性规则，公开契约）：
 * 1) 顶层 `system` 或 `stop_sequences` 存在 → anthropic（OpenAI 无此二字段）；
 * 2) 其余一律 openai。Anthropic 极简请求（无 system）按 openai 解析语义无损
 *    （roles 为 openai 子集，max_tokens 透传），中转链路不受影响。
 */
export function detectGatewayFormat(body: unknown): (typeof GATEWAY_FORMATS)[number] {
  if (body !== null && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if ("system" in b || "stop_sequences" in b) return "anthropic";
  }
  return "openai";
}

/** 网关入口请求（双格式 union；判别用 detectGatewayFormat，格式字段不入契约） */
export const GatewayChatSchema = z.union([OpenAIChatBodySchema, AnthropicChatBodySchema]);
export type GatewayChat = z.infer<typeof GatewayChatSchema>;

// ==================== 客户端接入格式（问题 5：调用测试台 4 格式） ====================
// 与上游协议格式（GATEWAY_FORMATS: openai/anthropic，决定网关与上游怎么说话）正交：
// 接入格式 = 客户端用什么 API 体裁访问统一入口。openai-responses / gemini 在入口归一为内部
// OpenAI 形态 GatewayChat（stream 剔除→服务端走聚合），上游仍走 openai/anthropic，响应再序列化回接入体裁。

export const GATEWAY_ACCESS_FORMATS = ["openai", "anthropic", "openai-responses", "gemini"] as const;
export type GatewayAccessFormat = (typeof GATEWAY_ACCESS_FORMATS)[number];

/** 接入格式形态判别（确定性规则，优先于内部 detectGatewayFormat）：
 * 1) contents 数组 → gemini（generateContent）；2) input 且无 messages → openai-responses；
 * 3) 顶层 system/stop_sequences → anthropic；其余 → openai。 */
export function detectAccessFormat(body: unknown): GatewayAccessFormat {
  if (body !== null && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (Array.isArray(b.contents)) return "gemini";
    if ("input" in b && !("messages" in b)) return "openai-responses";
    if ("system" in b || "stop_sequences" in b) return "anthropic";
  }
  return "openai";
}

/** 任意 content 体裁（字符串 / [{type,text}] 分块 / parts 数组）→ 拼接纯文本 */
function flattenText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part === null || typeof part !== "object") return "";
        const p = part as Record<string, unknown>;
        if (typeof p.text === "string") return p.text;
        if (Array.isArray(p.parts)) return flattenText(p.parts); // gemini systemInstruction:{parts:[]}
        return "";
      })
      .join("");
  }
  if (content !== null && typeof content === "object") {
    const c = content as Record<string, unknown>;
    if (Array.isArray(c.parts)) return flattenText(c.parts);
    if (Array.isArray(c.content)) return flattenText(c.content);
  }
  return "";
}

/** 正整数提取（非法/缺省 → null） */
function posInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

/** 任一接入格式 body → 内部 OpenAI 形态 GatewayChat（仅 responses/gemini 需转换；openai/anthropic 原样）。 */
export function normalizeAccessRequest(access: GatewayAccessFormat, raw: unknown): OpenAIChatBody {
  const b = (raw ?? {}) as Record<string, unknown>;
  const model = String(b.model ?? "");
  const messages: OpenAIChatBody["messages"] = [];
  const temperature = typeof b.temperature === "number" ? Math.min(2, Math.max(0, b.temperature)) : undefined;
  if (access === "openai-responses") {
    const instructions = typeof b.instructions === "string" ? b.instructions : "";
    if (instructions) messages.push({ role: "system", content: instructions });
    const input = b.input;
    if (typeof input === "string") {
      if (input) messages.push({ role: "user", content: input });
    } else if (Array.isArray(input)) {
      for (const item of input) {
        const it = (item ?? {}) as Record<string, unknown>;
        const text = flattenText(it.content);
        if (!text) continue;
        const role = it.role === "assistant" ? "assistant" : it.role === "system" ? "system" : "user";
        messages.push({ role, content: text });
      }
    }
    const maxTokens = posInt(b.max_output_tokens);
    return {
      model,
      messages: messages.length > 0 ? messages : [{ role: "user", content: "" }],
      ...(maxTokens !== null ? { max_tokens: maxTokens } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
    };
  }
  // gemini
  const sysText = flattenText(b.systemInstruction ?? b.system_instruction);
  if (sysText) messages.push({ role: "system", content: sysText });
  const contents = Array.isArray(b.contents) ? b.contents : [];
  for (const c of contents) {
    const cc = (c ?? {}) as Record<string, unknown>;
    const text = flattenText(cc.parts ?? cc.content);
    if (!text) continue;
    messages.push({ role: cc.role === "model" ? "assistant" : "user", content: text });
  }
  const gc = (b.generationConfig ?? b.generation_config ?? {}) as Record<string, unknown>;
  const maxTokens = posInt(gc.maxOutputTokens ?? gc.max_output_tokens);
  const topP = typeof gc.topP === "number" ? gc.topP : undefined;
  const stopSequences = Array.isArray(gc.stopSequences) ? gc.stopSequences.map(String) : undefined;
  return {
    model,
    messages: messages.length > 0 ? messages : [{ role: "user", content: "" }],
    ...(maxTokens !== null ? { max_tokens: maxTokens } : {}),
    ...(temperature !== undefined ? { temperature } : {}),
    ...(topP !== undefined ? { top_p: topP } : {}),
    ...(stopSequences && stopSequences.length > 0 ? { stop: stopSequences } : {}),
  };
}

/** 内部 OpenAI 响应体 → 接入格式响应体（responses/gemini；openai/anthropic 原样）。 */
export function serializeAccessResponse(
  access: GatewayAccessFormat,
  internal: unknown,
  requestId: string
): unknown {
  const obj = (internal ?? {}) as Record<string, unknown>;
  // 抽取 openai 形态文本与 usage（入口已归一为 openai，上游响应经 toClientResponse(openai) 回 openai 形）
  const choices = Array.isArray(obj.choices) ? (obj.choices as Record<string, unknown>[]) : [];
  const first = (choices[0] ?? {}) as Record<string, unknown>;
  const message = (first.message ?? {}) as Record<string, unknown>;
  const text = typeof message.content === "string" ? message.content : typeof first.text === "string" ? first.text : "";
  const usage = (obj.usage ?? {}) as Record<string, unknown>;
  const prompt = Number(usage.prompt_tokens ?? usage.input_tokens ?? 0) || 0;
  const completion = Number(usage.completion_tokens ?? usage.output_tokens ?? 0) || 0;
  if (access === "openai-responses") {
    return {
      id: typeof obj.id === "string" ? obj.id : `resp_${requestId}`,
      object: "response",
      status: "completed",
      model: obj.model,
      output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text, annotations: [] }] }],
      output_text: text,
      usage: { input_tokens: prompt, output_tokens: completion, total_tokens: prompt + completion },
    };
  }
  // gemini
  return {
    candidates: [
      { index: 0, content: { role: "model", parts: [{ text }] }, finishReason: "STOP" },
    ],
    usageMetadata: { promptTokenCount: prompt, candidatesTokenCount: completion, totalTokenCount: prompt + completion },
    modelVersion: obj.model,
  };
}

// ==================== 上游响应归一（usage 两命名 union） ====================

/** OpenAI 上游 usage 命名（官方响应恒回传，字段必填——保证与 Anthropic 命名在 union 中可判别） */
export const OpenAIUsageSchema = z.object({
  prompt_tokens: z.number().int().nonnegative(),
  completion_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative().optional(),
  /** 缓存命中明细（OpenAI 官方 prompt_tokens_details；DeepSeek 兼容 prompt_cache_hit_tokens） */
  prompt_tokens_details: z.object({ cached_tokens: z.number().int().nonnegative().optional() }).optional(),
  prompt_cache_hit_tokens: z.number().int().nonnegative().optional(),
  completion_tokens_details: z.object({ reasoning_tokens: z.number().int().nonnegative().optional() }).optional(),
});
/** Anthropic 上游 usage 命名（cache_read/creation 为 prompt caching 可选字段） */
export const AnthropicUsageSchema = z.object({
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  cache_read_input_tokens: z.number().int().nonnegative().optional(),
  cache_creation_input_tokens: z.number().int().nonnegative().optional(),
});
/** 上游 usage（两命名 union，解析后统一为 prompt/completion 口径） */
export const UpstreamUsageSchema = z.union([OpenAIUsageSchema, AnthropicUsageSchema]);
export type UpstreamUsage = z.infer<typeof UpstreamUsageSchema>;

/** usage 统一口径（计费/落库唯一形状；cached/reasoning 上游缺失时缺省，落库前 `?? 0`） */
export interface NormalizedUsage {
  promptTokens: number;
  completionTokens: number;
  cachedTokens?: number;
  reasoningTokens?: number;
}

export function normalizeUsage(u: UpstreamUsage): NormalizedUsage {
  if ("prompt_tokens" in u) {
    const cached = u.prompt_tokens_details?.cached_tokens ?? u.prompt_cache_hit_tokens;
    const reasoning = u.completion_tokens_details?.reasoning_tokens;
    return {
      promptTokens: u.prompt_tokens,
      completionTokens: u.completion_tokens,
      ...(cached !== undefined ? { cachedTokens: cached } : {}),
      ...(reasoning !== undefined ? { reasoningTokens: reasoning } : {}),
    };
  }
  const cached = u.cache_read_input_tokens;
  return {
    promptTokens: u.input_tokens,
    completionTokens: u.output_tokens,
    ...(cached !== undefined ? { cachedTokens: cached } : {}),
  };
}

/** 上游响应最小解析面：网关仅依赖 choices/content 文本与 usage 计费，其余字段透传回客户端 */
export const UpstreamResponseSchema = z.object({
  usage: UpstreamUsageSchema.optional(),
});
export type UpstreamResponse = z.infer<typeof UpstreamResponseSchema>;

// ==================== 用量/配置视图 ====================

/** usage_logs 单条视图（/user/usage） */
export const UsageLogViewSchema = z.object({
  id: z.string().min(1),
  model: z.string(),
  stationName: z.string().nullable().optional(),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  quotaYuan: z.string(),
  billingPath: z.enum(["PLATFORM", "UPSTREAM", "PACKAGE", "FREE_PROXY", "FREE_QUOTA"]),
  latencyMs: z.number().int().nonnegative().nullable().optional(),
  statusCode: z.number().int().nullable().optional(),
  createdAt: z.string(),
});
export type UsageLogView = z.infer<typeof UsageLogViewSchema>;

export const UsagePageSchema = z.object({
  items: z.array(UsageLogViewSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type UsagePage = z.infer<typeof UsagePageSchema>;

/** /user/usage 查询入参 */
export const UsageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  model: z.string().optional(),
  billingPath: z.enum(["PLATFORM", "UPSTREAM", "PACKAGE", "FREE_PROXY", "FREE_QUOTA"]).optional(),
});
export type UsageQuery = z.infer<typeof UsageQuerySchema>;

/** /user/usage/stats 统计区间（WF-21）：预设 7d/30d/90d；自定义日期窗口由 dateFrom/dateTo 控制（≤92 天） */
export const USAGE_STATS_RANGES = ["7d", "30d", "90d"] as const;
/** 自定义统计窗口硬上限（天）：防扫大表无界查询 */
export const USAGE_STATS_MAX_WINDOW_DAYS = 92;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 校验自定义日期窗口：成对、有序、≤上限；返回天数（含端点） */
export function validateUsageWindow(dateFrom?: string, dateTo?: string): { ok: boolean; days: number; message?: string } {
  if (!dateFrom && !dateTo) return { ok: true, days: 0 };
  if (!dateFrom || !dateTo) return { ok: false, days: 0, message: "dateFrom 与 dateTo 须成对提供" };
  if (!ISO_DATE_RE.test(dateFrom) || !ISO_DATE_RE.test(dateTo)) {
    return { ok: false, days: 0, message: "日期须为 YYYY-MM-DD" };
  }
  const a = new Date(`${dateFrom}T00:00:00`);
  const b = new Date(`${dateTo}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || a > b) {
    return { ok: false, days: 0, message: "dateTo 须不早于 dateFrom" };
  }
  const days = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
  if (days > USAGE_STATS_MAX_WINDOW_DAYS) {
    return { ok: false, days, message: `自定义区间上限 ${USAGE_STATS_MAX_WINDOW_DAYS} 天` };
  }
  return { ok: true, days };
}

/** /user/usage/stats 查询入参：range（缺省 30d）或 dateFrom+dateTo 二选一；日期优先 */
export const UsageStatsQuerySchema = z
  .object({
    range: z.enum(USAGE_STATS_RANGES).default("30d"),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .refine((q) => validateUsageWindow(q.dateFrom, q.dateTo).ok, {
    message: "自定义日期区间非法（需成对、有序、≤92 天）",
  });
export type UsageStatsQuery = z.infer<typeof UsageStatsQuerySchema>;

/** 按日统计点（day=YYYY-MM-DD 本地零点口径；金额已是元字符串，与 UsageLogView 同口径） */
export const UsageStatsDailyPointSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requestCount: z.number().int().nonnegative(),
  tokens: z.number().int().nonnegative(),
  quotaYuan: z.string(),
});
export type UsageStatsDailyPoint = z.infer<typeof UsageStatsDailyPointSchema>;

/** 模型维度统计行（TopN=10，按 tokens 降序） */
export const UsageStatsModelRowSchema = z.object({
  model: z.string().min(1),
  requestCount: z.number().int().nonnegative(),
  tokens: z.number().int().nonnegative(),
  quotaYuan: z.string(),
});
export type UsageStatsModelRow = z.infer<typeof UsageStatsModelRowSchema>;

/** 统计视图（区间汇总 + 零填充日序列 + 模型排行；range 与自定义窗口二选一，from/to 为窗口端点） */
export const UsageStatsViewSchema = z.object({
  range: z.enum(USAGE_STATS_RANGES).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  summary: z.object({
    totalRequests: z.number().int().nonnegative(),
    totalTokens: z.number().int().nonnegative(),
    totalQuotaYuan: z.string(),
  }),
  daily: z.array(UsageStatsDailyPointSchema),
  models: z.array(UsageStatsModelRowSchema),
});
export type UsageStatsView = z.infer<typeof UsageStatsViewSchema>;

/** 计费路径枚举（与 Prisma UsageBillingPath 展示口径一致） */
export const BILLING_PATH_VALUES = ["PLATFORM", "UPSTREAM", "PACKAGE", "FREE_PROXY", "FREE_QUOTA"] as const;
export type BillingPathValue = (typeof BILLING_PATH_VALUES)[number];

/** 消耗明细矩阵行：来源（站点/自定义渠道）× 模型 × 计费路径 */
export const UsageBreakdownRowSchema = z.object({
  sourceType: z.enum(["station", "channel", "platform"]),
  source: z.string().min(1), // 展示名（站点显示名 / 渠道名 / "平台"）
  model: z.string().min(1),
  billingPath: z.enum(BILLING_PATH_VALUES),
  requestCount: z.number().int().nonnegative(),
  tokens: z.number().int().nonnegative(),
  quotaYuan: z.string(),
});
export type UsageBreakdownRow = z.infer<typeof UsageBreakdownRowSchema>;

/** /user/usage/breakdown 查询：range 或 dateFrom+dateTo（同源校验） */
export const UsageBreakdownQuerySchema = z
  .object({
    range: z.enum(USAGE_STATS_RANGES).default("30d"),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .refine((q) => validateUsageWindow(q.dateFrom, q.dateTo).ok, {
    message: "自定义日期区间非法（需成对、有序、≤92 天）",
  });
export type UsageBreakdownQuery = z.infer<typeof UsageBreakdownQuerySchema>

/** 消耗明细矩阵视图（多维交叉 + 汇总） */
export const UsageBreakdownViewSchema = z.object({
  from: z.string(),
  to: z.string(),
  summary: z.object({
    totalRequests: z.number().int().nonnegative(),
    totalTokens: z.number().int().nonnegative(),
    totalQuotaYuan: z.string(),
  }),
  rows: z.array(UsageBreakdownRowSchema),
});
export type UsageBreakdownView = z.infer<typeof UsageBreakdownViewSchema>;

/** 自定义渠道视图（apiKey 恒掩码，任何接口不回显明文） */
export const CustomChannelViewSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  baseUrl: z.string().url(),
  format: z.enum(GATEWAY_FORMATS),
  isActive: z.boolean(),
  apiKeyMasked: z.string().min(1),
  createdAt: z.string(),
  models: z.array(z.string().min(1)).optional(),
  priority: z.number().int().optional(),
  groupName: z.string().nullable().optional(),
  weight: z.number().int().optional(),
});
export type CustomChannelView = z.infer<typeof CustomChannelViewSchema>;

export const CustomChannelUpsertSchema = z.object({
  name: z.string().min(1).max(64),
  baseUrl: z.string().url(),
  apiKey: z.string().min(8),
  format: z.enum(GATEWAY_FORMATS).default("openai"),
  /** 适用模型白名单；空=适配全部模型（向后兼容默认） */
  models: z.array(z.string().min(1)).optional(),
  /** 优先级：数值小者优先；默认 100（越晚录入越靠后） */
  priority: z.number().int().min(1).max(999).default(100).optional(),
  /** 分组标签；null=未分组 */
  groupName: z.string().min(1).max(32).nullable().optional(),
  /** 加权（并发分摊解释 A：同级渠道按 weight 加权挑选）；默认 1 */
  weight: z.number().int().min(1).max(100).default(1).optional(),
});
export type CustomChannelUpsert = z.infer<typeof CustomChannelUpsertSchema>;

/** 渠道部分更新（PATCH）：字段全可选；apiKey 缺省=不换密钥（改名/改 URL/启停免重填）；至少一项 */
export const CustomChannelPatchSchema = z
  .object({
    name: z.string().min(1).max(64).optional(),
    baseUrl: z.string().url().optional(),
    apiKey: z.string().min(8).optional(),
    format: z.enum(GATEWAY_FORMATS).optional(),
    isActive: z.boolean().optional(),
    models: z.array(z.string().min(1)).optional(),
    priority: z.number().int().min(1).max(999).optional(),
    groupName: z.string().min(1).max(32).nullable().optional(),
    weight: z.number().int().min(1).max(100).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "至少提供一个待更新字段" });
export type CustomChannelPatch = z.infer<typeof CustomChannelPatchSchema>;

/** 优先级提示（内部保留字段占位；MVP 客户端不可控优先级，防越权） */
export const PRIORITY_HINT_NOTE = `客户端不可指定优先级（${PRIORITY_MIN}~${PRIORITY_MAX} 由用户控制台配置决定）`;

/** apiKey 掩码：保留前 3 与后 4，中间 ****；过短全掩码 */
export function maskApiKey(key: string): string {
  if (key.length <= 7) return "****";
  return `${key.slice(0, 3)}****${key.slice(-4)}`;
}

/** API 渠道来源类别（乙 · 后端统一：kind 归一 station/custom） */
export const CHANNEL_KINDS = ["station", "custom"] as const;
export type ApiChannelKind = (typeof CHANNEL_KINDS)[number];

/**
 * API 渠道聚合视图（乙 · 后端统一）。
 *
 * 数据源：`station_user_keys`（join `api_stations`）∪ `custom_channels`，**数据库为唯一事实源**——
 * 不合成 `catalog:<code>` 伪行（未落库的平台在渠道列表不出现）。
 * 脱敏：`apiKeyMasked` 为 key_mask 冗余列，明文/密文永不出 service 层。
 * 排序：custom 按 priority asc, createdAt asc；station 按 createdAt desc；结果 custom 在前、station 在后。
 * 可选字段按 kind 分派：station 无 priority/groupName/weight；custom 无 stationId。
 */
export const ApiChannelViewSchema = z.object({
  kind: z.enum(CHANNEL_KINDS),
  /** 行 id（station=station_user_keys.id；custom=custom_channels.id） */
  id: z.string().min(1),
  /** 展示名（station=api_stations.displayName；custom=用户自填 name） */
  name: z.string().min(1),
  baseUrl: z.string().url().nullable(),
  format: z.enum(GATEWAY_FORMATS),
  /** 适用模型白名单；空数组=不限模型 */
  models: z.array(z.string().min(1)).default([]),
  isActive: z.boolean(),
  apiKeyMasked: z.string().min(1),
  createdAt: z.string(),
  /** kind=station 专属 */
  stationId: z.string().min(1).optional(),
  /** kind=custom 专属：优先级（数值越小越优先） */
  priority: z.number().int().optional(),
  /** kind=custom 专属：可选分组标签 */
  groupName: z.string().nullable().optional(),
  /** kind=custom 专属：同优先级组内加权分摊系数 */
  weight: z.number().int().optional(),
});
export type ApiChannelView = z.infer<typeof ApiChannelViewSchema>;
