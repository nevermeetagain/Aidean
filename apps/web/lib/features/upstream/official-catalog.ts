/**
 * 官方平台目录（控制台 MVP 丁：N3）。
 *
 * 目的：让「官方平台 Key（自有账号）」面板有开箱可选的六大主流官方平台，
 * 而不是依赖数据库里恰好录入的 UPSTREAM 站点。
 *
 * 职责边界：
 *  - 只读常量目录，是种子数据与 `/user/station-keys/stations` 响应形状的唯一事实来源；
 *  - 不发起任何外部网络请求；baseUrl 仅作展示与种子落库，调用侧仍走 SSRF 治理（S1–S5）。
 *  - 平台「是否被收录」由本目录决定；模型清单为官方 API 对外标识（slug 口径）。
 *
 * 模型标识口径：与 AiModel.slug/modelCode 对齐（seed 中 `generateSlug(name)` 的结果），
 * 以保证网关 listCallableStations 的 models.has(nameDisplay) 与渠道 serves 模型可闭环。
 */

export interface OfficialPlatformEntry {
  /** 平台代码（唯一键；用于种子 upsert 与下拉排序） */
  code: string;
  /** 对外展示名 */
  name: string;
  /** 中文名 */
  nameCn: string;
  /** 官网 */
  website: string;
  /** 官方 API 根地址（调用侧拼 /chat/completions 或 /v1/messages） */
  baseUrl: string;
  /** 协议格式（OPENAI 兼容 / Anthropic 原生） */
  format: "openai" | "anthropic";
  /** 图标：本地路径优先，其次外链（受图片域白名单约束，见 url-policy） */
  icon: string;
  /** 品牌色（UI 占位徽标） */
  brandColor: string;
  /** 该平台对外提供的官方模型标识（slug 口径） */
  models: string[];
  /** 一句话说明（控制台展示） */
  description: string;
}

/** 六大主流官方平台目录（顺序即控制台下拉顺序） */
export const OFFICIAL_PLATFORM_CATALOG: OfficialPlatformEntry[] = [
  {
    code: "openai",
    name: "OpenAI",
    nameCn: "OpenAI",
    website: "https://openai.com",
    baseUrl: "https://api.openai.com/v1",
    format: "openai",
    icon: "/brands/openai.svg",
    brandColor: "#10a37f",
    models: ["gpt-4o", "gpt-4o-mini", "o1", "o3-mini"],
    description: "OpenAI 官方 API：GPT-4o / o 系列推理模型",
  },
  {
    code: "anthropic",
    name: "Anthropic",
    nameCn: "Anthropic",
    website: "https://anthropic.com",
    baseUrl: "https://api.anthropic.com",
    format: "anthropic",
    icon: "/brands/anthropic.svg",
    brandColor: "#d4a574",
    models: ["claude-3-7-sonnet", "claude-3-5-haiku", "claude-3-opus"],
    description: "Anthropic 官方 API：Claude 3.x 系列",
  },
  {
    code: "deepseek",
    name: "DeepSeek",
    nameCn: "DeepSeek",
    website: "https://platform.deepseek.com",
    baseUrl: "https://api.deepseek.com",
    format: "openai",
    icon: "/brands/deepseek.svg",
    brandColor: "#4d6bfe",
    models: ["deepseek-v3", "deepseek-r1", "deepseek-coder-v2", "deepseek-v2-5"],
    description: "DeepSeek 官方 API：V3 / R1 系列，成本友好",
  },
  {
    code: "moonshot",
    name: "Moonshot AI",
    nameCn: "月之暗面",
    website: "https://platform.moonshot.cn",
    baseUrl: "https://api.moonshot.cn/v1",
    format: "openai",
    icon: "/brands/moonshot.svg",
    brandColor: "#8b5cf6",
    models: ["kimi-k1-5", "moonshot-v1"],
    description: "月之暗面 Kimi 官方 API",
  },
  {
    code: "zhipu",
    name: "智谱 AI",
    nameCn: "智谱 AI",
    website: "https://open.bigmodel.cn",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    format: "openai",
    icon: "/brands/zhipu.svg",
    brandColor: "#3859ff",
    models: ["glm-4-plus", "glm-4-9b"],
    description: "智谱 AI GLM 系列官方 API",
  },
  {
    code: "qwen",
    name: "通义千问",
    nameCn: "通义千问",
    website: "https://dashscope.aliyun.com",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    format: "openai",
    icon: "/brands/qwen.svg",
    brandColor: "#615ced",
    models: ["qwen-max", "qwen-plus", "qwen-turbo", "qwen2-5-72b", "qwen-vl-max"],
    description: "阿里云通义千问官方 API（DashScope 兼容模式）",
  },
];

/** 按 code 取平台条目 */
export function findOfficialPlatform(code: string): OfficialPlatformEntry | undefined {
  return OFFICIAL_PLATFORM_CATALOG.find((p) => p.code === code);
}

/** 控制台下拉视图（不含敏感信息；直接给 API 序列化） */
export interface OfficialPlatformOption {
  code: string;
  name: string;
  nameCn: string;
  baseUrl: string;
  format: "openai" | "anthropic";
  icon: string;
  brandColor: string;
  models: string[];
  description: string;
}

export function toOfficialPlatformOption(entry: OfficialPlatformEntry): OfficialPlatformOption {
  return {
    code: entry.code,
    name: entry.name,
    nameCn: entry.nameCn,
    baseUrl: entry.baseUrl,
    format: entry.format,
    icon: entry.icon,
    brandColor: entry.brandColor,
    models: entry.models,
    description: entry.description,
  };
}