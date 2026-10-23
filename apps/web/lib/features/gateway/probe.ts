/**
 * T120-23 · 自定义渠道连通性探测（REQ-N-010 · contracts/01b-channel-probe）。
 *
 * 目标策略（任一不满足 → ProbeTargetForbiddenError → 30005，不发请求或丢弃响应）：
 *   1) 仅 https（http/file/ftp 等一律拒）；禁 userinfo；
 *   2) 主机名 DNS 解析后任一地址落入私网/回环/链路本地/云元数据/CGNAT/组播/保留段即拒（IPv4+IPv6），
 *      复用 lib/security/url-policy 的 assertSafeUrl + isBlockedIp，并在本文件补 IPv6 盲区
 *      （:: 未指定、::ffff:7f00:1 十六进制映射、IPv4 兼容 ::a.b.c.d、NAT64 64:ff9b::/96、2001:db8::/32 文档段）；
 *   3) DNS 重绑定：连接经 getOutboundDispatcher（自定义 lookup 只把通过策略的地址交给 socket），
 *      预检与实际连接用同一过滤器，二次解析到私网时连接直接失败；
 *   4) 禁止重定向：redirect:'manual'，任何 3xx → 30005；
 *   5) 3s 超时；只发 GET {baseUrl}/models，不带体。
 * 结果四态：reachable（2xx 且可解析为 OpenAI 兼容 {data:[]}）/ auth_failed（401/403）/ timeout / bad_response（其余）。
 */
import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import type { ChannelProbeResult } from '@aidean/shared';

import {
  assertSafeUrl,
  getOutboundDispatcher,
  isBlockedIp,
  UnsafeUrlError,
  type ResolveFn,
} from '../../security/url-policy';

export const PROBE_TIMEOUT_MS = 3000;
const MAX_BODY_BYTES = 1024 * 1024;

export class ProbeTargetForbiddenError extends Error {
  constructor(public readonly reason: string) {
    super(`探测目标被拒绝：${reason}`);
    this.name = 'ProbeTargetForbiddenError';
  }
}

/** url-policy 之外再收紧的 IPv6 段（返回 true = 拒绝）。 */
export function isExtraBlockedIpv6(ip: string): boolean {
  if (isIP(ip) !== 6) return false;
  const lc = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (lc === '::' || /^0*:0*:0*:0*:0*:0*:0*:0*$/.test(lc)) return true; // 未指定
  if (/^::ffff:[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(lc)) return true; // 十六进制 IPv4-mapped（::ffff:7f00:1）
  if (/^::\d+\.\d+\.\d+\.\d+$/.test(lc)) return true; // IPv4 兼容（已废弃）
  if (/^64:ff9b:/.test(lc)) return true; // NAT64 可映射到内网 v4
  if (/^2001:0?db8:/.test(lc)) return true; // 文档段
  return false;
}

export function isProbeBlockedIp(ip: string): boolean {
  return isBlockedIp(ip) || isExtraBlockedIpv6(ip);
}

/** 构造 {baseUrl}/models（去尾斜杠；保留 /v1 等前缀）。 */
export function buildModelsUrl(baseUrl: string): string {
  return `${baseUrl.trim().replace(/\/+$/, '')}/models`;
}

/** 预检：仅 https + url-policy + 补充 IPv6 段。失败抛 ProbeTargetForbiddenError。 */
export async function assertProbeTarget(rawUrl: string, resolve?: ResolveFn): Promise<URL> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new ProbeTargetForbiddenError('URL 非法');
  }
  if (u.protocol !== 'https:') throw new ProbeTargetForbiddenError('仅允许 https');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) && isProbeBlockedIp(host)) throw new ProbeTargetForbiddenError('目标地址属于受限网段');
  const base: ResolveFn =
    resolve ?? (async (h) => (await dnsLookup(h, { all: true })).map((e) => e.address));
  const resolver: ResolveFn = async (h) => {
    const ips = await base(h);
    if (ips.some((ip) => isExtraBlockedIpv6(ip))) {
      throw new UnsafeUrlError(rawUrl, `resolved to blocked IPv6 (${h})`);
    }
    return ips;
  };
  try {
    return await assertSafeUrl(rawUrl, resolver);
  } catch (e) {
    if (e instanceof UnsafeUrlError) throw new ProbeTargetForbiddenError('目标地址属于受限网段');
    // DNS 解析失败等：按不可达处理，交由调用方映射 bad_response
    throw e;
  }
}

export interface ProbeDeps {
  fetchImpl?: typeof fetch;
  resolve?: ResolveFn;
  now?: () => number;
  timeoutMs?: number;
}

function authHeaders(format: string, apiKey: string): Record<string, string> {
  const f = format.toLowerCase();
  if (f === 'anthropic') return { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
  if (f === 'gemini') return { 'x-goog-api-key': apiKey };
  return { Authorization: `Bearer ${apiKey}` };
}

function countModels(json: unknown): number | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (Array.isArray(o.data)) return o.data.length; // OpenAI / Anthropic 兼容
  if (Array.isArray(o.models)) return o.models.length; // Gemini
  return null;
}

/**
 * 探测渠道。目标被拒 → 抛 ProbeTargetForbiddenError（路由映射 30005）；其余情况一律返回四态之一。
 */
export async function probeChannel(
  input: { baseUrl: string; apiKey: string; format: string },
  deps: ProbeDeps = {},
): Promise<ChannelProbeResult> {
  const now = deps.now ?? Date.now;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const url = buildModelsUrl(input.baseUrl);
  const result = (
    outcome: ChannelProbeResult['outcome'],
    httpStatus: number | null,
    latencyMs: number | null,
    modelCount: number | null,
  ): ChannelProbeResult => ({ outcome, httpStatus, latencyMs, modelCount, probedAt: new Date(now()).toISOString() });

  try {
    await assertProbeTarget(url, deps.resolve);
  } catch (e) {
    if (e instanceof ProbeTargetForbiddenError) throw e;
    return result('bad_response', null, null, null); // DNS 失败：不可达
  }

  const started = now();
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json', ...authHeaders(input.format, input.apiKey) },
      redirect: 'manual',
      signal: AbortSignal.timeout(deps.timeoutMs ?? PROBE_TIMEOUT_MS),
      dispatcher: getOutboundDispatcher(),
    } as RequestInit);
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === 'TimeoutError' || name === 'AbortError') return result('timeout', null, null, null);
    return result('bad_response', null, null, null);
  }
  const latencyMs = Math.max(0, Math.round(now() - started));

  if ((res.status >= 300 && res.status < 400) || res.type === 'opaqueredirect') {
    throw new ProbeTargetForbiddenError('上游返回重定向（探测禁止跟随）');
  }
  if (res.status === 401 || res.status === 403) return result('auth_failed', res.status, latencyMs, null);
  if (res.status < 200 || res.status >= 300) return result('bad_response', res.status, latencyMs, null);

  try {
    const len = Number(res.headers.get('content-length') ?? '0');
    if (len > MAX_BODY_BYTES) return result('bad_response', res.status, latencyMs, null);
    const text = await res.text();
    if (text.length > MAX_BODY_BYTES) return result('bad_response', res.status, latencyMs, null);
    const count = countModels(JSON.parse(text));
    if (count === null) return result('bad_response', res.status, latencyMs, null);
    return result('reachable', res.status, latencyMs, count);
  } catch {
    return result('bad_response', res.status, latencyMs, null);
  }
}
