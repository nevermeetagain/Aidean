/**
 * SkillsMP 数据源适配器
 * 参考：trae_mind.md 字段映射规则
 */
import { BaseSkillAdapter } from './BaseAdapter.js';
import { DataSourceConfig, RawSkillRecord, FieldMapping, FetchParams } from '../types/skill.js';
/**
 * SkillsMP 适配器
 * 数据源：skillsmp.com
 * 优先级：P1（最高）
 */
export declare class SkillsMPAdapter extends BaseSkillAdapter {
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
     * 参考：trae_mind.md SkillsMP 字段映射表
     */
    getFieldMapping(): FieldMapping;
}
//# sourceMappingURL=SkillsMPAdapter.d.ts.map