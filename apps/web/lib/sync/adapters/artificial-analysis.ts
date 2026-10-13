/**
 * ArtificialAnalysisAdapter — sync adapter for Artificial Analysis leaderboard.
 *
 * Data source (multi-tier fallback):
 *   1. https://artificialanalysis.ai/api/leaderboard (original, returns 404)
 *   2. OpenRouter API (benchmarks.artificial_analysis proxy data)
 *
 * Returns: model list with intelligence index, pricing, speed metrics.
 *
 * R-71: 聚合采集——Artificial Analysis 综合了多 benchmark 评测、价格、速度数据，
 * 作为 additionalAdapter 与 OpenRouter 主源交叉验证。
 *
 * 修复说明：原端点 artificialanalysis.ai/api/leaderboard 返回 404（API 已变更）。
 * 降级为通过 OpenRouter API 提取 benchmarks.artificial_analysis 数据，
 * 该数据由 OpenRouter 从 Artificial Analysis 聚合而来，包含 intelligence_index、
 * coding_index、agentic_index 等评分。
 */

import { BaseSyncAdapter } from './base';
import type { SyncConfig, RawModelData, RawBenchmarkData } from '../types/sync';

interface AAModel {
  model?: string;
  name?: string;
  provider?: string;
  intelligence_score?: number;
  context_window?: number;
  input_price?: number;
  output_price?: number;
  speed?: number;
  open_source?: boolean;
  multimodal?: boolean;
}

interface AAResponse {
  data?: AAModel[];
  models?: AAModel[];
}

/** OpenRouter 模型响应中的 benchmarks 字段 */
interface OpenRouterBenchmarks {
  artificial_analysis?: {
    intelligence_index?: number;
    coding_index?: number;
    agentic_index?: number;
  };
}

interface OpenRouterModel {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { input_modalities?: string[] };
  benchmarks?: OpenRouterBenchmarks;
}

interface OpenRouterResponse {
  data?: OpenRouterModel[];
}

export class ArtificialAnalysisAdapter extends BaseSyncAdapter {
  readonly name = 'artificial-analysis';
  readonly source = 'community';

  /** 原始 API 端点（返回 404，保留用于未来恢复） */
  private readonly primaryUrl = 'https://artificialanalysis.ai/api/leaderboard';

  /** OpenRouter 代理源 */
  private readonly proxyUrl = 'https://openrouter.ai/api/v1/models';

  async fetch(config: SyncConfig): Promise<RawModelData[]> {
    const limit = (config.options?.limit as number | undefined) ?? undefined;

    // 策略 1: 原始 Artificial Analysis API（可能已恢复）
    try {
      const data = await this.fetchJson(this.primaryUrl) as AAResponse;
      const models = data.data ?? data.models ?? [];
      if (models.length > 0) {
        return models.slice(0, limit ?? models.length).map(m => this.mapModel(m));
      }
    } catch {
      // 404 或其他错误，继续降级
    }

    // 策略 2: OpenRouter 代理源
    try {
      const data = await this.fetchJson(this.proxyUrl) as OpenRouterResponse;
      const models = (data.data ?? [])
        .filter(m => m.benchmarks?.artificial_analysis?.intelligence_index != null)
        .map(m => this.mapFromOpenRouter(m));
      if (models.length > 0) {
        return limit ? models.slice(0, limit) : models;
      }
    } catch {
      // OpenRouter 也不可用
    }

    return [];
  }

  async testConnection(): Promise<boolean> {
    try {
      const data = await this.fetchJson(this.proxyUrl) as OpenRouterResponse;
      return (data.data ?? []).some(
        m => m.benchmarks?.artificial_analysis?.intelligence_index != null,
      );
    } catch {
      return false;
    }
  }

  /** 从原始 Artificial Analysis API 响应映射 */
  private mapModel(m: AAModel): RawModelData {
    const modelCode = m.model ?? m.name ?? '';
    return {
      modelCode,
      nameDisplay: m.name ?? modelCode,
      vendorName: m.provider,
      contextLength: m.context_window,
      benchmarkScore: m.intelligence_score,
      inputPrice: m.input_price,
      outputPrice: m.output_price,
      currency: 'USD',
      unit: 'per_1m_tokens',
      isMultiModal: m.multimodal,
      isOpenSource: m.open_source,
      officialUrl: m.provider
        ? `https://artificialanalysis.ai/models/${encodeURIComponent(modelCode)}`
        : undefined,
    };
  }

  /** 从 OpenRouter 代理源映射 */
  private mapFromOpenRouter(m: OpenRouterModel): RawModelData {
    const aa = m.benchmarks!.artificial_analysis!;
    const scores: Record<string, number> = {};
    if (aa.intelligence_index != null) scores['intelligence_index'] = aa.intelligence_index;
    if (aa.coding_index != null) scores['coding_index'] = aa.coding_index;
    if (aa.agentic_index != null) scores['agentic_index'] = aa.agentic_index;

    const benchmarks: RawBenchmarkData[] = [{
      benchmarkType: 'artificial_analysis',
      totalScore: aa.intelligence_index ?? 0,
      sourceName: 'artificial-analysis',
      scores,
    }];

    const inputModalities = m.architecture?.input_modalities ?? [];
    const isMultiModal = inputModalities.some(mod => mod !== 'text' && mod !== undefined);

    return {
      modelCode: m.id,
      nameDisplay: m.name ?? m.id.split('/').pop() ?? m.id,
      vendorName: m.id.includes('/') ? m.id.split('/')[0] : undefined,
      contextLength: m.context_length,
      benchmarkScore: aa.intelligence_index,
      inputPrice: m.pricing?.prompt ? parseFloat(m.pricing.prompt) * 1000 : undefined,
      outputPrice: m.pricing?.completion ? parseFloat(m.pricing.completion) * 1000 : undefined,
      currency: 'USD',
      unit: 'per_1k_tokens',
      isMultiModal,
      officialUrl: `https://artificialanalysis.ai/models/${encodeURIComponent(m.id)}`,
      benchmarks,
    };
  }
}
