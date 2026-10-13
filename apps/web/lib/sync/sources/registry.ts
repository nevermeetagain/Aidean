/**
 * Sync Source Registry — 采集源注册表（单一事实来源）
 *
 * 目的：把「有哪些采集源」收敛为一处声明，供 UI 选项、适配器工厂、调度脚本共用，
 * 杜绝历史上 ADAPTER_REGISTRY（服务端）与 SyncManager SOURCE_OPTIONS（客户端）
 * 两处漂移（registry 有 11 个、UI 只列 9 个，quanzil/arena-ai 缺项）的问题。
 *
 * 铁律：本文件必须是「纯数据、无副作用、无 prisma/fetch 依赖」，
 * 以便客户端组件（SyncManager）可安全 import；适配器构造（有网络/DB 依赖）
 * 隔离在同目录 adapters.ts（服务端模块）。
 *
 * 加源流程（呼应「后续手动添加」）：
 *   1) 写适配器 lib/sync/adapters/<key>.ts
 *   2) 在此登记一行 { key, label, role }
 *   3) 在 adapters.ts 登记 key → 构造器
 *   由 registry.spec.ts 断言两表 key 集合一致，防漂移。
 */

export type SyncSourceRole = 'primary' | 'cross';

export interface SyncSourceDescriptor {
  /** 与 ADAPTER_REGISTRY / URL ?source= 一致的稳定键 */
  key: string;
  /** 后台 UI 展示名 */
  label: string;
  /** 默认定位：主源或交叉验证源 */
  role: SyncSourceRole;
}

/**
 * 模型信息采集源（当前 11 个）。站点类源（如 llmtest）走 discovery 管线，
 * 不在此表（数据形状与审核语义不同）。
 */
export const SYNC_SOURCES: SyncSourceDescriptor[] = [
  { key: 'openrouter', label: 'OpenRouter（主源）', role: 'primary' },
  { key: 'huggingface', label: 'HuggingFace（社区源）', role: 'cross' },
  { key: 'lmsys', label: 'LMSys Arena（排名源）', role: 'cross' },
  { key: 'epochai', label: 'Epoch AI（模型参数库）', role: 'cross' },
  { key: 'llmstats', label: 'LLM Stats（聚合统计）', role: 'cross' },
  { key: 'artificial-analysis', label: 'Artificial Analysis（综合评测）', role: 'cross' },
  { key: 'agentindex', label: 'AgentIndex（Agent 索引）', role: 'cross' },
  { key: 'skillsmp', label: 'SkillsMP（技能索引）', role: 'cross' },
  { key: 'smithery', label: 'Smithery（MCP Server 索引）', role: 'cross' },
  { key: 'quanzil', label: 'Quanzil（中国区价格源）', role: 'cross' },
  { key: 'arena-ai', label: 'Arena AI（排名源·OpenRouter/LMSys 代理）', role: 'cross' },
];

/** 便捷取标签；未知 key 回落为 key 本身 */
export function sourceLabel(key: string): string {
  return SYNC_SOURCES.find((s) => s.key === key)?.label ?? key;
}

/**
 * 模型信息聚合采集（主源 OpenRouter）默认交叉验证源键（有序）。
 * 刻意排除 agentindex/skillsmp/smithery（Agent/技能/MCP 索引类，非模型指标维度）
 * 与 llmstats（与主源高度重叠），沿用既有聚合语义，保证行为不漂移。
 */
export const MODEL_AGGREGATION_CROSS_KEYS: string[] = [
  'quanzil',
  'arena-ai',
  'huggingface',
  'lmsys',
  'artificial-analysis',
  'epochai',
];
