/**
 * T120-23 · 渠道探测 SSRF 防护与四态结果单测（注入 resolve / fetchImpl，零网络）。
 */
import { describe, expect, it, vi } from 'vitest';

import {
  assertProbeTarget,
  buildModelsUrl,
  isProbeBlockedIp,
  ProbeTargetForbiddenError,
  probeChannel,
} from '../probe';

const PUBLIC = async () => ['93.184.216.34'];
const resolveTo = (...ips: string[]) => async () => ips;
const input = { baseUrl: 'https://api.example.com/v1', apiKey: 'sk-test', format: 'OPENAI' };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('probe · SSRF 目标拒绝（≥12 例）', () => {
  const forbiddenUrls: Array<[string, string, ((h: string) => Promise<string[]>) | undefined]> = [
    ['非 https（http）', 'http://api.example.com/v1/models', PUBLIC],
    ['非 https（ftp）', 'ftp://api.example.com/models', PUBLIC],
    ['userinfo', 'https://u:p@api.example.com/models', PUBLIC],
    ['IP 字面量 10.x', 'https://10.0.0.5/models', undefined],
    ['IP 字面量 127.x', 'https://127.0.0.1/models', undefined],
    ['云元数据 169.254.169.254', 'https://169.254.169.254/latest/meta-data', undefined],
    ['IPv6 回环 ::1', 'https://[::1]/models', undefined],
    ['IPv6 ULA fc00::', 'https://[fc00::1]/models', undefined],
    ['IPv6 链路本地 fe80::', 'https://[fe80::1]/models', undefined],
    ['IPv4-mapped ::ffff:127.0.0.1', 'https://[::ffff:127.0.0.1]/models', undefined],
    ['元数据主机名', 'https://metadata.google.internal/models', PUBLIC],
    ['域名解析到 192.168.x', 'https://evil.example.com/models', resolveTo('192.168.1.10')],
    ['DNS 重绑定：多记录中混入 127.0.0.1', 'https://rebind.example.com/models', resolveTo('93.184.216.34', '127.0.0.1')],
    ['域名解析到 IPv6 ULA', 'https://v6.example.com/models', resolveTo('fd12:3456::1')],
    ['域名解析到 NAT64 64:ff9b::', 'https://nat64.example.com/models', resolveTo('64:ff9b::a00:1')],
    ['域名解析到 :: 未指定', 'https://zero.example.com/models', resolveTo('::')],
  ];

  it.each(forbiddenUrls)('%s → ProbeTargetForbiddenError', async (_label, url, resolve) => {
    await expect(assertProbeTarget(url, resolve)).rejects.toBeInstanceOf(ProbeTargetForbiddenError);
  });

  it('补充 IPv6 段：十六进制 mapped / IPv4 兼容 / 文档段', () => {
    expect(isProbeBlockedIp('::ffff:7f00:1')).toBe(true);
    expect(isProbeBlockedIp('::127.0.0.1')).toBe(true);
    expect(isProbeBlockedIp('2001:db8::1')).toBe(true);
    expect(isProbeBlockedIp('2606:4700::1111')).toBe(false);
    expect(isProbeBlockedIp('1.1.1.1')).toBe(false);
  });

  it('公网 https 放行', async () => {
    await expect(assertProbeTarget('https://api.example.com/v1/models', PUBLIC)).resolves.toBeInstanceOf(URL);
  });

  it('目标被拒时不发出任何请求', async () => {
    const fetchImpl = vi.fn();
    await expect(
      probeChannel({ ...input, baseUrl: 'https://10.1.2.3/v1' }, { fetchImpl: fetchImpl as never }),
    ).rejects.toBeInstanceOf(ProbeTargetForbiddenError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('probe · 请求形状与四态结果', () => {
  it('只发 GET {baseUrl}/models、manual 重定向、带 3s 超时信号与 Bearer', async () => {
    const fetchImpl = vi.fn(async () => json(200, { data: [{ id: 'a' }, { id: 'b' }] }));
    const r = await probeChannel(input, { fetchImpl: fetchImpl as never, resolve: PUBLIC });
    expect(r).toMatchObject({ outcome: 'reachable', httpStatus: 200, modelCount: 2 });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe('https://api.example.com/v1/models');
    expect(init.method).toBe('GET');
    expect(init.redirect).toBe('manual');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.body).toBeUndefined();
    expect(init.headers.Authorization).toBe('Bearer sk-test');
  });

  it('buildModelsUrl 去尾斜杠', () => {
    expect(buildModelsUrl('https://x.com/v1///')).toBe('https://x.com/v1/models');
  });

  it('anthropic 格式用 x-api-key', async () => {
    const fetchImpl = vi.fn(async () => json(200, { data: [] }));
    await probeChannel({ ...input, format: 'ANTHROPIC' }, { fetchImpl: fetchImpl as never, resolve: PUBLIC });
    const init = (fetchImpl.mock.calls[0] as unknown as [string, { headers: Record<string, string> }])[1];
    expect(init.headers['x-api-key']).toBe('sk-test');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it.each([401, 403])('%i → auth_failed', async (status) => {
    const r = await probeChannel(input, { fetchImpl: (async () => json(status, {})) as never, resolve: PUBLIC });
    expect(r).toMatchObject({ outcome: 'auth_failed', httpStatus: status, modelCount: null });
  });

  it('超时 → timeout', async () => {
    const fetchImpl = async () => {
      throw Object.assign(new Error('timeout'), { name: 'TimeoutError' });
    };
    const r = await probeChannel(input, { fetchImpl: fetchImpl as never, resolve: PUBLIC });
    expect(r).toMatchObject({ outcome: 'timeout', httpStatus: null, latencyMs: null });
  });

  it('真实 AbortSignal.timeout 生效（timeoutMs=20）', async () => {
    const fetchImpl = (_u: string, init: RequestInit) =>
      new Promise<Response>((_res, rej) => init.signal?.addEventListener('abort', () => rej(init.signal?.reason)));
    const r = await probeChannel(input, { fetchImpl: fetchImpl as never, resolve: PUBLIC, timeoutMs: 20 });
    expect(r.outcome).toBe('timeout');
  });

  it.each([
    ['500', () => json(500, {})],
    ['200 非 JSON', () => new Response('<html>', { status: 200 })],
    ['200 无 data 数组', () => json(200, { ok: true })],
  ])('%s → bad_response', async (_l, mk) => {
    const r = await probeChannel(input, { fetchImpl: (async () => mk()) as never, resolve: PUBLIC });
    expect(r.outcome).toBe('bad_response');
  });

  it('连接错误 → bad_response（httpStatus=null）', async () => {
    const fetchImpl = async () => {
      throw new TypeError('fetch failed');
    };
    const r = await probeChannel(input, { fetchImpl: fetchImpl as never, resolve: PUBLIC });
    expect(r).toMatchObject({ outcome: 'bad_response', httpStatus: null });
  });

  it.each([301, 302, 307, 308])('%i 重定向 → 30005 目标被拒（不跟随）', async (status) => {
    const fetchImpl = async () => new Response(null, { status, headers: { location: 'http://169.254.169.254/' } });
    await expect(
      probeChannel(input, { fetchImpl: fetchImpl as never, resolve: PUBLIC }),
    ).rejects.toBeInstanceOf(ProbeTargetForbiddenError);
  });
});
