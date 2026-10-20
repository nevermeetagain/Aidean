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

describe('llmtest 观测入时序 (TASK-073/099 · ReliabilityObservation 写入载荷)', () => {
  // TASK-099：窗口按 Asia/Shanghai 自然日（UTC+8）。AT 上海时间 = 10-19 21:45 → 上海日 [10-18T16:00Z, 10-19T16:00Z)。
  const AT = new Date('2026-10-19T13:45:00Z');
  const SH_START = new Date('2026-10-18T16:00:00.000Z');
  const SH_END = new Date('2026-10-19T16:00:00.000Z');

  it('entityId 只用站点 id；无 stationId 注入 → null；无有效域名 → null；窗口=上海自然日', () => {
    const obs = mapLlmtestItemToObservation({ url: 'https://api.foo.cn/v1' }, { at: AT, stationId: 'st-foo' });
    expect(obs).not.toBeNull();
    expect(obs!.entityType).toBe('station');
    expect(obs!.entityId).toBe('st-foo'); // TASK-099：站点 id，非域名
    expect(obs!.successCount).toBe(0);
    expect(obs!.failureCount).toBe(0);
    expect(obs!.uptimePercent).toBeNull();
    expect(obs!.errorRate).toBeNull();
    expect(obs!.windowStart).toEqual(SH_START);
    expect(obs!.windowEnd).toEqual(SH_END);
    // 有效域名但未注入站点 id → null（skipped 由批量函数记录）
    expect(mapLlmtestItemToObservation({ url: 'https://api.foo.cn/v1' }, { at: AT })).toBeNull();
    // 无有效域名（无 url）→ null，与候选映射同口径
    expect(mapLlmtestItemToObservation({ name: 'NoUrl' }, { at: AT, stationId: 'st-x' })).toBeNull();
  });

  it('isAlive=false → errorRate=1；score 优先 uptime、缺 score 按通过率派生；entityId=站点 id', () => {
    const dead = mapLlmtestItemToObservation(
      { url: 'https://api.bar.cn', score: 40, isAlive: false, total_checks: 10, pass_count: 3 },
      { at: AT, stationId: 'st-bar' },
    );
    expect(dead!.entityId).toBe('st-bar');
    expect(dead!.uptimePercent).toBe(40); // score 优先
    expect(dead!.successCount).toBe(3);
    expect(dead!.failureCount).toBe(7);
    expect(dead!.errorRate).toBe(1); // isAlive=false 强制满错误率

    const derived = mapLlmtestItemToObservation(
      { url: 'https://api.baz.cn', total_checks: 10, pass_count: 6 }, // 无 score、isAlive 非 false
      { at: AT, stationId: 'st-baz' },
    );
    expect(derived!.uptimePercent).toBe(60); // 通过率派生 6/10*100
    expect(derived!.errorRate).toBeCloseTo(0.4); // 4/10
  });

  it('上海自然日窗口跨 UTC：上海墙钟日界（非 UTC 日界）', () => {
    // 2026-10-18T20:00Z = 上海 10-19 04:00 → 归上海日 10-19 → [10-18T16:00Z, 10-19T16:00Z)
    const a = mapLlmtestItemToObservation(
      { url: 'https://api.foo.cn' },
      { at: new Date('2026-10-18T20:00:00Z'), stationId: 'st-foo' },
    );
    expect(a!.windowStart).toEqual(new Date('2026-10-18T16:00:00.000Z'));
    expect(a!.windowEnd).toEqual(new Date('2026-10-19T16:00:00.000Z'));
    // 2026-10-19T16:30Z = 上海 10-20 00:30 → 归上海日 10-20 → [10-19T16:00Z, 10-20T16:00Z)
    const b = mapLlmtestItemToObservation(
      { url: 'https://api.foo.cn' },
      { at: new Date('2026-10-19T16:30:00Z'), stationId: 'st-foo' },
    );
    expect(b!.windowStart).toEqual(new Date('2026-10-19T16:00:00.000Z'));
    expect(b!.windowEnd).toEqual(new Date('2026-10-20T16:00:00.000Z'));
  });

  it('批量：有效域名缺站点 id → skipped；无 url 静默跳过不入 skipped；按站点 id 去重保留 windowEnd 更晚', () => {
    const stationIdByDomain = new Map<string, string>([
      ['api.foo.cn', 'st-foo'],
      ['api.qux.cn', 'st-qux'],
    ]);
    const res = mapLlmtestItemsToObservations(
      [
        { url: 'https://api.foo.cn', total_checks: 10, pass_count: 5, last_alive_at: '2026-10-19T05:00:00Z' },
        { url: 'https://www.api.foo.cn/x', total_checks: 10, pass_count: 8, last_alive_at: '2026-10-19T09:00:00Z' }, // 归一后同域、更晚
        { url: 'https://api.qux.cn', total_checks: 4, pass_count: 4 }, // 无 last_alive_at → SH_END
        { url: 'https://api.orphan.cn' }, // 有效域名但无站点 id 映射 → skipped
        { name: 'no url' }, // 无 url → 静默跳过，不入 skipped
      ],
      { at: AT, stationIdByDomain },
    );
    expect(res.skipped).toEqual(['api.orphan.cn']);
    expect(res.observations).toHaveLength(2);
    const foo = res.observations.find((o) => o.entityId === 'st-foo')!;
    expect(foo.windowEnd).toEqual(new Date('2026-10-19T09:00:00.000Z')); // 取更晚 last_alive_at（落在上海日内）
    expect(foo.successCount).toBe(8);
    const qux = res.observations.find((o) => o.entityId === 'st-qux')!;
    expect(qux.windowEnd).toEqual(SH_END); // last_alive_at 缺 → 上海日末
  });
});
