/**
 * llmtest.spec.ts — L3 站点采集数据映射纯函数守卫（无网络/prisma）。
 */
import { describe, it, expect } from 'vitest';
import {
  extractLlmtestDomain,
  parseLlmtestComposite,
  mapLlmtestItemToCandidate,
  mapLlmtestItemsToCandidates,
  LLMTEST_COMPOSITE_URL,
} from './llmtest';

describe('llmtest 站点采集映射 (L3)', () => {
  it('extractLlmtestDomain：规范化域名、拒非 http(s) 与无点主机', () => {
    expect(extractLlmtestDomain('https://www.siliconflow.cn/v1')).toBe('siliconflow.cn');
    expect(extractLlmtestDomain('http://api.deepseek.com')).toBe('api.deepseek.com');
    expect(extractLlmtestDomain('ftp://x.com')).toBeUndefined();
    expect(extractLlmtestDomain('not-a-url')).toBeUndefined();
    expect(extractLlmtestDomain(undefined)).toBeUndefined();
    expect(extractLlmtestDomain('')).toBeUndefined();
  });

  it('parseLlmtestComposite：合规返回 data，异形返回空数组', () => {
    expect(parseLlmtestComposite({ ok: true, data: [{ url: 'https://a.com' }] })).toHaveLength(1);
    expect(parseLlmtestComposite({ ok: false })).toEqual([]);
    expect(parseLlmtestComposite(null)).toEqual([]);
    expect(parseLlmtestComposite({ data: 'nope' })).toEqual([]);
  });

  it('mapLlmtestItemToCandidate：有效项 → gateway/crawl 候选 + 观测描述', () => {
    const c = mapLlmtestItemToCandidate({
      url: 'https://api.foo.cn/v1',
      name: ' Foo API ',
      score: 88,
      rank: 3,
      isAlive: true,
      total_checks: 100,
      pass_count: 95,
    });
    expect(c).not.toBeNull();
    expect(c!.candidateType).toBe('gateway');
    expect(c!.sourceType).toBe('crawl');
    expect(c!.domain).toBe('api.foo.cn');
    expect(c!.name).toBe('Foo API');
    expect(c!.apiBase).toBe('https://api.foo.cn/v1');
    expect(c!.description).toContain('score=88');
    expect(c!.description).toContain('pass=95/100');
    expect(c!.sourceUrl).toBe(LLMTEST_COMPOSITE_URL);
  });

  it('mapLlmtestItemToCandidate：无有效 url → null', () => {
    expect(mapLlmtestItemToCandidate({ name: 'NoUrl' })).toBeNull();
    expect(mapLlmtestItemToCandidate({ url: 'https://x' })).toBeNull(); // 无点主机太短
  });

  it('mapLlmtestItemsToCandidates：同批按域名去重，跳过无效项', () => {
    const list = mapLlmtestItemsToCandidates([
      { url: 'https://foo.cn', name: 'A' },
      { url: 'https://www.foo.cn/x', name: 'A dup' },
      { name: 'no url' },
      { url: 'https://bar.cn', name: 'B' },
    ]);
    expect(list.map((c) => c.domain).sort()).toEqual(['bar.cn', 'foo.cn']);
  });
});
