/**
 * LLMStatsAdapter — sync adapter for llm-stats.com leaderboard.
 *
 * Data source: https://llm-stats.com/api/v1/models
 * Returns: model list with intelligence score, speed, pricing, popularity.
 *
 * R-71: 聚合采集——llm-stats.com 聚合 300+ AI 模型，
 * 按智能、速度、延迟和价格排名，数据持续实时更新。
 *
 * 参考资料定位：⭐ 首选聚合源，覆盖最广，每日持续刷新。
 */

import { BaseSyncAdapter } from './base';
import type { SyncConfig, RawModelData } from '../types/sync';

interface LLMStatsModel {
  id?: string;
  name?: string;
  provider?: string;
  intelligence_score?: number;
  speed_score?: number;
  latency_score?: number;
  input_price?: number;
  output_price?: number;
  context_window?: number;
  open_source?: boolean;
  multimodal?: boolean;
  downloads?: number;
  popularity_score?: number;
}

interface LLMStatsResponse {
  data?: LLMStatsModel[];
  models?: LLMStatsModel[];
}

export class LLMStatsAdapter extends BaseSyncAdapter {
  readonly name = 'llmstats';
  readonly source = 'community';

  private readonly apiUrl = 'https://llm-stats.com/api/v1/models';

  async fetch(config: SyncConfig): Promise<RawModelData[]> {
    const data = await this.fetchJson(this.apiUrl) as LLMStatsResponse;
    const models = data.data ?? data.models ?? [];
    const limit = (config.options?.limit as number | undefined) ?? models.length;

    return models.slice(0, limit).map(m => this.mapModel(m));
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.fetchJson(this.apiUrl);
      return true;
    } catch {
      return false;
    }
  }

  private mapModel(m: LLMStatsModel): RawModelData {
    const modelCode = m.id ?? m.name ?? '';
    return {
      modelCode,
      nameDisplay: m.name ?? modelCode,
      vendorName: m.provider,
      benchmarkScore: m.intelligence_score,
      popularityScore: m.popularity_score ?? m.downloads,
      contextLength: m.context_window,
      inputPrice: m.input_price,
      outputPrice: m.output_price,
      currency: 'USD',
      unit: 'per_1m_tokens',
      isMultiModal: m.multimodal,
      isOpenSource: m.open_source,
      officialUrl: `https://llm-stats.com/models/${encodeURIComponent(modelCode)}`,
    };
  }
}
