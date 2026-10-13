/**
 * Skill 同步脚本 - 基础适配器 v2.0
 * 参考：Skills同步方案_优化版_v2.md
 *
 * 核心改进：
 * 1. 字段级哈希计算
 * 2. 质量评分计算
 * 3. 断路器集成
 */
import { AxiosInstance } from 'axios';
import { DataSourceConfig, RawSkillRecord, SkillSyncRecord, FieldMapping, FetchParams } from '../types/skill.js';
/**
 * 基础 Skill 适配器类 v2.0
 * 所有数据源适配器必须继承此类
 */
export declare abstract class BaseSkillAdapter {
    protected config: DataSourceConfig;
    protected client: AxiosInstance;
    constructor(config: DataSourceConfig);
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
    normalize(rawData: RawSkillRecord): SkillSyncRecord;
    /**
     * v2.0: 计算字段级哈希
     * 每个字段单独计算哈希，用于字段级增量检测
     */
    protected computeFieldHashes(rawData: RawSkillRecord): Record<string, string>;
    /**
     * 应用字段映射
     */
    protected applyMapping(data: any, mapping: FieldMapping): Partial<SkillSyncRecord>;
    /**
     * 获取嵌套字段值
     */
    protected getNestedValue(obj: any, path: string): any;
    /**
     * 计算数据哈希
     */
    protected computeHash(data: any): string;
    /**
     * 限流控制
     */
    protected rateLimit(): Promise<void>;
    /**
     * 睡眠函数
     */
    protected sleep(ms: number): Promise<void>;
    /**
     * 带重试的请求
     */
    protected requestWithRetry<T>(requestFn: () => Promise<T>, maxRetries?: number): Promise<T>;
}
//# sourceMappingURL=BaseAdapter.d.ts.map