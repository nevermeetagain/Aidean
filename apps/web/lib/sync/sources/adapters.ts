/**
 * Sync Adapter Factory — 采集源键 → 适配器构造器（服务端模块）
 *
 * 从原 `app/api/v1/admin/sync/batches/route.ts` 内联 ADAPTER_REGISTRY 抽出，
 * 使「 crawl 脚本 / admin 路由 / 未来的调度运行器」共用同一份适配器装配逻辑
 * （R-29 把适配器从 crawl 脚本提取到 lib 的初衷延续）。
 *
 * 键集合必须与 registry.ts 的 SYNC_SOURCES 一致，由 registry.spec.ts 断言。
 * 本文件有网络/DB 依赖（各适配器），禁止被客户端组件直接 import。
 */

import type { SyncAdapter } from '../adapters/base';
import { OpenRouterAdapter } from '../adapters/openrouter';
import { HuggingFaceAdapter } from '../adapters/huggingface';
import { LMSysAdapter } from '../adapters/lmsys';
import { EpochAIAdapter } from '../adapters/epochai';
import { LLMStatsAdapter } from '../adapters/llmstats';
import { ArtificialAnalysisAdapter } from '../adapters/artificial-analysis';
import { AgentIndexAdapter } from '../adapters/agentindex';
import { SkillsMPAdapter } from '../adapters/skillsmp';
import { SmitheryAdapter } from '../adapters/smithery';
import { QuanzilAdapter } from '../adapters/quanzil';
import { ArenaAIAdapter } from '../adapters/arena-ai';

/** adapter key → constructor 工厂 */
export const ADAPTER_REGISTRY: Record<string, () => SyncAdapter> = {
  openrouter: () => new OpenRouterAdapter(),
  huggingface: () => new HuggingFaceAdapter(),
  lmsys: () => new LMSysAdapter(),
  epochai: () => new EpochAIAdapter(),
  llmstats: () => new LLMStatsAdapter(),
  'artificial-analysis': () => new ArtificialAnalysisAdapter(),
  agentindex: () => new AgentIndexAdapter(),
  skillsmp: () => new SkillsMPAdapter(),
  smithery: () => new SmitheryAdapter(),
  quanzil: () => new QuanzilAdapter(),
  'arena-ai': () => new ArenaAIAdapter(),
};

/** 按 key 构造适配器；未知 key 返回 undefined */
export function buildAdapter(key: string): SyncAdapter | undefined {
  return ADAPTER_REGISTRY[key]?.();
}

/** 全部交叉验证源适配器（排除指定主源 key），供聚合采集复用 */
export function buildCrossAdapters(excludeKeys: string[] = []): SyncAdapter[] {
  return Object.entries(ADAPTER_REGISTRY)
    .filter(([key]) => !excludeKeys.includes(key))
    .map(([, factory]) => factory());
}
