/**
 * OpenRouter API 类型定义
 * 所有字段均为 optional，防止 API 变更导致 break
 * 参考: https://openrouter.ai/docs/api
 */

export interface OpenRouterProvider {
  id?: string;
  name?: string;
  description?: string;
}

export interface OpenRouterArchitecture {
  modality?: string;  // "text->text", "text+image->text", etc.
  tokenizer?: string;
  instruct_type?: string | null;
}

export interface OpenRouterPricing {
  prompt?: number;        // USD per token
  completion?: number;    // USD per token
  image?: number;         // USD per image
  request?: number;       // USD per request
}

export interface OpenRouterModel {
  id?: string;                    // 模型唯一标识，如 "anthropic/claude-3.5-sonnet"
  name?: string;                  // 模型显示名称
  description?: string;
  context_length?: number;        // 上下文长度
  architecture?: OpenRouterArchitecture;
  pricing?: OpenRouterPricing;
  top_provider?: OpenRouterProvider;
  per_request_limits?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  } | null;
}

export interface OpenRouterResponse {
  data?: OpenRouterModel[];
}

// 内部使用的标准化模型结构
export interface StandardizedModel {
  modelCode: string;
  nameDisplay: string;
  description?: string;
  contextLength?: number;
  maxOutputTokens?: number;
  modelType?: string;
  protocol?: string;
  isMultiModal?: boolean;
  isReasoning?: boolean;
  isCodingOptimized?: boolean;
  tags?: string[];
  priceInput?: number;      // CNY per 1K tokens
  priceOutput?: number;     // CNY per 1K tokens
  priceImage?: number;      // CNY per image
  pricePerRequest?: number;
  providerName?: string;
  officialUrl?: string;
  docsUrl?: string;
  apiUrl?: string;
  architecture?: Record<string, any>;
  pricing?: Record<string, any>;
  rawData?: OpenRouterModel;
}
