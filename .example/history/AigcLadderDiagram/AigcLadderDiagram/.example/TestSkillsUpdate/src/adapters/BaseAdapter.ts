/**
 * Skill 同步脚本 - 基础适配器 v2.0
 * 参考：Skills同步方案_优化版_v2.md
 * 
 * 核心改进：
 * 1. 字段级哈希计算
 * 2. 质量评分计算
 * 3. 断路器集成
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import {
  DataSourceConfig,
  RawSkillRecord,
  SkillSyncRecord,
  FieldMapping,
  FetchParams,
  AdapterError,
  SyncErrorCode,
  FIELD_LEVEL_MAP,
  DataLayer,
} from '../types/skill.js';

/**
 * 基础 Skill 适配器类 v2.0
 * 所有数据源适配器必须继承此类
 */
export abstract class BaseSkillAdapter {
  protected config: DataSourceConfig;
  protected client: AxiosInstance;

  constructor(config: DataSourceConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Trae-Skill-Sync/2.0',
      },
    });

    if (config.apiKey) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${config.apiKey}`;
    }
  }

  /**
   * 获取原始 Skill 数据（流式）
   */
  abstract fetchSkills(params: FetchParams): AsyncGenerator<RawSkillRecord>;

  /**
   * 获取单个 Skill 详情
   */
  abstract getSkillDetail(externalId: string): Promise<RawSkillRecord>;

  /**
   * 验证数据源连接
   */
  abstract validateConnection(): Promise<boolean>;

  /**
   * 获取字段映射规则
   */
  abstract getFieldMapping(): FieldMapping;

  /**
   * 数据标准化：将原始数据转换为统一格式
   * v2.0: 增加字段级哈希和数据分层
   */
  normalize(rawData: RawSkillRecord): SkillSyncRecord {
    const mapping = this.getFieldMapping();
    const result = this.applyMapping(rawData, mapping);
    
    // 计算原始数据哈希（用于整记录变更检测）
    result.rawHash = this.computeHash(rawData);
    
    // v2.0: 计算字段级哈希
    result.fieldHashes = this.computeFieldHashes(rawData);
    
    // v2.0: 设置数据分层
    result.dataLayer = this.config.dataLayer;
    
    return result as SkillSyncRecord;
  }

  /**
   * v2.0: 计算字段级哈希
   * 每个字段单独计算哈希，用于字段级增量检测
   */
  protected computeFieldHashes(rawData: RawSkillRecord): Record<string, string> {
    const hashes: Record<string, string> = {};
    
    for (const field of Object.keys(FIELD_LEVEL_MAP)) {
      const value = (rawData as any)[field];
      if (value !== undefined && value !== null) {
        hashes[field] = crypto
          .createHash('md5')
          .update(JSON.stringify(value))
          .digest('hex');
      }
    }
    
    return hashes;
  }

  /**
   * 应用字段映射
   */
  protected applyMapping(data: any, mapping: FieldMapping): Partial<SkillSyncRecord> {
    const result: Partial<SkillSyncRecord> = {};

    for (const [targetField, source] of Object.entries(mapping)) {
      try {
        if (typeof source === 'function') {
          result[targetField as keyof SkillSyncRecord] = source(data);
        } else if (typeof source === 'string') {
          result[targetField as keyof SkillSyncRecord] = this.getNestedValue(data, source);
        }
      } catch (error) {
        console.warn(`[${this.config.sourceCode}] Failed to map field ${targetField}:`, error);
        result[targetField as keyof SkillSyncRecord] = undefined;
      }
    }

    return result;
  }

  /**
   * 获取嵌套字段值
   */
  protected getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, p) => o?.[p], obj);
  }

  /**
   * 计算数据哈希
   */
  protected computeHash(data: any): string {
    const str = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  /**
   * 限流控制
   */
  protected async rateLimit(): Promise<void> {
    const requestsPerSecond = this.config.rateLimitRequests / this.config.rateLimitWindow;
    const delayMs = Math.ceil(1000 / requestsPerSecond);
    await this.sleep(delayMs);
  }

  /**
   * 睡眠函数
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 带重试的请求
   */
  protected async requestWithRetry<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
          console.log(`[${this.config.sourceCode}] Rate limited, waiting ${retryAfter}s...`);
          await this.sleep(retryAfter * 1000);
        } else {
          const delay = Math.pow(2, i) * 1000;
          await this.sleep(delay);
        }
      }
    }
    
    throw new AdapterError(
      `Request failed after ${maxRetries} retries`,
      SyncErrorCode.NETWORK_TIMEOUT,
      lastError
    );
  }
}
