/**
 * SyncAdapter — base interface for upstream data source adapters.
 * Each adapter fetches raw data from a specific source (OpenRouter, LMSys, etc.)
 * and returns RawModelData[] for the mapper to normalize.
 */

import type { RawModelData, SyncConfig, SyncModelResult } from '../types/sync';
import { assertResponseSize, readCappedJson, safeFetch, UnsafeUrlError } from '../../security/url-policy';

export abstract class SyncAdapter {
  abstract readonly name: string;
  abstract readonly source: string;

  /**
   * Fetch raw model data from the upstream source.
   * @param config Sync configuration (dryRun, batchSize, etc.)
   * @returns Array of raw model data
   */
  abstract fetch(config: SyncConfig): Promise<RawModelData[]>;

  /**
   * Test connectivity to the upstream source.
   * @returns true if reachable
   */
  abstract testConnection(): Promise<boolean>;
}

/**
 * Base implementation with common utilities.
 * Subclasses extend this and implement fetch() + testConnection().
 */
export abstract class BaseSyncAdapter extends SyncAdapter {
  /**
   * L4 安全收口：出网统一经 safeFetch（SSRF 双层防线 + 逐跳重定向断言 + 响应封顶），
   * 替换此前「仅封顶不校验主机」的裸 fetch（url-policy 文档本就要求 sync adapters 经此策略）。
   * 出网健壮性：5xx / 网络层错误最多 3 次尝试 + 退避；策略拒绝与 4xx 立即失败（重试无意义）。
   */
  protected async fetchJson(url: string): Promise<unknown> {
    const res = await safeFetchWithRetry(url);
    if (!res.ok) {
      throw new Error(`${this.name}: HTTP ${res.status} from ${url}`);
    }
    assertResponseSize(res);
    return readCappedJson(res);
  }
}

const FETCH_TIMEOUT_MS = 30_000;
const FETCH_MAX_ATTEMPTS = 3;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 带退避重试的 safeFetch：仅对 5xx 与网络层错误重试；UnsafeUrlError（安全策略拒绝）立即抛出。
 */
async function safeFetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= FETCH_MAX_ATTEMPTS; attempt++) {
    try {
      const res = await safeFetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      // 5xx 且未到末次 → 退避重试；否则原样交回调用方（!ok 由 fetchJson 抛 HTTP 错）
      if (res.status >= 500 && attempt < FETCH_MAX_ATTEMPTS) {
        lastError = new Error(`HTTP ${res.status}`);
        await delay(200 * attempt);
        continue;
      }
      return res;
    } catch (err) {
      // 安全策略拒绝：重试无意义，立即抛出
      if (err instanceof UnsafeUrlError) throw err;
      lastError = err;
      if (attempt < FETCH_MAX_ATTEMPTS) await delay(200 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`fetch failed: ${String(lastError)}`);
}
