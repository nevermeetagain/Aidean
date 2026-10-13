/**
 * Skill 同步脚本 - 基础适配器 v2.0
 * 参考：Skills同步方案_优化版_v2.md
 *
 * 核心改进：
 * 1. 字段级哈希计算
 * 2. 质量评分计算
 * 3. 断路器集成
 */
import axios from 'axios';
import crypto from 'crypto';
import { AdapterError, SyncErrorCode, FIELD_LEVEL_MAP, } from '../types/skill.js';
/**
 * 基础 Skill 适配器类 v2.0
 * 所有数据源适配器必须继承此类
 */
export class BaseSkillAdapter {
    config;
    client;
    constructor(config) {
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
     * 数据标准化：将原始数据转换为统一格式
     * v2.0: 增加字段级哈希和数据分层
     */
    normalize(rawData) {
        const mapping = this.getFieldMapping();
        const result = this.applyMapping(rawData, mapping);
        // 计算原始数据哈希（用于整记录变更检测）
        result.rawHash = this.computeHash(rawData);
        // v2.0: 计算字段级哈希
        result.fieldHashes = this.computeFieldHashes(rawData);
        // v2.0: 设置数据分层
        result.dataLayer = this.config.dataLayer;
        return result;
    }
    /**
     * v2.0: 计算字段级哈希
     * 每个字段单独计算哈希，用于字段级增量检测
     */
    computeFieldHashes(rawData) {
        const hashes = {};
        for (const field of Object.keys(FIELD_LEVEL_MAP)) {
            const value = rawData[field];
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
    applyMapping(data, mapping) {
        const result = {};
        for (const [targetField, source] of Object.entries(mapping)) {
            try {
                if (typeof source === 'function') {
                    result[targetField] = source(data);
                }
                else if (typeof source === 'string') {
                    result[targetField] = this.getNestedValue(data, source);
                }
            }
            catch (error) {
                console.warn(`[${this.config.sourceCode}] Failed to map field ${targetField}:`, error);
                result[targetField] = undefined;
            }
        }
        return result;
    }
    /**
     * 获取嵌套字段值
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((o, p) => o?.[p], obj);
    }
    /**
     * 计算数据哈希
     */
    computeHash(data) {
        const str = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash('sha256').update(str).digest('hex');
    }
    /**
     * 限流控制
     */
    async rateLimit() {
        const requestsPerSecond = this.config.rateLimitRequests / this.config.rateLimitWindow;
        const delayMs = Math.ceil(1000 / requestsPerSecond);
        await this.sleep(delayMs);
    }
    /**
     * 睡眠函数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * 带重试的请求
     */
    async requestWithRetry(requestFn, maxRetries = 3) {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await requestFn();
            }
            catch (error) {
                lastError = error;
                if (axios.isAxiosError(error) && error.response?.status === 429) {
                    const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
                    console.log(`[${this.config.sourceCode}] Rate limited, waiting ${retryAfter}s...`);
                    await this.sleep(retryAfter * 1000);
                }
                else {
                    const delay = Math.pow(2, i) * 1000;
                    await this.sleep(delay);
                }
            }
        }
        throw new AdapterError(`Request failed after ${maxRetries} retries`, SyncErrorCode.NETWORK_TIMEOUT, lastError);
    }
}
//# sourceMappingURL=BaseAdapter.js.map