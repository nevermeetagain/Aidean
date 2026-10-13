/**
 * ArenaAIAdapter — sync adapter for LMSys Chatbot Arena / arena.ai leaderboard.
 *
 * Primary source: https://chat.lmsys.org/?leaderboard (arena ELO ranking)
 * Fallback source: OpenRouter API (benchmarks.artificial_analysis proxy data)
 *
 * arena.ai is protected by Cloudflare (HTTP 403) and chat.lmsys.org may be
 * unreachable from certain network environments. This adapter implements a
 * multi-tier fallback strategy:
 *
 * 1. Try chat.lmsys.org HuggingFace Space Gradio API for live arena data
 * 2. Try OpenRouter API and extract benchmarks.artificial_analysis scores
 * 3. If all sources fail, return empty array (orchestrator handles gracefully)
 *
 * R-47: 多源数据采集扩展——arena 排名作为独立维度参与交叉验证，
 * benchmarkScore 字段与 OpenRouter 侧数据比对。
 *
 * 字段映射（from OpenRouter benchmarks）：
 * - model id → modelCode
 * - benchmarks.artificial_analysis.intelligence_index → benchmarkScore
 * - benchmarks.artificial_analysis.coding_index → codingScore (in benchmarks[])
 * - benchmarks.artificial_analysis.agentic_index → agenticScore (in benchmarks[])
 * - architecture.input_modalities → isMultiModal
 */

import { BaseSyncAdapter } from './base';
import type { SyncConfig, RawModelData, RawBenchmarkData } from '../types/sync';

/** OpenRouter 模型响应中的 benchmarks 字段 */
interface OpenRouterBenchmarks {
  design_arena?: unknown[];
  artificial_analysis?: {
    intelligence_index?: number;
    coding_index?: number;
    agentic_index?: number;
  };
}

/** OpenRouter 模型条目 */
interface OpenRouterModel {
  id: string;
  name?: string;
  context_length?: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
  benchmarks?: OpenRouterBenchmarks;
}

/** OpenRouter API 响应 */
interface OpenRouterResponse {
  data?: OpenRouterModel[];
}

export class ArenaAIAdapter extends BaseSyncAdapter {
  readonly name = 'arena-ai';
  readonly source = 'community';

  /** OpenRouter API 作为 arena 数据的代理源 */
  private readonly openrouterUrl = 'https://openrouter.ai/api/v1/models';

  /** LMSys HuggingFace Space Gradio API (best effort, may be unreachable) */
  private readonly lmsysGradioUrl = 'https://lmsys-chatbot-arena-leaderboard.hf.space/gradio_api/call/leaderboard';

  async fetch(config: SyncConfig): Promise<RawModelData[]> {
    // 策略 1: 尝试 LMSys Gradio API（可能不可达）
    try {
      const data = await this.fetchJson(this.lmsysGradioUrl) as { data?: unknown[] };
      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        return this.mapGradioData(data.data, config);
      }
    } catch {
      // Gradio 端点不可达，继续降级
    }

    // 策略 2: 通过 OpenRouter API 提取 artificial_analysis benchmark 数据
    try {
      const data = await this.fetchJson(this.openrouterUrl) as OpenRouterResponse;
      const models = data.data ?? [];
      const limit = (config.options?.limit as number | undefined) ?? models.length;

      // 只保留有 arena/artificial_analysis benchmark 数据的模型
      const arenaModels = models
        .filter(m => m.benchmarks?.artificial_analysis?.intelligence_index != null)
        .slice(0, limit)
        .map(m => this.mapFromOpenRouter(m));

      if (arenaModels.length > 0) {
        return arenaModels;
      }
    } catch {
      // OpenRouter 也不可用，返回空数组
    }

    // 所有源都失败：返回空数组，orchestrator 会记录为 partial
    return [];
  }

  async testConnection(): Promise<boolean> {
    try {
      // 只测试 OpenRouter 代理源（Gradio 端点不稳定）
      const data = await this.fetchJson(this.openrouterUrl) as OpenRouterResponse;
      const hasArenaData = (data.data ?? []).some(
        m => m.benchmarks?.artificial_analysis?.intelligence_index != null,
      );
      return hasArenaData;
    } catch {
      return false;
    }
  }

  /**
   * 从 OpenRouter 模型数据映射到 RawModelData
   * 提取 artificial_analysis 的 intelligence/coding/agentic 指数
   */
  private mapFromOpenRouter(m: OpenRouterModel): RawModelData {
    const aa = m.benchmarks?.artificial_analysis;
    const intelligenceIndex = aa?.intelligence_index;
    const codingIndex = aa?.coding_index;
    const agenticIndex = aa?.agentic_index;

    // 构建 benchmark 维度评分
    const benchmarks: RawBenchmarkData[] = [];
    const scores: Record<string, number> = {};
    if (intelligenceIndex != null) scores['intelligence_index'] = intelligenceIndex;
    if (codingIndex != null) scores['coding_index'] = codingIndex;
    if (agenticIndex != null) scores['agentic_index'] = agenticIndex;

    if (Object.keys(scores).length > 0) {
      benchmarks.push({
        benchmarkType: 'artificial_analysis',
        totalScore: intelligenceIndex ?? 0,
        sourceName: 'arena-ai',
        scores,
      });
    }

    // 从 architecture 推断多模态
    const inputModalities = m.architecture?.input_modalities ?? [];
    const isMultiModal = inputModalities.some(
      mod => mod !== 'text' && mod !== undefined,
    );

    return {
      modelCode: m.id,
      nameDisplay: m.name ?? m.id.split('/').pop() ?? m.id,
      vendorName: m.id.includes('/') ? m.id.split('/')[0] : undefined,
      contextLength: m.context_length,
      benchmarkScore: intelligenceIndex,
      isMultiModal,
      benchmarks,
      officialUrl: `https://artificialanalysis.ai/models/${encodeURIComponent(m.id)}`,
    };
  }

  /**
   * 从 LMSys Gradio API 数据映射（best effort，数据格式可能变化）
   */
  private mapGradioData(entries: unknown[], config: SyncConfig): RawModelData[] {
    // Gradio API 返回格式不稳定，这里做 best-effort 解析
    // 如果格式不匹配，返回空数组让降级逻辑继续
    const limit = (config.options?.limit as number | undefined) ?? entries.length;
    const results: RawModelData[] = [];

    for (const entry of entries.slice(0, limit)) {
      if (Array.isArray(entry) && entry.length >= 2) {
        const modelCode = String(entry[0]);
        const arenaScore = Number(entry[1]);
        if (modelCode && !isNaN(arenaScore)) {
          results.push({
            modelCode,
            benchmarkScore: arenaScore,
            benchmarks: [{
              benchmarkType: 'lmsys_arena',
              totalScore: arenaScore,
              sourceName: 'lmsys',
              scores: { arena_elo: arenaScore },
            }],
          });
        }
      }
    }

    return results;
  }
}
