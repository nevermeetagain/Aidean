/**
 * url-policy SSRF 守卫单测（S1/S2）
 *
 * 覆盖：
 *   - IPv4/IPv6 私网、回环、链路本地、云元数据、CGNAT、组播、保留段 → 拒
 *   - 公网 IP 字面量 → 放行（无需 DNS，hermetic）
 *   - 非 http(s) 协议、userinfo、localhost 主机名 → 拒
 *   - 注入式 resolve：域名解析到私网 → 拒（防"域名指向私网"型 SSRF）
 *   - 任一解析 IP 私网即拒（dual-stack 绑定）
 *   - safeFetch 集成：阻断时不发起真实请求
 *   - secureDispatcher：loopback 真实连接被阻断；重定向目标经同一 connect lookup 再判定
 */

import { afterAll, describe, it, expect, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { LookupFunction } from 'node:net';
import { Agent } from 'undici';
import {
  assertSafeUrl,
  isBlockedIp,
  safeFetch,
  UnsafeUrlError,
  assertResponseSize,
  readCappedText,
  readCappedJson,
  ResponseTooLargeError,
  MAX_RESPONSE_BYTES,
  getSecureDispatcher,
} from '../url-policy';

const PRIVATE_IPV4 = [
  '127.0.0.1',
  '127.255.255.254',
  '10.0.0.1',
  '10.255.255.255',
  '172.16.0.1',
  '172.31.255.255',
  '192.168.1.1',
  '169.254.169.254', // 云元数据
  '0.0.0.0',
  '224.0.0.1', // 组播
  '240.0.0.1', // 保留
  '100.64.0.1', // CGNAT
  '198.18.0.1', // benchmark
  '198.51.100.1', // 文档
  '203.0.113.1', // 文档
];

const PRIVATE_IPV6 = [
  '::1',
  'fe80::1',
  'fe90::1',
  'fea0::1',
  'feb0::1',
  'fd00::1',
  'fc00::1',
  'ff02::1',
  '::ffff:127.0.0.1', // v4-mapped 回环
  '::ffff:169.254.169.254', // v4-mapped 元数据
];

const PUBLIC_IPS = ['8.8.8.8', '1.1.1.1', '104.16.132.229', '13.107.42.14'];

describe('url-policy isBlockedIp', () => {
  describe.each(PRIVATE_IPV4.map((ip) => [ip]))('IPv4 私网 %s', (ip) => {
    it('被拒', () => {
      expect(isBlockedIp(ip)).toBe(true);
    });
  });
  describe.each(PRIVATE_IPV6.map((ip) => [ip]))('IPv6 私网 %s', (ip) => {
    it('被拒', () => {
      expect(isBlockedIp(ip)).toBe(true);
    });
  });
  describe.each(PUBLIC_IPS.map((ip) => [ip]))('公网 IP %s', (ip) => {
    it('放行', () => {
      expect(isBlockedIp(ip)).toBe(false);
    });
  });
  it('IPv4-mapped 公网放行', () => {
    expect(isBlockedIp('::ffff:8.8.8.8')).toBe(false);
  });
});

describe('url-policy assertSafeUrl', () => {
  describe('IP 字面量拒止（无需 DNS）', () => {
    for (const ip of [...PRIVATE_IPV4, ...PRIVATE_IPV6]) {
      it(`阻断 http://${ip}/x`, async () => {
        await expect(assertSafeUrl(`http://${ip}/x`)).rejects.toThrow(UnsafeUrlError);
      });
    }
  });
  describe('公网 IP 字面量放行', () => {
    for (const ip of PUBLIC_IPS) {
      it(`放行 https://${ip}/x`, async () => {
        await expect(assertSafeUrl(`https://${ip}/x`)).resolves.toBeTruthy();
      });
    }
  });
  it('阻断非 http(s) 协议', async () => {
    await expect(assertSafeUrl('file:///etc/passwd')).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl('ftp://example.com/x')).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl('data:text/plain,hi')).rejects.toThrow(UnsafeUrlError);
  });
  it('阻断 userinfo', async () => {
    await expect(assertSafeUrl('https://user:pass@8.8.8.8/x')).rejects.toThrow(UnsafeUrlError);
  });
  it('阻断 localhost 主机名（不经 DNS）', async () => {
    await expect(assertSafeUrl('https://localhost/api')).rejects.toThrow(UnsafeUrlError);
  });
  it('阻断元数据别名主机名', async () => {
    await expect(assertSafeUrl('https://metadata.google.internal')).rejects.toThrow(UnsafeUrlError);
  });
  it('非法 URL 抛 UnsafeUrlError', async () => {
    await expect(assertSafeUrl('not a url')).rejects.toThrow(UnsafeUrlError);
  });
  it('allowPrivate=true：私网 IP 字面量放行（仅服务端可传）', async () => {
    await expect(
      assertSafeUrl('http://10.0.0.1/x', undefined, { allowPrivate: true }),
    ).resolves.toBeTruthy();
  });
  it('allowPrivate=true：localhost 放行（e2e mock 上游/自建网关合法用途）', async () => {
    await expect(
      assertSafeUrl('http://localhost:3000/api/v1/mock-upstream', undefined, { allowPrivate: true }),
    ).resolves.toBeTruthy();
  });
  it('allowPrivate=true：元数据别名主机名仍拒绝', async () => {
    await expect(
      assertSafeUrl('https://metadata.google.internal', undefined, { allowPrivate: true }),
    ).rejects.toThrow(UnsafeUrlError);
  });
});

describe('url-policy DNS-resolved 私网拒止（注入 resolve）', () => {
  it('域名解析到 169.254.169.254 → 拒（防云元数据 SSRF）', async () => {
    const resolve = vi.fn(async () => ['169.254.169.254']);
    await expect(assertSafeUrl('https://evil.example.com/metadata', resolve)).rejects.toThrow(
      UnsafeUrlError,
    );
    expect(resolve).toHaveBeenCalledWith('evil.example.com');
  });
  it('域名解析到 10.0.0.1 → 拒', async () => {
    const resolve = async () => ['10.0.0.1'];
    await expect(assertSafeUrl('https://internal.example.com', resolve)).rejects.toThrow(
      UnsafeUrlError,
    );
  });
  it('域名解析到 IPv6 私网 → 拒', async () => {
    const resolve = async () => ['fd00::1'];
    await expect(assertSafeUrl('https://v6.example.com', resolve)).rejects.toThrow(UnsafeUrlError);
  });
  it('域名解析到公网 IP → 放行', async () => {
    const resolve = async () => ['8.8.8.8'];
    await expect(assertSafeUrl('https://api.example.com/v1/models', resolve)).resolves.toBeTruthy();
  });
  it('dual-stack：任一解析 IP 私网即拒', async () => {
    const resolve = async () => ['8.8.8.8', '10.0.0.1'];
    await expect(assertSafeUrl('https://dual.example.com', resolve)).rejects.toThrow(
      UnsafeUrlError,
    );
  });
  it('DNS 失败 → 拒', async () => {
    const resolve = async () => {
      throw new Error('ENOTFOUND');
    };
    await expect(assertSafeUrl('https://nope.example.com', resolve)).rejects.toThrow(
      UnsafeUrlError,
    );
  });
  it('空解析结果 → 拒', async () => {
    const resolve = async () => [];
    await expect(assertSafeUrl('https://empty.example.com', resolve)).rejects.toThrow(
      UnsafeUrlError,
    );
  });
});

describe('url-policy safeFetch', () => {
  it('阻断私网 URL 时不调用原生 fetch', async () => {
    // 静态 import 保证 UnsafeUrlError 类同一性（避免 resetModules 触发 ESM 双实例）
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    try {
      await expect(
        safeFetch('http://169.254.169.254/latest/meta-data/'),
      ).rejects.toThrow(UnsafeUrlError);
      expect(mockFetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('公网 302 跳 IP 字面量私网：Location 被拦截，不发起第二跳', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data/' } }),
      );
    vi.stubGlobal('fetch', mockFetch);
    try {
      // 初始 URL 用公网 IP 字面量免 DNS；fetch stub 返回跳私网的 302
      await expect(safeFetch('https://8.8.8.8/x')).rejects.toThrow(UnsafeUrlError);
      expect(mockFetch).toHaveBeenCalledTimes(1); // 第二跳未发生
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('公网 302 跳公网：正常跟随，返回最终响应', async () => {
    const finalRes = new Response(JSON.stringify({ ok: 1 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: 'https://1.1.1.1/v1' } }),
      )
      .mockResolvedValueOnce(finalRes);
    vi.stubGlobal('fetch', mockFetch);
    try {
      const res = await safeFetch('https://8.8.8.8/x');
      expect(res).toBe(finalRes);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('url-policy secureDispatcher 连接时判定', () => {
  const servers: Server[] = [];

  function loopbackServer(handler: (req: InstanceType<typeof import('node:http').IncomingMessage>, res: InstanceType<typeof import('node:http').ServerResponse>) => void): Promise<number> {
    return new Promise((resolvePort) => {
      const srv = createServer(handler);
      srv.listen(0, '127.0.0.1', () => {
        servers.push(srv);
        const addr = srv.address();
        resolvePort(typeof addr === 'object' && addr ? addr.port : 0);
      });
    });
  }

  it('默认 dispatcher：主机名 localhost 解析为回环 → 真实 TCP 在 lookup 阶段被阻断', async () => {
    const port = await loopbackServer((_req, res) => {
      res.writeHead(200).end('should-never-arrive');
    });
    await expect(
      fetch(`http://localhost:${port}/`, { dispatcher: getSecureDispatcher() } as RequestInit),
    ).rejects.toThrow();
  });

  it('重定向契约：跳转目标主机经同一 dispatcher 的 connect lookup 再判定（私网目标被截断）', async () => {
    const port2 = await loopbackServer((_req, res) => {
      res.writeHead(200).end('landed');
    });
    const port1 = await loopbackServer((_req, res) => {
      res.writeHead(302, { location: `http://redirect.test:${port2}/x` }).end();
    });

    // 首站用 localhost（lookup 放行回环 → 落 port1）；redirect.test 一律 lookup 失败。
    // 若重定向不经过 lookup，请求会落地 port2。
    const lookupMock = vi.fn(
      // undici 以 all:true 调用 —— 成功须回地址数组
      (hostname: string, _opts: unknown, cb: (err: Error | null, addresses?: Array<{ address: string; family: number }>) => void) => {
        if (hostname === 'localhost') cb(null, [{ address: '127.0.0.1', family: 4 }]);
        else cb(new Error(`blocked by test policy: ${hostname}`));
      },
    );
    const agent = new Agent({
      connect: { lookup: lookupMock as unknown as LookupFunction },
    });

    await expect(
      fetch(`http://localhost:${port1}/`, { dispatcher: agent } as RequestInit),
    ).rejects.toThrow();
    expect(lookupMock).toHaveBeenCalledWith(
      'localhost',
      expect.anything(),
      expect.anything(),
    );
    expect(lookupMock).toHaveBeenCalledWith(
      'redirect.test',
      expect.anything(),
      expect.anything(),
    );
  });

  afterAll(async () => {
    await Promise.all(
      servers.map(
        (srv) => new Promise<void>((resolveClose) => srv.close(() => resolveClose())),
      ),
    );
  });
});

describe('url-policy 响应体封顶', () => {
  describe('assertResponseSize', () => {
    it('Content-Length 未超限 → 不抛', () => {
      const res = new Response(null, { headers: { 'content-length': '1024' } });
      expect(() => assertResponseSize(res, MAX_RESPONSE_BYTES)).not.toThrow();
    });
    it('Content-Length 超限 → 抛 ResponseTooLargeError', () => {
      const res = new Response(null, { headers: { 'content-length': '9999999' } });
      expect(() => assertResponseSize(res, 1024)).toThrow(ResponseTooLargeError);
    });
    it('无 Content-Length 头 → 不抛（交由流式兜底）', () => {
      const res = new Response(null);
      expect(() => assertResponseSize(res, 10)).not.toThrow();
    });
  });

  describe('readCappedText', () => {
    it('体小于上限 → 原样返回', async () => {
      const res = new Response('hello world');
      expect(await readCappedText(res, 1024)).toBe('hello world');
    });
    it('体超上限 → 抛 ResponseTooLargeError（流式中止）', async () => {
      const res = new Response('x'.repeat(5000));
      await expect(readCappedText(res, 100)).rejects.toThrow(ResponseTooLargeError);
    });
    it('空体 → 返回空串', async () => {
      const res = new Response('');
      expect(await readCappedText(res, 1024)).toBe('');
    });
  });

  describe('readCappedJson', () => {
    it('合法 JSON 且未超限 → 解析返回', async () => {
      const res = new Response('{"object":"list","data":[1,2,3]}');
      await expect(readCappedJson(res, 1024)).resolves.toEqual({ object: 'list', data: [1, 2, 3] });
    });
    it('体超上限 → 抛 ResponseTooLargeError（先于 JSON.parse）', async () => {
      const res = new Response('{' + '"k":"v",'.repeat(2000) + '"z":1}');
      await expect(readCappedJson(res, 100)).rejects.toThrow(ResponseTooLargeError);
    });
  });
});
