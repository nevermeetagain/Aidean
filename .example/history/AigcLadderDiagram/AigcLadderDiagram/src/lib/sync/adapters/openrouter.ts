/**
 * OpenRouter API 客户端适配器
 * 支持分页获取、超时控制、重试机制
 */

import type { OpenRouterModel, OpenRouterResponse } from '../types/openrouter';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/models';
const DEFAULT_TIMEOUT = 30000;  // 30秒
const DEFAULT_RETRY = 2;      // 重试2次

export interface FetchOptions {
  limit?: number;
  cursor?: string;
  timeout?: number;
  retryCount?: number;
}

export class OpenRouterClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[OpenRouterClient] API Key not provided, requests may fail');
    }
  }

  /**
   * 获取模型列表
   * 支持分页和自动重试
   */
  async fetchModels(options: FetchOptions = {}): Promise<OpenRouterModel[]> {
    const { limit = 100, timeout = DEFAULT_TIMEOUT, retryCount = DEFAULT_RETRY } = options;
    
    const allModels: OpenRouterModel[] = [];
    let cursor: string | undefined;
    let hasMore = true;
    
    while (hasMore && allModels.length < limit) {
      const batch = await this.fetchBatch(cursor, timeout, retryCount);
      
      if (!batch || batch.length === 0) {
        hasMore = false;
        break;
      }
      
      allModels.push(...batch);
      
      // OpenRouter API 目前不支持游标分页，一次性返回全部
      hasMore = false;
    }
    
    return allModels.slice(0, limit);
  }

  /**
   * 获取单批数据
   */
  private async fetchBatch(
    cursor?: string,
    timeout: number = DEFAULT_TIMEOUT,
    maxRetries: number = DEFAULT_RETRY
  ): Promise<OpenRouterModel[]> {
    const url = new URL(OPENROUTER_API_URL);
    
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'AIGC Ladder Diagram',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          if (response.status === 429) {
            // 限流，指数退避
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`[OpenRouterClient] Rate limited, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
        }
        
        const data: OpenRouterResponse = await response.json();
        
        return data.data || [];
        
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(`[OpenRouterClient] Request timeout (attempt ${attempt + 1}/${maxRetries + 1})`);
        } else {
          console.error(`[OpenRouterClient] Fetch error (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
        }
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[OpenRouterClient] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Failed to fetch from OpenRouter after all retries');
  }

  /**
   * 验证 API Key 是否有效
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const models = await this.fetchModels({ limit: 1 });
      return true;
    } catch (error) {
      console.error('[OpenRouterClient] API Key validation failed:', error);
      return false;
    }
  }
}

// 单例导出
let defaultClient: OpenRouterClient | null = null;

export function getOpenRouterClient(): OpenRouterClient {
  if (!defaultClient) {
    defaultClient = new OpenRouterClient();
  }
  return defaultClient;
}

export function resetOpenRouterClient(): void {
  defaultClient = null;
}
