/**
 * T120-23 · 控制台「外部渠道」探测徽标：四种 outcome + 目标被拒均有可见文案；runChannelProbe 响应映射。
 * （node 环境以 react-dom/server 静态渲染断言，无需 DOM）
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PROBE_BADGE, ProbeBadge, runChannelProbe } from '../../../../components/console/ApiChannelsPanel';

afterEach(() => vi.unstubAllGlobals());

describe('ProbeBadge', () => {
  it.each([
    ['reachable', '可达'],
    ['auth_failed', '鉴权失败'],
    ['timeout', '超时'],
    ['bad_response', '响应异常'],
    ['forbidden', '目标被拒'],
  ] as const)('%s → 「%s」可见', (state, label) => {
    const html = renderToStaticMarkup(createElement(ProbeBadge, { probe: { state, detail: 'd' } }));
    expect(html).toContain(`data-probe-state="${state}"`);
    expect(html).toContain(label);
    expect(PROBE_BADGE[state].label).toBe(label);
  });
});

describe('runChannelProbe', () => {
  const stub = (body: unknown) =>
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })));

  it('reachable 附 HTTP/延迟/模型数', async () => {
    stub({ code: 0, data: { outcome: 'reachable', httpStatus: 200, latencyMs: 12, modelCount: 5, probedAt: new Date().toISOString() } });
    await expect(runChannelProbe('x')).resolves.toEqual({ state: 'reachable', detail: 'HTTP 200 · 12ms · 5 个模型' });
    expect((fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0]).toBe('/api/v1/user/custom-channels/x/probe');
  });

  it('30005 → forbidden', async () => {
    stub({ code: 30005, message: '探测目标被拒绝：仅允许 https' });
    await expect(runChannelProbe('x')).resolves.toEqual({ state: 'forbidden', detail: '探测目标被拒绝：仅允许 https' });
  });

  it('429 等其他错误 → bad_response 附原因', async () => {
    stub({ code: 10006, message: '探测过于频繁，请稍后再试' });
    await expect(runChannelProbe('x')).resolves.toEqual({ state: 'bad_response', detail: '探测过于频繁，请稍后再试' });
  });
});
