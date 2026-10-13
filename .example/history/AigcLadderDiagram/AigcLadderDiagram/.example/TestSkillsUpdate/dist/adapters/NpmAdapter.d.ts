/**
 * npm Registry 数据源适配器
 * 数据源：registry.npmjs.org
 * 优先级：P4（原始源，需清洗过滤）
 * 数据分层：L0_RAW
 *
 * 设计考量：
 * - npm包不等于Agent Skill，需要启发式规则预过滤
 * - 关键词：mcp-server, ai-agent, skill, agent-tool 等
 * - 排除：纯工具库、框架库、非AI相关包
 */
import { BaseSkillAdapter } from './BaseAdapter.js';
import { DataSourceConfig, RawSkillRecord, FieldMapping, FetchParams } from '../types/skill.js';
/**
 * npm 适配器
 * 数据源：registry.npmjs.org（L0原始源，需清洗过滤）
 */
export declare class NpmAdapter extends BaseSkillAdapter {
    constructor(config: DataSourceConfig);
    /**
     * 流式获取 Skills 数据
     * 从npm搜索API获取，并应用启发式过滤
     */
    fetchSkills(params: FetchParams): AsyncGenerator<RawSkillRecord>;
    /**
     * 获取单个包详情
     */
    getSkillDetail(externalId: string): Promise<RawSkillRecord>;
    /**
     * 验证连接
     */
    validateConnection(): Promise<boolean>;
    /**
     * 字段映射规则
     */
    getFieldMapping(): FieldMapping;
    /**
     * 启发式判断npm包是否可能是Agent Skill
     * L0层数据过滤的核心逻辑
     */
    private isLikelySkill;
    /**
     * 转换npm搜索结果
     */
    private transformNpmPackage;
    /**
     * 转换npm详情API结果
     */
    private transformNpmDetail;
}
//# sourceMappingURL=NpmAdapter.d.ts.map