/**
 * Skills.sh 数据源适配器
 * 数据源：skills.sh
 * 优先级：P3
 * 数据分层：L1_COMMUNITY
 */
import { BaseSkillAdapter } from './BaseAdapter.js';
import { AdapterError, } from '../types/skill.js';
/**
 * Skills.sh 适配器
 * 数据源：skills.sh（开源MCP Server/Skill发现平台）
 */
export class SkillsShAdapter extends BaseSkillAdapter {
    constructor(config) {
        super(config);
    }
    /**
     * 流式获取 Skills 数据
     */
    async *fetchSkills(params) {
        let page = params.page || 1;
        const limit = params.limit || 50;
        let hasMore = true;
        while (hasMore) {
            try {
                const response = await this.requestWithRetry(() => this.client.get('/api/v1/skills', {
                    params: {
                        page,
                        per_page: limit,
                        since: params.since,
                    },
                }));
                const skills = response.data?.skills || response.data?.data || response.data || [];
                if (!Array.isArray(skills)) {
                    throw new AdapterError(`Invalid response format from skills.sh: expected array, got ${typeof skills}`);
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
                throw new AdapterError(`Failed to fetch skills from Skills.sh: ${error.message}`, error);
            }
        }
    }
    /**
     * 获取单个 Skill 详情
     */
    async getSkillDetail(externalId) {
        try {
            const response = await this.requestWithRetry(() => this.client.get(`/api/v1/skills/${externalId}`));
            return response.data;
        }
        catch (error) {
            throw new AdapterError(`Failed to get skill detail from Skills.sh: ${externalId}`, error);
        }
    }
    /**
     * 验证连接
     */
    async validateConnection() {
        try {
            await this.client.get('/api/v1/health');
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * 字段映射规则
     * Skills.sh 的数据格式映射
     */
    getFieldMapping() {
        return {
            // 唯一标识
            skillKey: (data) => `skills_sh:${data.slug || data.id}`,
            // 基础信息
            name: 'name',
            displayName: (data) => data.display_name || data.name,
            description: (data) => data.description || data.short_description || '',
            author: (data) => data.author?.name || data.author || data.owner || 'unknown',
            // 来源信息
            source: () => 'skills_sh',
            sourceId: (data) => data.slug || data.id,
            sourceUrl: (data) => {
                const slug = data.slug || data.id;
                return slug ? `https://skills.sh/skills/${slug}` : data.url || '';
            },
            // 统计数据
            stars: (data) => data.stars || data.stargazers_count || 0,
            downloadCount: (data) => data.install_count || data.downloads || 0,
            // 分类标签
            category: (data) => data.category || data.tags?.[0] || 'uncategorized',
            tags: (data) => data.tags || data.topics || [],
            // 版本信息
            version: (data) => data.latest_version || data.version || '1.0.0',
            lastUpdated: (data) => {
                const date = data.updated_at || data.lastUpdated;
                return date ? new Date(date) : new Date();
            },
            // 安装信息
            installCommand: (data) => {
                const slug = data.slug || data.id;
                return slug ? `npx @skillsh/cli install ${slug}` : undefined;
            },
            npmPackage: (data) => data.npm_package || data.package_name,
        };
    }
}
//# sourceMappingURL=SkillsShAdapter.js.map