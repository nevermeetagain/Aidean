/**
 * 工具同步通用工具函数
 * 含重试逻辑、API 请求封装、冲突处理
 */

import type { ToolSyncConfig } from './types/tool-sync';

/**
 * 带重试的异步操作
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retryCount: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | unknown;
  for (let i = 0; i <= retryCount; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < retryCount) {
        const delay = delayMs * Math.pow(2, i); // 指数退避
        console.warn(`[withRetry] 第 ${i + 1} 次重试，${delay}ms 后执行...`);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

/**
 * 延迟
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 安全的 JSON fetch 请求
 */
export async function safeFetch<T>(
  url: string,
  options: {
    timeout?: number;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const { timeout = 30000, headers = {} } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Aidean-Sync-Bot/1.0',
        ...headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${url}`);
    }

    return await response.json() as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 解析 CLI 参数
 */
export function parseToolSyncArgs(args: string[]): Partial<ToolSyncConfig> & { help?: boolean } {
  const config: Partial<ToolSyncConfig> & { help?: boolean } = {
    dryRun: false,
    timeout: 30000,
    retryCount: 3,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--source': {
        const val = args[++i];
        if (val) config.sources = val.split(',');
        break;
      }
      case '--limit': {
        const val = parseInt(args[++i]);
        if (!isNaN(val)) config.limit = val;
        break;
      }
      case '--dry-run': {
        config.dryRun = true;
        break;
      }
      case '--timeout': {
        const val = parseInt(args[++i]);
        if (!isNaN(val)) config.timeout = val;
        break;
      }
      case '--retry': {
        const val = parseInt(args[++i]);
        if (!isNaN(val)) config.retryCount = val;
        break;
      }
      case '--help':
      case '-h': {
        config.help = true;
        break;
      }
    }
  }

  return config;
}

/**
 * 截断过长字符串
 */
export function truncate(str: string, maxLen: number = 500): string {
  if (!str) return str;
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}

/**
 * 安全地提取数字
 */
export function safeNumber(val: any, defaultVal: number = 0): number {
  if (val === null || val === undefined) return defaultVal;
  const num = Number(val);
  return isNaN(num) ? defaultVal : num;
}

/**
 * 安全地提取字符串
 */
export function safeString(val: any, defaultVal: string = ''): string {
  if (val === null || val === undefined) return defaultVal;
  return String(val) || defaultVal;
}
