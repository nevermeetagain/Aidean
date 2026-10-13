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
import { AdapterError, } from '../types/skill.js';
/**
 * GitHub 适配器
 * 数据源：api.github.com（L0原始源，补充权威数据）
 */
export class GitHubAdapter extends BaseSkillAdapter {
    constructor(config) {
        super(config);
    }
    /**
     * 流式获取 Skills 数据
     * GitHub不是Skill发现源，通过搜索API查找MCP/Agent相关仓库
     */
    async *fetchSkills(params) {
        let page = params.page || 1;
        const limit = Math.min(params.limit || 50, 100); // GitHub最大100
        let hasMore = true;
        // 搜索MCP Server相关仓库
        const searchQueries = [
            'mcp-server topic:mcp',
            'agent-skill topic:ai',
            'copilot-skill topic:copilot',
            'topic:mcp-server',
        ];
        for (const query of searchQueries) {
            let queryPage = page;
            let queryHasMore = true;
            while (queryHasMore) {
                try {
                    const response = await this.requestWithRetry(() => this.client.get('/search/repositories', {
                        params: {
                            q: query,
                            sort: 'stars',
                            order: 'desc',
                            per_page: limit,
                            page: queryPage,
                        },
                    }));
                    const repos = response.data?.items || [];
                    if (!Array.isArray(repos)) {
                        continue;
                    }
                    for (const repo of repos) {
                        yield this.transformRepo(repo);
                    }
                    queryHasMore = repos.length === limit && queryPage < 10; // 最多10页
                    queryPage++;
                    // GitHub API限流：认证5000/hour，未认证60/hour
                    await this.sleep(1000);
                }
                catch (error) {
                    if (error instanceof AdapterError) {
                        throw error;
                    }
                    console.warn(`[GitHub] Search for "${query}" failed: ${error.message}`);
                    queryHasMore = false;
                }
            }
        }
    }
    /**
     * 获取单个仓库详情（用于数据补充）
     * externalId格式: "owner/repo"
     */
    async getSkillDetail(externalId) {
        try {
            const response = await this.requestWithRetry(() => this.client.get(`/repos/${externalId}`));
            return this.transformRepo(response.data);
        }
        catch (error) {
            throw new AdapterError(`Failed to get GitHub repo detail: ${externalId}`, error);
        }
    }
    /**
     * 验证连接
     */
    async validateConnection() {
        try {
            const response = await this.client.get('/rate_limit');
            const remaining = response.data?.rate?.remaining || 0;
            console.log(`[GitHub] Rate limit remaining: ${remaining}`);
            return remaining > 0;
        }
        catch {
            return false;
        }
    }
    /**
     * 字段映射规则
     * GitHub作为补充源，重点提供stars/forks/issues等权威数据
     */
    getFieldMapping() {
        return {
            // 唯一标识
            skillKey: (data) => `github:${data.full_name || data.id}`,
            // 基础信息
            name: 'name',
            displayName: (data) => data.name,
            description: (data) => data.description || '',
            author: (data) => data.owner?.login || 'unknown',
            // 来源信息
            source: () => 'github',
            sourceId: (data) => data.full_name || data.id,
            sourceUrl: (data) => data.html_url || `https://github.com/${data.full_name}`,
            // 统计数据 — GitHub的权威数据
            stars: (data) => data.stargazers_count || data.stars || 0,
            downloadCount: (data) => data.forks_count || 0, // GitHub用forks代替
            // 分类标签
            category: (data) => data.language || data.topics?.[0] || 'uncategorized',
            tags: (data) => data.topics || [],
            // 版本信息
            version: (data) => data.default_branch || 'main',
            lastUpdated: (data) => {
                const date = data.updated_at || data.pushed_at;
                return date ? new Date(date) : new Date();
            },
            // 安装信息
            installCommand: (data) => {
                const fullName = data.full_name;
                return fullName ? `npx degit ${fullName}` : undefined;
            },
            npmPackage: (data) => undefined, // GitHub仓库不一定有npm包
        };
    }
    /**
     * 转换GitHub仓库数据
     */
    transformRepo(repo) {
        return {
            id: repo.full_name || String(repo.id),
            name: repo.name,
            description: repo.description,
            author: repo.owner?.login || 'unknown',
            repo: repo.full_name,
            url: repo.html_url,
            stars: repo.stargazers_count || 0,
            installs: repo.forks_count || 0,
            category: repo.language || repo.topics?.[0] || 'uncategorized',
            tags: repo.topics || [],
            version: repo.default_branch || 'main',
            lastUpdated: repo.updated_at || repo.pushed_at,
            npmPackage: undefined,
            installCommand: repo.full_name ? `npx degit ${repo.full_name}` : undefined,
        };
    }
}
//# sourceMappingURL=GitHubAdapter.js.map