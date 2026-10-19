/**
 * llmtest.cn 站点采集 — 数据映射纯函数（无网络 / 无 prisma 依赖，便于单测）。
 *
 * L0 实证：llmtest 前台 SPA 从 JS bundle 暴露真实数据接口
 *   GET https://llmtest.cn/api/leaderboard/composite  → 200 公开无需鉴权
 *   返回 { ok, data: [{ url, name, score, isAlive, rank, total_checks, pass_count, ... }], cacheAgeMs }
 *   每个 data 项是一个被监控的 API 中转站/网关站点。
 *
 * 这些站点映射为 discovery 候选（candidateType='gateway', sourceType='crawl'），
 * 经既有「discovered → verifying → verified → promoted」状态机 + 后台人工 promote 到 APIStation，
 * 契合 Q2=A「llmtest 走 discovery 候选管线 + 人工 promote」的裁决。
 */
import type { Candidate } from './types';

/** llmtest composite 单项（仅声明用到的字段，其余忽略）。 */
export interface LlmtestLeaderboardItem {
  url?: unknown;
  name?: unknown;
  score?: unknown;
  isAlive?: unknown;
  rank?: unknown;
  total_checks?: unknown;
  pass_count?: unknown;
  last_alive_at?: unknown;
}

/** composite 接口标准数据源 URL（发现证据 sourceUrl）。 */
export const LLMTEST_COMPOSITE_URL = 'https://llmtest.cn/api/leaderboard/composite';

/** 从 url 提取规范化域名；非法/无主机名返回 undefined。 */
export function extractLlmtestDomain(url: unknown): string | undefined {
  if (typeof url !== 'string' || !url) return undefined;
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    return host.includes('.') && host.length > 4 ? host : undefined;
  } catch {
    return undefined;
  }
}

/** 解析 composite 响应体，返回 data 数组；形状不符预期返回空数组（不抛异常）。 */
export function parseLlmtestComposite(json: unknown): LlmtestLeaderboardItem[] {
  if (!json || typeof json !== 'object') return [];
  const data = (json as { data?: unknown }).data;
  return Array.isArray(data) ? (data as LlmtestLeaderboardItem[]) : [];
}

/**
 * 单项 → 候选。无有效域名则返回 null（跳过）。
 * description 承载 llmtest 观测指标（评分/存活/通过计数/排名），供人工审核溯源。
 */
export function mapLlmtestItemToCandidate(
  item: LlmtestLeaderboardItem,
  sourceUrl: string = LLMTEST_COMPOSITE_URL,
): Candidate | null {
  const domain = extractLlmtestDomain(item.url);
  if (!domain) return null;

  const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : domain;

  const meta: string[] = [];
  if (typeof item.score === 'number') meta.push(`score=${item.score}`);
  if (typeof item.rank === 'number') meta.push(`rank=${item.rank}`);
  if (typeof item.isAlive === 'boolean') meta.push(`alive=${item.isAlive ? 'Y' : 'N'}`);
  if (typeof item.total_checks === 'number' && typeof item.pass_count === 'number') {
    meta.push(`pass=${item.pass_count}/${item.total_checks}`);
  }

  return {
    candidateType: 'gateway',
    name,
    domain,
    apiBase: typeof item.url === 'string' ? item.url : undefined,
    description: meta.length ? `llmtest 观测：${meta.join(' ')}` : 'llmtest 站点榜单采集',
    sourceType: 'crawl',
    sourceUrl,
  };
}

/**
 * 批量映射 + 按域名去重（同批内）。DB 级幂等（跨批次）由发现函数按 domain 预检负责。
 */
export function mapLlmtestItemsToCandidates(
  items: LlmtestLeaderboardItem[],
  sourceUrl: string = LLMTEST_COMPOSITE_URL,
): Candidate[] {
  const byDomain = new Map<string, Candidate>();
  for (const item of items) {
    const c = mapLlmtestItemToCandidate(item, sourceUrl);
    if (c && c.domain && !byDomain.has(c.domain)) byDomain.set(c.domain, c);
  }
  return Array.from(byDomain.values());
}
