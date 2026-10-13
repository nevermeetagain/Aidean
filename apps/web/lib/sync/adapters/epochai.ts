/**
 * EpochAIAdapter — sync adapter for Epoch AI model database.
 *
 * Data source (multi-tier fallback):
 *   1. https://epoch.ai/data/ai-models-documentation/api/models (original, returns 404)
 *   2. OpenRouter API (proxy for parameter count and release date data)
 *
 * Returns: model list with parameters, release date, organization, benchmarks.
 *
 * R-71: 聚合采集——Epoch AI 维护 AI Models 数据库（含参数、算力、能力趋势），
 * 支持 CSV 下载，非常适合自动化采集。
 *
 * 修复说明：原端点 epoch.ai/data/ai-models-documentation/api/models 返回 404。
 * 添加 OpenRouter 代理降级，提取模型的 context_length、architecture 等技术参数。
 * 原始 Epoch AI 数据库页面 (200) 仍可访问，未来 API 恢复时自动优先使用。
 */

import { BaseSyncAdapter } from './base';
import type { SyncConfig, RawModelData } from '../types/sync';

interface EpochModel {
  model?: string;
  name?: string;
  organization?: string;
  parameters?: number;
  training_compute?: number;
  release_date?: string;
  notability?: string;
  open_weights?: boolean;
  context_length?: number;
}

interface EpochResponse {
  data?: EpochModel[];
  models?: EpochModel[];
}

/** OpenRouter 模型条目（用于代理降级） */
interface OpenRouterModel {
  id: string;
  name?: string;
  context_length?: number;
  created?: number; // Unix timestamp
  architecture?: { modality?: string; input_modalities?: string[] };
  top_provider?: { context_length?: number };
}

interface OpenRouterResponse {
  data?: OpenRouterModel[];
}

export class EpochAIAdapter extends BaseSyncAdapter {
  readonly name = 'epochai';
  readonly source = 'community';

  /** 原始 Epoch AI JSON API（返回 404，保留用于未来恢复） */
  private readonly primaryUrl = 'https://epoch.ai/data/ai-models-documentation/api/models';

  /** OpenRouter 代理源 */
  private readonly proxyUrl = 'https://openrouter.ai/api/v1/models';

  async fetch(config: SyncConfig): Promise<RawModelData[]> {
    const limit = (config.options?.limit as number | undefined) ?? undefined;

    // 策略 1: 原始 Epoch AI API
    try {
      const data = await this.fetchJson(this.primaryUrl) as EpochResponse;
      const models = data.data ?? data.models ?? [];
      if (models.length > 0) {
        return models.slice(0, limit ?? models.length).map(m => this.mapModel(m));
      }
    } catch {
      // 404 或其他错误，继续降级
    }

    // 策略 2: OpenRouter 代理（提取技术参数）
    try {
      const data = await this.fetchJson(this.proxyUrl) as OpenRouterResponse;
      const models = (data.data ?? []).map(m => this.mapFromOpenRouter(m));
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
      await this.fetchJson(this.proxyUrl);
      return true;
    } catch {
      return false;
    }
  }

  /** 从原始 Epoch AI API 响应映射 */
  private mapModel(m: EpochModel): RawModelData {
    const modelCode = m.model ?? m.name ?? '';
    return {
      modelCode,
      nameDisplay: m.name ?? modelCode,
      vendorName: m.organization,
      parameterCount: m.parameters ? this.formatParamCount(m.parameters) : undefined,
      publishedAt: m.release_date ? new Date(m.release_date) : undefined,
      isOpenSource: m.open_weights,
      contextLength: m.context_length,
      officialUrl: m.organization ? `https://epoch.ai/models/${encodeURIComponent(modelCode)}` : undefined,
    };
  }

  /** 从 OpenRouter 代理源映射（提取技术参数） */
  private mapFromOpenRouter(m: OpenRouterModel): RawModelData {
    const inputModalities = m.architecture?.input_modalities ?? [];
    const isMultiModal = inputModalities.some(mod => mod !== 'text' && mod !== undefined);

    return {
      modelCode: m.id,
      nameDisplay: m.name ?? m.id.split('/').pop() ?? m.id,
      vendorName: m.id.includes('/') ? m.id.split('/')[0] : undefined,
      contextLength: m.context_length ?? m.top_provider?.context_length,
      isMultiModal,
      publishedAt: m.created ? new Date(m.created * 1000) : undefined,
      officialUrl: `https://epoch.ai/data/ai-models-documentation`,
    };
  }

  private formatParamCount(params: number): string {
    if (params >= 1e9) return `${(params / 1e9).toFixed(1)}B`;
    if (params >= 1e6) return `${(params / 1e6).toFixed(1)}M`;
    if (params >= 1e3) return `${(params / 1e3).toFixed(1)}K`;
    return String(params);
  }
}
