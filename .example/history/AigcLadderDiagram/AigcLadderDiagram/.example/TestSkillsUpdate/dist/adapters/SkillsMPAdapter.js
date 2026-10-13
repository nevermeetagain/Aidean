/**
 * SkillsMP 数据源适配器
 * 参考：trae_mind.md 字段映射规则
 */
import { BaseSkillAdapter } from './BaseAdapter.js';
import { AdapterError, } from '../types/skill.js';
/**
 * SkillsMP 适配器
 * 数据源：skillsmp.com
 * 优先级：P1（最高）
 */
export class SkillsMPAdapter extends BaseSkillAdapter {
    constructor(config) {
        super(config);
    }
    /**
     * 流式获取 Skills 数据
     */
    async *fetchSkills(params) {
        let page = params.page || 1;
        const limit = params.limit || 100;
        let hasMore = true;
        while (hasMore) {
            try {
                const response = await this.requestWithRetry(() => this.client.get('/api/skills', {
                    params: {
                        page,
                        limit,
                        since: params.since,
                    },
                }));
                const skills = response.data?.data || response.data || [];
                if (!Array.isArray(skills)) {
                    throw new AdapterError(`Invalid response format: expected array, got ${typeof skills}`);
                }
                for (const skill of skills) {
                    yield skill;
                }
                hasMore = skills.length === limit;
                page++;
                // 限流控制
                await this.rateLimit();
            }
            catch (error) {
                if (error instanceof AdapterError) {
                    throw error;
                }
                throw new AdapterError(`Failed to fetch skills from SkillsMP: ${error.message}`, error);
            }
        }
    }
    /**
     * 获取单个 Skill 详情
     */
    async getSkillDetail(externalId) {
        try {
            const response = await this.requestWithRetry(() => this.client.get(`/api/skills/${externalId}`));
            return response.data;
        }
        catch (error) {
            throw new AdapterError(`Failed to get skill detail: ${externalId}`, error);
        }
    }
    /**
     * 验证连接
     */
    async validateConnection() {
        try {
            await this.client.get('/api/health');
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * 字段映射规则
     * 参考：trae_mind.md SkillsMP 字段映射表
     */
    getFieldMapping() {
        return {
            // 唯一标识
            skillKey: (data) => `skillsmp:${data.repo || data.id}`,
            // 基础信息
            name: 'name',
            displayName: (data) => data.displayName || data.name,
            description: 'description',
            author: 'author',
            // 来源信息
            source: () => 'skillsmp',
            sourceId: (data) => data.repo || data.id,
            sourceUrl: 'url',
            // 统计数据
            stars: (data) => data.stars || 0,
            downloadCount: (data) => data.installs || data.downloads || 0,
            // 分类标签
            category: (data) => data.category || 'uncategorized',
            tags: (data) => data.tags || [],
            // 版本信息
            version: (data) => data.version || '1.0.0',
            lastUpdated: (data) => data.lastUpdated ? new Date(data.lastUpdated) : new Date(),
            // 安装信息
            installCommand: 'installCommand',
            npmPackage: 'npmPackage',
        };
    }
}
//# sourceMappingURL=SkillsMPAdapter.js.map