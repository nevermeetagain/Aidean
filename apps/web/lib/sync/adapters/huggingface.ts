/**
 * HuggingFaceAdapter — sync adapter for HuggingFace Hub API.
 *
 * Data source: https://huggingface.co/api/models?full=true
 * Returns: model list with parameter count, multimodal flag, open-source flag,
 * official URL, mapped to RawModelData.
 *
 * R-47: 多源数据采集扩展——作为 additionalAdapters 传入 SyncOrchestrator，
 * 与 OpenRouter 主源数据交叉验证（contextLength / isOpenSource 等字段冲突检测）。
 */

import { BaseSyncAdapter } from './base';
import type { SyncConfig, RawModelData } from '../types/sync';

interface HFModel {
  id: string;
  pipeline_tag?: string;
  tags?: string[];
  downloads?: number;
  likes?: number;
  config?: {
    params?: number;
  };
  siblings?: Array<{ rfilename?: string }>;
  private?: boolean;
}

interface HFApiResponse {
  data?: HFModel[];
}

export class HuggingFaceAdapter extends BaseSyncAdapter {
  readonly name = 'huggingface';
  readonly source = 'official_api';

  private readonly apiUrl = 'https://huggingface.co/api/models?full=true';

  async fetch(config: SyncConfig): Promise<RawModelData[]> {
    const data = await this.fetchJson(this.apiUrl) as HFApiResponse;
    const models = data.data ?? [];
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

  private mapModel(m: HFModel): RawModelData {
    const tags = m.tags ?? [];
    const isMultimodal = tags.some(t =>
      t.includes('vision') || t.includes('image') || t.includes('multimodal') || t.includes('audio')
    );
    const isOpenSource = !m.private;
    const paramCount = m.config?.params
      ? this.formatParamCount(m.config.params)
      : undefined;

    return {
      modelCode: m.id,
      nameDisplay: m.id.split('/').pop() ?? m.id,
      parameterCount: paramCount,
      isMultiModal: isMultimodal,
      isOpenSource,
      officialUrl: `https://huggingface.co/${m.id}`,
      popularityScore: m.downloads,
    };
  }

  private formatParamCount(params: number): string {
    if (params >= 1e9) return `${(params / 1e9).toFixed(1)}B`;
    if (params >= 1e6) return `${(params / 1e6).toFixed(1)}M`;
    if (params >= 1e3) return `${(params / 1e3).toFixed(1)}K`;
    return String(params);
  }
}
