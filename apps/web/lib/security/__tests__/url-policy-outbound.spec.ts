/**
 * url-policy 出网代理注入单测（L4）。
 *
 * 关键性质：默认（无代理 env）下 getOutboundDispatcher 必须与 getSecureDispatcher 完全等价，
 * 保证生产/CI 的 SSRF 语义零变化；仅当显式配置代理 env 才切换 ProxyAgent（不建连，惰性）。
 */
import { describe, it, expect } from 'vitest';
import { ProxyAgent } from 'undici';
import { resolveOutboundProxy, getOutboundDispatcher, getSecureDispatcher } from '../url-policy';

describe('resolveOutboundProxy', () => {
  it('无 env / 非法值 → null', () => {
    expect(resolveOutboundProxy({})).toBeNull();
    expect(resolveOutboundProxy({ HTTPS_PROXY: 'nope' })).toBeNull();
    expect(resolveOutboundProxy({ HTTPS_PROXY: 'ftp://x.example' })).toBeNull();
  });
  it('合法 http(s) → 规范化返回', () => {
    expect(resolveOutboundProxy({ HTTPS_PROXY: 'http://127.0.0.1:10808' })).toMatch(
      /^http:\/\/127\.0\.0\.1:10808\/?$/,
    );
    expect(resolveOutboundProxy({ http_proxy: 'http://127.0.0.1:8888' })).toMatch(
      /^http:\/\/127\.0\.0\.1:8888\/?$/,
    );
  });
  it('HTTPS_PROXY 优先于 HTTP_PROXY', () => {
    expect(resolveOutboundProxy({ HTTPS_PROXY: 'http://a.example:1', HTTP_PROXY: 'http://b.example:2' })).toMatch(
      /^http:\/\/a\.example:1/,
    );
  });
});

describe('getOutboundDispatcher', () => {
  it('默认（无代理 env）等价 getSecureDispatcher —— SSRF 现状零变化', () => {
    const saved = { ...process.env };
    delete process.env.HTTPS_PROXY;
    delete process.env.https_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.http_proxy;
    try {
      expect(getOutboundDispatcher()).toBe(getSecureDispatcher());
    } finally {
      Object.assign(process.env, saved);
    }
  });

  it('设置代理 env → 返回 ProxyAgent 且按代理 URL 缓存单例（不建连）', () => {
    const saved = process.env.HTTPS_PROXY;
    process.env.HTTPS_PROXY = 'http://127.0.0.1:10808';
    try {
      const d = getOutboundDispatcher();
      expect(d).toBeInstanceOf(ProxyAgent);
      expect(getOutboundDispatcher()).toBe(d);
    } finally {
      if (saved === undefined) delete process.env.HTTPS_PROXY;
      else process.env.HTTPS_PROXY = saved;
    }
  });
});
