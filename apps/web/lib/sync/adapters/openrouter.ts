/**
 * OpenRouterAdapter — concrete sync adapter for openrouter.ai API.
 *
 * Extracted from scripts/crawl/crawl_models.ts (R-29 架构修复) so that
 * both the crawl script and the admin sync/batches POST route can reuse it.
 *
 * Data source: https://openrouter.ai/api/v1/models
 * Returns: model list with pricing + context length + benchmarks, mapped to RawModelData.
 *
 * 增强：提取 benchmarks.artificial_analysis 字段（intelligence_index, coding_index,
 * agentic_index），作为 arena 排名数据的交叉验证源。
 */

import { BaseSyncAdapter } from './base';
import type { SyncConfig, RawModelData, RawBenchmarkData } from '../types/sync';

interface OpenRouterModel {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer?: string;
  };
  benchmarks?: {
    design_arena?: unknown[];
    artificial_analysis?: {
      intelligence_index?: number;
      coding_index?: number;
      agentic_index?: number;
    };
  };
  created?: number;
  supported_parameters?: string[];
}

interface OpenRouterResponse {
  data?: OpenRouterModel[];
}

export class OpenRouterAdapter extends BaseSyncAdapter {
  readonly name = 'openrouter';
  readonly source = 'official_api';

  async fetch(config: SyncConfig): Promise<RawModelData[]> {
    const data = await this.fetchJson('https://openrouter.ai/api/v1/models') as OpenRouterResponse;
    const models = data.data ?? [];
    const limit = (config.options?.limit as number | undefined) ?? models.length;
    return models.slice(0, limit).map(m => this.mapModel(m));
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.fetchJson('https://openrouter.ai/api/v1/models');
      return true;
    } catch {
      return false;
    }
  }

  private mapModel(m: OpenRouterModel): RawModelData {
    // 提取 benchmarks
    const benchmarks: RawBenchmarkData[] = [];
    const aa = m.benchmarks?.artificial_analysis;
    if (aa && aa.intelligence_index != null) {
      const scores: Record<string, number> = {};
      if (aa.intelligence_index != null) scores['intelligence_index'] = aa.intelligence_index;
      if (aa.coding_index != null) scores['coding_index'] = aa.coding_index;
      if (aa.agentic_index != null) scores['agentic_index'] = aa.agentic_index;

      benchmarks.push({
        benchmarkType: 'artificial_analysis',
        totalScore: aa.intelligence_index,
        sourceName: 'openrouter',
        scores,
      });
    }

    // 从 architecture 推断特性
    const inputModalities = m.architecture?.input_modalities ?? [];
    const isMultiModal = inputModalities.some(mod => mod !== 'text' && mod !== undefined);

    // 从 supported_parameters 推断推理能力
    const supportedParams = m.supported_parameters ?? [];
    const isReasoning = supportedParams.includes('reasoning') || supportedParams.includes('reasoning_effort');

    return {
      modelCode: m.id,
      vendorName: m.id.includes("/") ? m.id.split("/")[0] : undefined,
      nameDisplay: m.name,
      contextLength: m.context_length,
      inputPrice: m.pricing?.prompt ? parseFloat(m.pricing.prompt) * 1000 : undefined,
      outputPrice: m.pricing?.completion ? parseFloat(m.pricing.completion) * 1000 : undefined,
      currency: 'USD',
      unit: 'per_1k_tokens',
      benchmarkScore: aa?.intelligence_index,
      isMultiModal,
      isReasoning,
      publishedAt: m.created ? new Date(m.created * 1000) : undefined,
      benchmarks: benchmarks.length > 0 ? benchmarks : undefined,
    };
  }
}
