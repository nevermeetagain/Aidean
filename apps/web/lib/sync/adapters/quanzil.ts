/**
 * QuanzilAdapter — sync adapter for quanzil.com pricing API.
 *
 * Data source: https://quanzil.com/api/pricing
 * Returns: 367 models with pricing, vendor, type, and capability tags.
 *
 * quanzil.com is a Chinese AI API relay station (One API/New API architecture)
 * that aggregates models from OpenAI, Anthropic, Google, xAI, DeepSeek, etc.
 * Pricing is expressed as ratios relative to a base rate of $2/M tokens.
 *
 * R-71: 聚合采集——quanzil.com 作为中国区价格交叉验证源，
 * 与 OpenRouter 主源的价格数据进行比对，冲突写入 validationSummary。
 *
 * 字段映射：
 * - model_name → modelCode
 * - vendor_id → vendors[] 查表 → vendorName
 * - model_ratio × BASE_RATE → inputPrice (USD per M tokens)
 * - model_ratio × completion_ratio × BASE_RATE → outputPrice
 * - model_type (中文) → 推断 isMultiModal / isReasoning / isCodingOptimized
 * - tags → 补充推断特性标志
 * - quota_type → billingMode (0=PER_TOKEN, 1=PER_REQUEST)
 */

import { BaseSyncAdapter } from './base';
import type { SyncConfig, RawModelData } from '../types/sync';

/** quanzil.com API 响应中的模型条目 */
interface QuanzilModel {
  model_name: string;
  description?: string;
  tags?: string;
  model_type?: string;
  vendor_id?: number;
  quota_type?: number; // 0=按量计费, 1=按次计费
  model_ratio?: number; // 输入价格倍率
  model_price?: number; // 按次计费时的单价
  completion_ratio?: number; // 输出/输入价格比
  cache_ratio?: number;
  cache_creation_ratio?: number;
  enable_groups?: string[];
  supported_endpoint_types?: string[];
  available?: boolean;
  created_time?: number;
  usage_count?: number;
}

/** quanzil.com API 响应中的厂商条目 */
interface QuanzilVendor {
  id: number;
  name: string;
  description?: string;
  icon?: string;
}

/** quanzil.com /api/pricing 完整响应 */
interface QuanzilResponse {
  success?: boolean;
  data?: QuanzilModel[];
  vendors?: QuanzilVendor[];
  group_ratio?: Record<string, number>;
  supported_endpoint?: Record<string, unknown>;
  usable_group?: Record<string, string>;
}

/**
 * 基准费率：quanzil.com 的 model_ratio 是相对于 $0.002/1K tokens 的倍率。
 * 即 model_ratio=1 表示 $2/M tokens。
 * 转换为 per_1m_tokens 单位：inputPrice = model_ratio × 2 (USD/M tokens)
 */
const BASE_RATE_USD_PER_M = 2;

/**
 * 中文模型类型 → 特性标志映射
 * quanzil.com 使用中文标签：对话/图像/视频/语音/嵌入/重排等
 */
function inferModelType(modelType: string | undefined, tags: string | undefined): {
  isMultiModal?: boolean;
  isReasoning?: boolean;
  isCodingOptimized?: boolean;
} {
  const typeStr = `${modelType ?? ''} ${tags ?? ''}`;

  return {
    isMultiModal: typeStr.includes('识图') || typeStr.includes('图像') || typeStr.includes('视频') || typeStr.includes('多模态'),
    isReasoning: typeStr.includes('思考') || typeStr.includes('推理'),
    isCodingOptimized: typeStr.includes('代码') || typeStr.includes('编码') || typeStr.includes('工具'),
  };
}

/**
 * 从 endpoint types 推断 API URL
 */
function inferApiUrl(endpoints: string[] | undefined): string | undefined {
  if (!endpoints || endpoints.length === 0) return undefined;
  if (endpoints.includes('openai')) return 'https://quanzil.com/v1/chat/completions';
  if (endpoints.includes('anthropic')) return 'https://quanzil.com/v1/messages';
  if (endpoints.includes('gemini')) return 'https://quanzil.com/v1beta/models';
  return undefined;
}

export class QuanzilAdapter extends BaseSyncAdapter {
  readonly name = 'quanzil';
  readonly source = 'official_api';

  private readonly apiUrl = 'https://quanzil.com/api/pricing';

  async fetch(config: SyncConfig): Promise<RawModelData[]> {
    const resp = await this.fetchJson(this.apiUrl) as QuanzilResponse;

    if (!resp.success || !resp.data) {
      throw new Error('quanzil: API returned success=false or missing data');
    }

    // 构建 vendor 查表：vendor_id → vendor_name
    const vendorMap = new Map<number, string>();
    for (const v of resp.vendors ?? []) {
      vendorMap.set(v.id, v.name);
    }

    const models = resp.data;
    const limit = (config.options?.limit as number | undefined) ?? models.length;

    return models
      .slice(0, limit)
      .filter(m => m.available !== false) // 过滤掉不可用模型
      .map(m => this.mapModel(m, vendorMap));
  }

  async testConnection(): Promise<boolean> {
    try {
      const resp = await this.fetchJson(this.apiUrl) as QuanzilResponse;
      return resp.success === true && Array.isArray(resp.data);
    } catch {
      return false;
    }
  }

  private mapModel(m: QuanzilModel, vendorMap: Map<number, string>): RawModelData {
    const vendorName = m.vendor_id != null ? vendorMap.get(m.vendor_id) : undefined;
    const { isMultiModal, isReasoning, isCodingOptimized } = inferModelType(m.model_type, m.tags);

    // 价格计算
    let inputPrice: number | undefined;
    let outputPrice: number | undefined;
    let currency = 'USD';
    let unit = 'per_1m_tokens';

    if (m.quota_type === 1 && m.model_price != null) {
      // 按次计费
      inputPrice = m.model_price;
      outputPrice = 0;
      unit = 'per_request';
    } else if (m.model_ratio != null) {
      // 按量计费：model_ratio 是相对于 $2/M tokens 的倍率
      inputPrice = m.model_ratio * BASE_RATE_USD_PER_M;
      const compRatio = m.completion_ratio ?? 1;
      outputPrice = m.model_ratio * compRatio * BASE_RATE_USD_PER_M;
    }

    // 从 created_time 推断发布日期
    const publishedAt = m.created_time != null
      ? new Date(m.created_time * 1000)
      : undefined;

    return {
      modelCode: m.model_name,
      nameDisplay: m.model_name,
      vendorName,
      inputPrice,
      outputPrice,
      currency,
      unit,
      isMultiModal,
      isReasoning,
      isCodingOptimized,
      apiUrl: inferApiUrl(m.supported_endpoint_types),
      officialUrl: 'https://quanzil.com',
      publishedAt,
      // popularityScore: 用 usage_count 归一化（后续由排名系统加权）
      popularityScore: m.usage_count != null ? Math.log10(m.usage_count + 1) : undefined,
    };
  }
}
