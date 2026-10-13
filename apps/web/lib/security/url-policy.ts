/**
 * URL Policy — SSRF 防护单源（S1/S2 安全治理）
 *
 * 服务端所有"主机名运行期可变"的出站 fetch 必须经此策略，包括：
 *   - discovery 管线（candidate-discovery 中 openrouter/duckduckgo/github/hn
 *     为受信任常量，仅走响应封顶，不经主机校验）
 *   - gateway 自定义渠道（普通用户可写 baseUrl —— 主要风险面）
 *   - sync adapters / 其余出站汇点
 *
 * 拒绝：
 *   - 非 http/https 协议（file:/ftp:/data: 等）
 *   - userinfo（https://user:pass@host —— 混淆解析、夹带凭据）
 *   - IP 字面量为私网/回环/链路本地/云元数据/CGNAT/组播/保留段
 *   - 主机名解析后任一 IP 落入上述范围（防"域名指向私网"型 SSRF）
 *
 * 双层防线：
 *   1) assertSafeUrl：连接前校验（可注入 resolve 供测试）；
 *   2) getSecureDispatcher：undici Agent 自定义 lookup —— 实际连接所使用的
 *      地址即策略过滤后的地址，消除 DNS-rebinding；undici 对每次重定向后的
 *      新主机重新 connect，"公网 302 跳私网"同样在此截断。
 *
 * 依据: OWASP SSRF Prevention Cheat Sheet；任务大纲 S1–S2。
 */

import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP, type LookupFunction } from 'node:net';
import { Agent, ProxyAgent, type Dispatcher } from 'undici';

export type ResolveFn = (host: string) => Promise<string[]>;

/** 默认解析器：与 fetch 内部一致的 libuv lookup 路径（含 /etc/hosts） */
const DEFAULT_RESOLVE: ResolveFn = async (host) => {
  const entries = await dnsLookup(host, { all: true });
  return entries.map((e) => e.address);
};

export class UnsafeUrlError extends Error {
  constructor(
    public readonly url: string,
    public readonly reason: string,
  ) {
    super(`URL blocked by SSRF policy: ${reason} (url=${url})`);
    this.name = 'UnsafeUrlError';
  }
}

/** 恒拒主机名：云元数据别名（即便 allowPrivate 也无合法用途） */
const METADATA_HOSTNAMES = new Set([
  'metadata',
  'metadata.google.internal',
  'metadata.aws.internal',
  'metadata.azure.com',
]);

/**
 * 校验单个 IP 字面量是否落入禁发段。
 * 返回 true = 必须拒绝。
 */
export function isBlockedIp(ip: string): boolean {
  const fam = isIP(ip);
  if (fam === 4) {
    const parts = ip.split('.').map((n) => Number(n));
    const [a, b, c] = parts;
    if (a === 0) return true; // 0.0.0.0/8 "本机"
    if (a === 127) return true; // 回环
    if (a === 10) return true; // 私网 10/8
    if (a === 169 && b === 254) return true; // 链路本地 + 云元数据 169.254/16
    if (a === 172 && b >= 16 && b <= 31) return true; // 私网 172.16/12
    if (a === 192 && b === 168) return true; // 私网 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
    if (a >= 224) return true; // 组播 224/4 + 保留 240/4
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmark 198.18/15
    if (a === 198 && b === 51 && c === 100) return true; // 文档 198.51.100/24
    if (a === 203 && b === 0 && c === 113) return true; // 文档 203.0.113/24
    return false;
  }
  if (fam === 6) {
    const lc = ip.toLowerCase();
    if (lc === '::1') return true; // 回环
    // 链路本地 fe80::/10：前 10 位 = 1111111010 → hex 前缀 fe8..feb
    if (/^fe[89ab]/.test(lc)) return true;
    // 唯一本地地址 fc00::/7 → fc..fd
    if (/^f[cd]/.test(lc)) return true;
    // 组播 ff00::/8
    if (/^ff/.test(lc)) return true;
    // IPv4-mapped ::ffff:a.b.c.d —— 递归判定嵌入的 v4
    const mapped = lc.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedIp(mapped[1]);
    return false;
  }
  // 未知族：保守拒绝
  return true;
}

export interface FetchPolicyOptions {
  /**
   * 放行私网目标（企业内网/自建模型地址）。
   * 铁律：只能由服务端可信调用点硬编码传入，禁止从任何用户请求字段读取；
   * 云元数据别名主机名即便放行仍被拒绝。
   */
  allowPrivate?: boolean;
}

/**
 * 断言 URL 通过 SSRF 策略。resolve 可注入，供单测模拟 DNS。
 * 通过则返回解析后的 URL 对象。
 */
export async function assertSafeUrl(
  rawUrl: string,
  resolve: ResolveFn = DEFAULT_RESOLVE,
  options: FetchPolicyOptions = {},
): Promise<URL> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError(rawUrl, 'invalid URL');
  }

  const proto = u.protocol.toLowerCase();
  if (proto !== 'http:' && proto !== 'https:') {
    throw new UnsafeUrlError(rawUrl, `protocol ${proto} not allowed`);
  }
  if (u.username || u.password) {
    throw new UnsafeUrlError(rawUrl, 'userinfo not allowed');
  }

  const host = u.hostname.toLowerCase();
  const hostNoBrackets = host.replace(/^\[|\]$/g, '');

  const ipFamily = isIP(hostNoBrackets);
  const ips: string[] = [];

  if (ipFamily !== 0) {
    // IP 字面量：直接判定，无需 DNS
    ips.push(hostNoBrackets);
  } else if (METADATA_HOSTNAMES.has(host) || (host === 'localhost' && !options.allowPrivate)) {
    // localhost 仅在 allowPrivate（服务端可信调用点）时放行——e2e mock 上游/自建网关合法用途
    throw new UnsafeUrlError(rawUrl, `hostname ${host} blocked`);
  } else {
    // 域名：解析后逐 IP 判定（任一私网即拒）
    let resolved: string[];
    try {
      resolved = await resolve(host);
    } catch {
      throw new UnsafeUrlError(rawUrl, `DNS resolution failed for ${host}`);
    }
    if (resolved.length === 0) {
      throw new UnsafeUrlError(rawUrl, `no DNS records for ${host}`);
    }
    ips.push(...resolved);
  }

  for (const ip of ips) {
    if (!options.allowPrivate && isBlockedIp(ip)) {
      throw new UnsafeUrlError(rawUrl, `address ${ip} is private/loopback/link-local/metadata`);
    }
  }

  return u;
}

/**
 * 连接时二次判定：自定义 DNS lookup，仅向 undici 返回通过策略的地址。
 * 关键性质：过滤后的地址既是策略判定输入也是 socket 实际目标，
 * 从根上消除 DNS-rebinding；undici 对重定向后的每个新主机重新执行 connect，
 * 因此"公网 302 跳私网"同样在此截断。
 */
function makeSecureLookup(allowPrivate: boolean): LookupFunction {
  type LookupCallback = (
    err: NodeJS.ErrnoException | null,
    address?: string | Array<{ address: string; family: number }>,
    family?: number,
  ) => void;

  const lookup = (hostname: string, opts: unknown, cb: unknown): void => {
    const callback = cb as LookupCallback;
    const wantAll = (opts as { all?: boolean }).all === true;
    dnsLookup(hostname, { all: true }).then(
      (entries) => {
        const safe = allowPrivate ? entries : entries.filter((e) => !isBlockedIp(e.address));
        if (safe.length === 0) {
          return callback(
            new UnsafeUrlError(hostname, `no routable address passed policy for ${hostname}`) as unknown as NodeJS.ErrnoException,
          );
        }
        if (wantAll) {
          return callback(null, safe.map((e) => ({ address: e.address, family: e.family })));
        }
        callback(null, safe[0].address, safe[0].family);
      },
      (err) => callback(err),
    );
  };

  return lookup as LookupFunction;
}

let secureAgent: Dispatcher | null = null;
let privateAgent: Dispatcher | null = null;

/**
 * SSRF 安全 Dispatcher（单例缓存）：
 *   默认 —— 私网在 DNS 层即被过滤，连接不可能落地；
 *   allowPrivate —— 仅服务端显式授权的调用方可取。
 */
export function getSecureDispatcher(options: FetchPolicyOptions = {}): Dispatcher {
  if (options.allowPrivate) {
    privateAgent ??= new Agent({ connect: { lookup: makeSecureLookup(true) } });
    return privateAgent;
  }
  secureAgent ??= new Agent({ connect: { lookup: makeSecureLookup(false) } });
  return secureAgent;
}

// ── 出网代理注入（可选，默认关闭） ──
//
// 用途：受限开发网络（本机无法直连 openrouter.ai / arena.ai，需 SOCKS/HTTP 代理）跑采集脚本。
// 边界与安全权衡（务必知悉）：
//   1. 仅当 process.env.HTTPS_PROXY/HTTP_PROXY（或同名小写）**显式设置且可解析**时生效；
//      未设置（生产 Docker/CI 常态）→ 完全回落 getSecureDispatcher，SSRF 语义零变化。
//   2. 代理模式下 DNS 解析发生在代理端，**本机的 DNS-rebinding 过滤被让渡给代理**——这是
//      有意接受的取舍（代理是用户可信的出网通道）。scheme/userinfo/IP 字面量私网/元数据主机名
//      等 URL 层拦截（assertSafeUrl）**仍逐跳生效**，故明显 SSRF 面不被削弱。
//   3. 代理地址本身常为 127.0.0.1（回环），属**刻意信任的出网路径**，不套用 isBlockedIp。
const proxyAgents = new Map<string, ProxyAgent>();

/** 读取并规范化出网代理 URL；无有效代理返回 null。 */
export function resolveOutboundProxy(env: Record<string, string | undefined> = process.env): string | null {
  const raw = env.HTTPS_PROXY ?? env.https_proxy ?? env.HTTP_PROXY ?? env.http_proxy;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
  } catch {
    // 非法代理 URL：视为未配置，回落安全派发
  }
  return null;
}

/**
 * 出网派发器：代理配置存在则经 ProxyAgent（按代理 URL 缓存单例），否则等价 getSecureDispatcher。
 */
export function getOutboundDispatcher(options: FetchPolicyOptions = {}): Dispatcher {
  const proxy = resolveOutboundProxy();
  if (proxy) {
    let agent = proxyAgents.get(proxy);
    if (!agent) {
      agent = new ProxyAgent({ uri: proxy });
      proxyAgents.set(proxy, agent);
    }
    return agent;
  }
  return getSecureDispatcher(options);
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 20;
/** 跨域跳转必须剥离的凭据头（与 fetch 同行为） */
const SENSITIVE_REQ_HEADERS = new Set(['authorization', 'x-api-key', 'cookie']);

/**
 * SSRF-safe fetch：
 *   1) 初始 URL 连接前策略断言；
 *   2) redirect:'manual' 自实现跳转循环 —— 每个 Location（含 IP 字面量私网）
 *      都重新断言，从根上封"公网 302 跳内网"；301/302/303 按 fetch 语义降级 GET 丢体；
 *      跨域剥离凭据头；
 *   3) 每跳经 secureDispatcher，域名型连接以过滤后地址落 socket（防 rebinding）。
 * 调用方原有 try/catch 语义不变——被策略拒绝等价于"端点不可达"。
 */
export async function safeFetch(
  rawUrl: string,
  init?: RequestInit,
  options?: FetchPolicyOptions & { resolve?: ResolveFn },
): Promise<Response> {
  const { resolve, ...policy } = options ?? {};
  let method = (init?.method ?? 'GET').toUpperCase();
  const headers = new Headers(init?.headers);
  let body: BodyInit | null | undefined = init?.body ?? null;

  let current = await assertSafeUrl(rawUrl, resolve, policy);
  let currentUrl = rawUrl;

  for (let hop = 0; ; hop += 1) {
    const res = await fetch(currentUrl, {
      ...init,
      method,
      headers,
      body,
      redirect: 'manual',
      dispatcher: getOutboundDispatcher(policy),
    } as RequestInit);

    if (!REDIRECT_STATUSES.has(res.status)) return res;

    const location = res.headers.get('location');
    if (!location) return res;
    if (hop + 1 >= MAX_REDIRECTS) {
      throw new TypeError(`redirect limit ${MAX_REDIRECTS} exceeded (url=${currentUrl})`);
    }

    // 真实 fetch 的 res.url 为请求 URL；stub 场景可能为空 —— 以当前 URL 兜底解析相对 Location
    const next = new URL(location, res.url || currentUrl);
    // 跳转目标连接前断言：IP 字面量私网仅在此层可拦（undici connect 对 IP 字面量跳过 lookup）
    await assertSafeUrl(next.toString(), resolve, policy);

    // 方法/体语义：303 一律 GET；301/302 仅非 GET/HEAD 时降级；307/308 保持
    if (
      res.status === 303 ||
      ((res.status === 301 || res.status === 302) && method !== 'GET' && method !== 'HEAD')
    ) {
      method = 'GET';
      body = null;
      headers.delete('content-length');
      headers.delete('content-type');
    }
    if (next.origin !== current.origin) {
      for (const h of SENSITIVE_REQ_HEADERS) headers.delete(h);
    }

    current = next;
    currentUrl = next.toString();
  }
}

// ── 响应体大小封顶（防提交端点返回超大体致内存放大） ──

export const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MiB

export class ResponseTooLargeError extends Error {
  constructor(
    public readonly url: string,
    public readonly declared: number | null,
    public readonly max: number,
  ) {
    super(`Response too large: declared=${declared ?? '?'} max=${max} (url=${url})`);
    this.name = 'ResponseTooLargeError';
  }
}

/**
 * 据 Content-Length 头预判：声明超限即拒（不读体，省内存）。
 * 对 chunked 无头响应无效——由 readCappedText 流式二次兜底。
 */
export function assertResponseSize(res: Response, max = MAX_RESPONSE_BYTES): void {
  const cl = res.headers.get('content-length');
  if (cl !== null) {
    const n = Number(cl);
    if (Number.isFinite(n) && n > max) {
      throw new ResponseTooLargeError(res.url, n, max);
    }
  }
}

/**
 * 流式读取响应体，累计字节超 max 即 cancel 并抛错。
 * 防 lying-header / chunked 无 Content-Length 的超大体。
 */
export async function readCappedText(res: Response, max = MAX_RESPONSE_BYTES): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const dec = new TextDecoder();
  let buf = '';
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > max) {
      try {
        await reader.cancel();
      } catch {
        // 忽略 cancel 失败
      }
      throw new ResponseTooLargeError(res.url, received, max);
    }
    buf += dec.decode(value, { stream: true });
  }
  buf += dec.decode();
  return buf;
}

/** 读取封顶体后解析 JSON；超限或解析失败抛错（由调用方 catch 降级） */
export async function readCappedJson<T = unknown>(
  res: Response,
  max = MAX_RESPONSE_BYTES,
): Promise<T> {
  const text = await readCappedText(res, max);
  return JSON.parse(text) as T;
}
