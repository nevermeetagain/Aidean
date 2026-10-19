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
import { mapLlmtestItemToObservation, mapLlmtestItemsToObservations } from './llmtest-observations';

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

describe('llmtest 观测入时序 (TASK-073 · ReliabilityObservation 写入载荷)', () => {
  const AT = new Date('2026-10-19T13:45:00Z');
  const DAY_START = new Date('2026-10-19T00:00:00.000Z');
  const DAY_END = new Date('2026-10-20T00:00:00.000Z');

  it('缺字段：仅 url → 观测成形（计数 0/空指标 null、窗口=采集日）；无有效域名 → null', () => {
    const obs = mapLlmtestItemToObservation({ url: 'https://api.foo.cn/v1' }, { at: AT });
    expect(obs).not.toBeNull();
    expect(obs!.entityType).toBe('station');
    expect(obs!.entityId).toBe('api.foo.cn');
    expect(obs!.successCount).toBe(0);
    expect(obs!.failureCount).toBe(0);
    expect(obs!.uptimePercent).toBeNull();
    expect(obs!.errorRate).toBeNull();
    expect(obs!.windowStart).toEqual(DAY_START);
    expect(obs!.windowEnd).toEqual(DAY_END);
    // 无有效域名（无 url）→ null，与候选映射同口径
    expect(mapLlmtestItemToObservation({ name: 'NoUrl' }, { at: AT })).toBeNull();
  });

  it('isAlive=false → errorRate=1（覆盖失败率）；score 优先 uptime、缺 score 按通过率派生', () => {
    const dead = mapLlmtestItemToObservation(
      { url: 'https://api.bar.cn', score: 40, isAlive: false, total_checks: 10, pass_count: 3 },
      { at: AT },
    );
    expect(dead!.uptimePercent).toBe(40); // score 优先
    expect(dead!.successCount).toBe(3);
    expect(dead!.failureCount).toBe(7);
    expect(dead!.errorRate).toBe(1); // isAlive=false 强制满错误率

    const derived = mapLlmtestItemToObservation(
      { url: 'https://api.baz.cn', total_checks: 10, pass_count: 6 }, // 无 score、isAlive 非 false
      { at: AT },
    );
    expect(derived!.uptimePercent).toBe(60); // 通过率派生 6/10*100
    expect(derived!.errorRate).toBeCloseTo(0.4); // 4/10
  });

  it('重复采集：mapLlmtestItemsToObservations 按域名去重，保留 windowEnd 更晚（last_alive_at 更新）的一条', () => {
    const list = mapLlmtestItemsToObservations(
      [
        { url: 'https://api.foo.cn', total_checks: 10, pass_count: 5, last_alive_at: '2026-10-19T05:00:00Z' },
        { url: 'https://www.api.foo.cn/x', total_checks: 10, pass_count: 8, last_alive_at: '2026-10-19T09:00:00Z' }, // 同域、更晚
        { url: 'https://api.qux.cn', total_checks: 4, pass_count: 4 }, // 无 last_alive_at → dayEnd
      ],
      { at: AT },
    );
    expect(list).toHaveLength(2);
    const foo = list.find((o) => o.entityId === 'api.foo.cn')!;
    expect(foo.windowEnd).toEqual(new Date('2026-10-19T09:00:00.000Z')); // 取更晚 last_alive_at
    expect(foo.successCount).toBe(8);
    const qux = list.find((o) => o.entityId === 'api.qux.cn')!;
    expect(qux.windowEnd).toEqual(DAY_END); // last_alive_at 缺 → 采集日末
  });
});
