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
import { AdapterError, } from '../types/skill.js';
/**
 * npm包中可能表示Agent Skill的关键词
 */
const SKILL_INDICATOR_KEYWORDS = [
    'mcp-server', 'mcp server', 'agent-skill', 'agent tool',
    'ai-agent', 'ai skill', 'ai-tool', 'copilot-skill',
    'claude-tool', 'gpt-tool', 'llm-tool', 'langchain-tool',
];
/**
 * npm 适配器
 * 数据源：registry.npmjs.org（L0原始源，需清洗过滤）
 */
export class NpmAdapter extends BaseSkillAdapter {
    constructor(config) {
        super(config);
    }
    /**
     * 流式获取 Skills 数据
     * 从npm搜索API获取，并应用启发式过滤
     */
    async *fetchSkills(params) {
        let page = params.page || 1;
        const limit = params.limit || 50;
        let hasMore = true;
        // 按关键词分批搜索
        for (const keyword of SKILL_INDICATOR_KEYWORDS) {
            let keywordPage = page;
            let keywordHasMore = true;
            while (keywordHasMore) {
                try {
                    const response = await this.requestWithRetry(() => this.client.get('/-/v1/search', {
                        params: {
                            text: keyword,
                            size: limit,
                            from: (keywordPage - 1) * limit,
                        },
                    }));
                    const packages = response.data?.objects || [];
                    const total = response.data?.total || 0;
                    if (!Array.isArray(packages)) {
                        continue;
                    }
                    for (const pkg of packages) {
                        const npmPkg = pkg.package;
                        if (npmPkg && this.isLikelySkill(npmPkg)) {
                            yield this.transformNpmPackage(npmPkg);
                        }
                    }
                    keywordHasMore = packages.length === limit && (keywordPage * limit) < total;
                    keywordPage++;
                    // npm限流控制
                    await this.sleep(500);
                }
                catch (error) {
                    if (error instanceof AdapterError) {
                        throw error;
                    }
                    // npm搜索部分失败不阻断整个流程
                    console.warn(`[npm] Search for "${keyword}" failed: ${error.message}`);
                    keywordHasMore = false;
                }
            }
        }
    }
    /**
     * 获取单个包详情
     */
    async getSkillDetail(externalId) {
        try {
            const response = await this.requestWithRetry(() => this.client.get(`/${encodeURIComponent(externalId)}`));
            const data = response.data;
            return this.transformNpmDetail(data);
        }
        catch (error) {
            throw new AdapterError(`Failed to get npm package detail: ${externalId}`, error);
        }
    }
    /**
     * 验证连接
     */
    async validateConnection() {
        try {
            await this.client.get('/-/ping');
            return true;
        }
        catch {
            // npm registry可能不支持ping，用搜索API测试
            try {
                await this.client.get('/-/v1/search', { params: { text: 'mcp-server', size: 1 } });
                return true;
            }
            catch {
                return false;
            }
        }
    }
    /**
     * 字段映射规则
     */
    getFieldMapping() {
        return {
            // 唯一标识
            skillKey: (data) => `npm:${data.name}`,
            // 基础信息
            name: 'name',
            displayName: (data) => data.name,
            description: (data) => data.description || '',
            author: (data) => {
                if (data.author?.name)
                    return data.author.name;
                if (typeof data.author === 'string')
                    return data.author;
                if (data.maintainers?.[0]?.name)
                    return data.maintainers[0].name;
                return 'unknown';
            },
            // 来源信息
            source: () => 'npm',
            sourceId: 'name',
            sourceUrl: (data) => {
                if (data.links?.repository)
                    return data.links.repository;
                if (data.links?.homepage)
                    return data.links.homepage;
                if (data.repository?.url)
                    return data.repository.url;
                return `https://www.npmjs.com/package/${data.name}`;
            },
            // 统计数据
            stars: (data) => data.github_stars || 0,
            downloadCount: (data) => data.downloads || 0,
            // 分类标签
            category: (data) => data.keywords?.[0] || 'uncategorized',
            tags: (data) => data.keywords || [],
            // 版本信息
            version: (data) => data.version || '0.0.0',
            lastUpdated: (data) => {
                const date = data.date || data.time?.[data.version];
                return date ? new Date(date) : new Date();
            },
            // 安装信息
            installCommand: (data) => `npm install ${data.name}`,
            npmPackage: 'name',
        };
    }
    /**
     * 启发式判断npm包是否可能是Agent Skill
     * L0层数据过滤的核心逻辑
     */
    isLikelySkill(pkg) {
        const keywords = (pkg.keywords || []).map((k) => k.toLowerCase());
        const name = (pkg.name || '').toLowerCase();
        const description = (pkg.description || '').toLowerCase();
        // 正面信号：名称包含关键词
        const nameIndicators = ['mcp-server', 'mcp-server-', 'agent-', 'skill-', 'ai-tool', 'copilot-'];
        if (nameIndicators.some(ind => name.includes(ind))) {
            return true;
        }
        // 正面信号：关键词包含Skill指示器
        if (keywords.some(k => SKILL_INDICATOR_KEYWORDS.some(ind => k.includes(ind)))) {
            return true;
        }
        // 正面信号：描述中提到MCP/Agent
        if (description.includes('mcp server') || description.includes('agent tool') || description.includes('ai agent')) {
            return true;
        }
        // 负面信号：明显不是Skill的包
        const negativeIndicators = ['eslint-', 'babel-', 'webpack-', 'typescript-', 'prettier-', 'jest-'];
        if (negativeIndicators.some(ind => name.startsWith(ind))) {
            return false;
        }
        // 默认：关键词匹配的包算作可能Skill
        return false;
    }
    /**
     * 转换npm搜索结果
     */
    transformNpmPackage(pkg) {
        return {
            id: pkg.name,
            name: pkg.name,
            description: pkg.description,
            author: pkg.author?.name || pkg.author || 'unknown',
            url: pkg.links?.npm || `https://www.npmjs.com/package/${pkg.name}`,
            stars: pkg.github_stars || 0,
            installs: pkg.downloads || 0,
            category: pkg.keywords?.[0] || 'uncategorized',
            tags: pkg.keywords || [],
            version: pkg.version || '0.0.0',
            lastUpdated: pkg.date,
            npmPackage: pkg.name,
            installCommand: `npm install ${pkg.name}`,
        };
    }
    /**
     * 转换npm详情API结果
     */
    transformNpmDetail(data) {
        const latest = data['dist-tags']?.latest;
        const latestVersion = latest ? data.versions?.[latest] : null;
        return {
            id: data.name,
            name: data.name,
            description: data.description || latestVersion?.description || '',
            author: data.author?.name || data.author || 'unknown',
            url: data.repository?.url || `https://www.npmjs.com/package/${data.name}`,
            stars: data.github_stars || 0,
            installs: data.downloads || 0,
            category: data.keywords?.[0] || latestVersion?.keywords?.[0] || 'uncategorized',
            tags: data.keywords || latestVersion?.keywords || [],
            version: latest || '0.0.0',
            lastUpdated: data.time?.[latest] || data.time?.modified,
            npmPackage: data.name,
            installCommand: `npm install ${data.name}`,
        };
    }
}
//# sourceMappingURL=NpmAdapter.js.map