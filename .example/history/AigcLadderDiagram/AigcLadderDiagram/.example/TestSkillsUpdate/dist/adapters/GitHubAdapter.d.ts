/**
 * GitHub 数据源适配器
 * 数据源：api.github.com
 * 优先级：P5（补充源，获取stars/forks等权威数据）
 * 数据分层：L0_RAW
 *
 * 设计考量：
 * - GitHub不是Skill源，而是权威数据补充源
 * - 用于补充stars/forks/issues等GitHub特有数据
 * - 需要GitHub Token避免API限流
 */
import { BaseSkillAdapter } from './BaseAdapter.js';
import { DataSourceConfig, RawSkillRecord, FieldMapping, FetchParams } from '../types/skill.js';
/**
 * GitHub 适配器
 * 数据源：api.github.com（L0原始源，补充权威数据）
 */
export declare class GitHubAdapter extends BaseSkillAdapter {
    constructor(config: DataSourceConfig);
    /**
     * 流式获取 Skills 数据
     * GitHub不是Skill发现源，通过搜索API查找MCP/Agent相关仓库
     */
    fetchSkills(params: FetchParams): AsyncGenerator<RawSkillRecord>;
    /**
     * 获取单个仓库详情（用于数据补充）
     * externalId格式: "owner/repo"
     */
    getSkillDetail(externalId: string): Promise<RawSkillRecord>;
    /**
     * 验证连接
     */
    validateConnection(): Promise<boolean>;
    /**
     * 字段映射规则
     * GitHub作为补充源，重点提供stars/forks/issues等权威数据
     */
    getFieldMapping(): FieldMapping;
    /**
     * 转换GitHub仓库数据
     */
    private transformRepo;
}
//# sourceMappingURL=GitHubAdapter.d.ts.map