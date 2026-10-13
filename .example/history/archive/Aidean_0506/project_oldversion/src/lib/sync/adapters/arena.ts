/**
 * Arena AI Leaderboard API 客户端适配器
 * 主源: api.wulong.dev/arena-ai-leaderboards/v1
 * 降级源: GitHub Raw JSON
 */

import type { ArenaLeaderboardEntry, ArenaLeaderboardResponse } from '../types/arena';

const PRIMARY_API_URL = 'https://api.wulong.dev/arena-ai-leaderboards/v1/leaderboard';
const FALLBACK_URL = 'https://raw.githubusercontent.com/oolong-tea-2026/arena-ai-leaderboards/main/data/text.json';

const DEFAULT_TIMEOUT = 15000;  // 15秒
const DEFAULT_RETRY = 1;          // 重试1次

export interface FetchOptions {
  name?: string;        // leaderboard 名称: 'text', 'vision', etc.
  timeout?: number;
  retryCount?: number;
  useFallback?: boolean;
}

export class ArenaClient {
  /**
   * 获取排行榜数据
   * 主源失败时自动切换到降级源
   */
  async fetchLeaderboard(options: FetchOptions = {}): Promise<ArenaLeaderboardEntry[]> {
    const { 
      name = 'text', 
      timeout = DEFAULT_TIMEOUT, 
      retryCount = DEFAULT_RETRY,
      useFallback = true 
    } = options;
    
    try {
      // 尝试主源
      const data = await this.fetchFromPrimary(name, timeout, retryCount);
      console.log(`[ArenaClient] Successfully fetched from primary source: ${data.length} entries`);
      return data;
    } catch (primaryError) {
      console.warn('[ArenaClient] Primary source failed:', primaryError);
      
      if (useFallback) {
        try {
          // 切换到降级源
          const data = await this.fetchFromFallback(timeout);
          console.log(`[ArenaClient] Successfully fetched from fallback source: ${data.length} entries`);
          return data;
        } catch (fallbackError) {
          console.error('[ArenaClient] Fallback source also failed:', fallbackError);
          throw new Error('Both primary and fallback sources failed');
        }
      } else {
        throw primaryError;
      }
    }
  }

  /**
   * 从主源获取数据
   */
  private async fetchFromPrimary(
    name: string,
    timeout: number,
    maxRetries: number
  ): Promise<ArenaLeaderboardEntry[]> {
    const url = new URL(PRIMARY_API_URL);
    url.searchParams.set('name', name);
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'AIGC-Ladder-Diagram/1.0',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Arena API error: ${response.status} ${response.statusText}`);
        }
        
        const data: ArenaLeaderboardResponse = await response.json();
        
        return data.leaderboard || [];
        
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(`[ArenaClient] Primary source timeout (attempt ${attempt + 1}/${maxRetries + 1})`);
        } else {
          console.error(`[ArenaClient] Primary source error (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
        }
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 500;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Failed to fetch from primary source after all retries');
  }

  /**
   * 从降级源获取数据
   */
  private async fetchFromFallback(timeout: number): Promise<ArenaLeaderboardEntry[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(FALLBACK_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Fallback source error: ${response.status} ${response.statusText}`);
      }
      
      const data: ArenaLeaderboardResponse = await response.json();
      
      return data.leaderboard || [];
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 检查数据源可用性
   */
  async checkAvailability(): Promise<{ primary: boolean; fallback: boolean }> {
    const results = { primary: false, fallback: false };
    
    try {
      await this.fetchFromPrimary('text', 5000, 0);
      results.primary = true;
    } catch {
      results.primary = false;
    }
    
    try {
      await this.fetchFromFallback(5000);
      results.fallback = true;
    } catch {
      results.fallback = false;
    }
    
    return results;
  }
}

// 单例导出
let defaultClient: ArenaClient | null = null;

export function getArenaClient(): ArenaClient {
  if (!defaultClient) {
    defaultClient = new ArenaClient();
  }
  return defaultClient;
}

export function resetArenaClient(): void {
  defaultClient = null;
}
