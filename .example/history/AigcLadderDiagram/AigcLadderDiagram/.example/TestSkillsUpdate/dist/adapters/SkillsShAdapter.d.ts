/**
 * Skills.sh 数据源适配器
 * 数据源：skills.sh
 * 优先级：P3
 * 数据分层：L1_COMMUNITY
 */
import { BaseSkillAdapter } from './BaseAdapter.js';
import { DataSourceConfig, RawSkillRecord, FieldMapping, FetchParams } from '../types/skill.js';
/**
 * Skills.sh 适配器
 * 数据源：skills.sh（开源MCP Server/Skill发现平台）
 */
export declare class SkillsShAdapter extends BaseSkillAdapter {
    constructor(config: DataSourceConfig);
    /**
     * 流式获取 Skills 数据
     */
    fetchSkills(params: FetchParams): AsyncGenerator<RawSkillRecord>;
    /**
     * 获取单个 Skill 详情
     */
    getSkillDetail(externalId: string): Promise<RawSkillRecord>;
    /**
     * 验证连接
     */
    validateConnection(): Promise<boolean>;
    /**
     * 字段映射规则
     * Skills.sh 的数据格式映射
     */
    getFieldMapping(): FieldMapping;
}
//# sourceMappingURL=SkillsShAdapter.d.ts.map