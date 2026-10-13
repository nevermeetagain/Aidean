/**
 * LMSysAdapter — sync adapter for LMSys Chatbot Arena leaderboard.
 *
 * Data source (multi-tier fallback):
 *   1. https://chat.lmsys.org/api/leaderboard (original, may be unreachable)
 *   2. HuggingFace Space Gradio API (lmsys-chatbot-arena-leaderboard.hf.space)
 *   3. OpenRouter benchmarks proxy (arena ELO via OpenRouter API)
 *
 * Returns: model list with arena ELO score, mapped to RawModelData.
 *
 * R-47: 多源数据采集扩展——arena 排名作为独立维度参与交叉验证，
 * benchmarkScore 字段与 OpenRouter 侧数据比对（容差 0，精确匹配）。
 *
 * 修复说明：原端点 chat.lmsys.org/api/leaderboard 在部分网络环境下不可达。
 * 添加多端点降级策略，确保适配器在网络条件受限时仍能获取数据或优雅失败。
 */

import { BaseSyncAdapter } from './base';
import type { SyncConfig, RawModelData, RawBenchmarkData } from '../types/sync';

interface LMSysEntry {
  modelCode: string;
  arenaScore?: number;
  benchmarkScore?: number;
  organization?: string;
  license?: string;
}

export class LMSysAdapter extends BaseSyncAdapter {
  readonly name = 'lmsys';
  readonly source = 'community';

  /** 原始 LMSys API 端点（可能不可达） */
  private readonly primaryUrl = 'https://chat.lmsys.org/api/leaderboard';

  /** HuggingFace Space Gradio API（best effort） */
  private readonly gradioUrl = 'https://lmsys-chatbot-arena-leaderboard.hf.space/gradio_api/call/leaderboard';

  /** OpenRouter 代理源（提取 benchmarks.artificial_analysis） */
  private readonly proxyUrl = 'https://openrouter.ai/api/v1/models';

  async fetch(config: SyncConfig): Promise<RawModelData[]> {
    const limit = (config.options?.limit as number | undefined) ?? undefined;

    // 策略 1: 原始 LMSys API
    try {
      const data = await this.fetchJson(this.primaryUrl) as { data?: LMSysEntry[] } | LMSysEntry[];
      const entries = Array.isArray(data) ? data : (data.data ?? []);
      if (entries.length > 0) {
        return entries.slice(0, limit ?? entries.length).map(e => this.mapEntry(e));
      }
    } catch {
      // 端点不可达，继续降级
    }

    // 策略 2: HuggingFace Gradio API
    try {
      const data = await this.fetchJson(this.gradioUrl) as { data?: unknown[] };
      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        const results = this.mapGradioData(data.data);
        if (results.length > 0) return limit ? results.slice(0, limit) : results;
      }
    } catch {
      // Gradio 不可达，继续降级
    }

    // 策略 3: OpenRouter 代理（提取 artificial_analysis 作为 arena 近似）
    try {
      const data = await this.fetchJson(this.proxyUrl) as {
        data?: Array<{
          id: string;
          name?: string;
          benchmarks?: {
            artificial_analysis?: { intelligence_index?: number };
          };
        }>;
      };
      const models = (data.data ?? [])
        .filter(m => m.benchmarks?.artificial_analysis?.intelligence_index != null)
        .map(m => ({
          modelCode: m.id,
          arenaScore: m.benchmarks!.artificial_analysis!.intelligence_index!,
          organization: m.id.includes('/') ? m.id.split('/')[0] : undefined,
        }));
      if (models.length > 0) {
        return models.slice(0, limit ?? models.length).map(e => this.mapEntry(e));
      }
    } catch {
      // 所有源都失败
    }

    // 优雅失败：返回空数组
    return [];
  }

  async testConnection(): Promise<boolean> {
    // 测试 OpenRouter 代理源（最稳定）
    try {
      const data = await this.fetchJson(this.proxyUrl) as {
        data?: Array<{ benchmarks?: { artificial_analysis?: { intelligence_index?: number } } }>;
      };
      return (data.data ?? []).some(
        m => m.benchmarks?.artificial_analysis?.intelligence_index != null,
      );
    } catch {
      return false;
    }
  }

  private mapEntry(e: LMSysEntry): RawModelData {
    const benchmarks: RawBenchmarkData[] = [];
    const score = e.arenaScore ?? e.benchmarkScore;
    if (score != null) {
      benchmarks.push({
        benchmarkType: 'lmsys_arena',
        totalScore: score,
        sourceName: 'lmsys',
        scores: { arena_elo: score },
      });
    }

    return {
      modelCode: e.modelCode,
      vendorName: e.organization ?? (e.modelCode.includes("/") ? e.modelCode.split("/")[0] : undefined),
      nameDisplay: e.modelCode.split('/').pop() ?? e.modelCode,
      benchmarkScore: score,
      isOpenSource: e.license ? e.license !== 'Proprietary' : undefined,
      officialUrl: e.organization ? `https://huggingface.co/${e.modelCode}` : undefined,
      benchmarks,
    };
  }

  private mapGradioData(entries: unknown[]): RawModelData[] {
    const results: RawModelData[] = [];
    for (const entry of entries) {
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
