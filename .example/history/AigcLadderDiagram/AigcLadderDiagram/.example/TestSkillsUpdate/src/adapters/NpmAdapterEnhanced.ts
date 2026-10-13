/**
 * npm Registry 数据源适配器 - 增强版
 * 新增：GitHub API 获取 stars、topics、分类信息
 */

import axios from 'axios';
import { BaseSkillAdapter } from './BaseAdapter.js';
import {
  DataSourceConfig,
  RawSkillRecord,
  FieldMapping,
  FetchParams,
  AdapterError,
} from '../types/skill.js';

const SKILL_INDICATOR_KEYWORDS = [
  'mcp-server', 'mcp server', 'agent-skill', 'agent tool',
  'ai-agent', 'ai skill', 'ai-tool', 'copilot-skill',
  'claude-tool', 'gpt-tool', 'llm-tool', 'langchain-tool',
];

/**
 * npm 适配器 - 增强版
 * 通过 GitHub API 补充 stars、topics 等数据
 */
export class NpmAdapterEnhanced extends BaseSkillAdapter {
  private githubToken: string;
  private githubClient: any;

  constructor(config: DataSourceConfig) {
    super(config);
    this.githubToken = process.env.GITHUB_TOKEN || '';
    this.githubClient = axios.create({
      baseURL: 'https://api.github.com',
      headers: this.githubToken ? { Authorization: `token ${this.githubToken}` } : {},
      timeout: 10000,
    });
  }

  /**
   * 流式获取 Skills 数据
   */
  async* fetchSkills(params: FetchParams): AsyncGenerator<RawSkillRecord> {
    let page = params.page || 1;
    const limit = params.limit || 50;

    for (const keyword of SKILL_INDICATOR_KEYWORDS) {
      let keywordPage = page;
      let keywordHasMore = true;

      while (keywordHasMore) {
        try {
          const response = await this.requestWithRetry(() =>
            this.client.get('/-/v1/search', {
              params: {
                text: keyword,
                size: limit,
                from: (keywordPage - 1) * limit,
              },
            })
          );

          const packages = response.data?.objects || [];
          const total = response.data?.total || 0;

          if (!Array.isArray(packages)) continue;

          for (const pkg of packages) {
            const npmPkg = pkg.package;
            if (npmPkg && this.isLikelySkill(npmPkg)) {
              // 获取 GitHub 数据补充
              const enriched = await this.enrichWithGithubData(npmPkg);
              yield enriched as RawSkillRecord;
            }
          }

          keywordHasMore = packages.length === limit && (keywordPage * limit) < Math.min(total, 5000);
          keywordPage++;
          await this.sleep(500);
        } catch (error) {
          console.warn(`[npm] Search for "${keyword}" failed: ${(error as Error).message}`);
          keywordHasMore = false;
        }
      }
    }
  }

  /**
   * 通过 GitHub API 补充数据
   */
  private async enrichWithGithubData(pkg: any): Promise<any> {
    const repoUrl = pkg.links?.repository || pkg.repository?.url || '';
    const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/\.]+)/);
    
    if (!match) {
      return this.transformNpmPackage(pkg);
    }

    const [, owner, repo] = match;
    
    try {
      // 获取 GitHub 仓库信息
      const [repoResponse, topicsResponse] = await Promise.all([
        this.githubClient.get(`/repos/${owner}/${repo}`).catch(() => null),
        this.githubClient.get(`/repos/${owner}/${repo}/topics`, {
          headers: { Accept: 'application/vnd.github.mercy-preview+json' }
        }).catch(() => null),
      ]);

      const githubData = repoResponse?.data || {};
      const topics = topicsResponse?.data?.names || [];

      return {
        ...this.transformNpmPackage(pkg),
        github_stars: githubData.stargazers_count || 0,
        github_forks: githubData.forks_count || 0,
        github_topics: topics,
        github_description: githubData.description,
        github_updated_at: githubData.updated_at,
        language: githubData.language,
        // 合并 npm 和 github 的 keywords/topics
        keywords: [...new Set([...(pkg.keywords || []), ...topics])],
      };
    } catch (error) {
      // GitHub API 失败时返回基础数据
      return this.transformNpmPackage(pkg);
    }
  }

  /**
   * 转换 npm 包数据
   */
  private transformNpmPackage(pkg: any): any {
    return {
      id: pkg.name,
      name: pkg.name,
      description: pkg.description,
      author: pkg.author?.name || pkg.author || 'unknown',
      url: pkg.links?.npm || `https://www.npmjs.com/package/${pkg.name}`,
      stars: 0,
      installs: 0,
      category: 'uncategorized',
      tags: pkg.keywords || [],
      version: pkg.version || '0.0.0',
      lastUpdated: pkg.date,
      npmPackage: pkg.name,
      installCommand: `npm install ${pkg.name}`,
    };
  }

  /**
   * 字段映射 - 使用 GitHub 数据
   */
  getFieldMapping(): FieldMapping {
    return {
      skillKey: (data: any) => `npm:${data.name}`,
      name: 'name',
      displayName: (data: any) => data.name,
      description: (data: any) => data.github_description || data.description || '',
      author: (data: any) => {
        if (data.author?.name) return data.author.name;
        if (typeof data.author === 'string') return data.author;
        return 'unknown';
      },
      source: () => 'npm',
      sourceId: 'name',
      sourceUrl: (data: any) => {
        if (data.links?.repository) return data.links.repository;
        return `https://www.npmjs.com/package/${data.name}`;
      },
      // 使用 GitHub stars
      stars: (data: any) => data.github_stars || 0,
      downloadCount: (data: any) => data.downloads || 0,
      // 使用 GitHub topics 作为分类和标签
      category: (data: any) => {
        const topics = data.github_topics || data.keywords || [];
        if (topics.length > 0) return topics[0];
        return data.language || 'uncategorized';
      },
      tags: (data: any) => data.github_topics || data.keywords || [],
      version: (data: any) => data.version || '0.0.0',
      lastUpdated: (data: any) => {
        return data.github_updated_at || data.lastUpdated || new Date();
      },
      installCommand: (data: any) => `npm install ${data.name}`,
      npmPackage: 'name',
    };
  }

  /**
   * 启发式判断是否为 Agent Skill
   */
  private isLikelySkill(pkg: any): boolean {
    const keywords = (pkg.keywords || []).map((k: string) => k.toLowerCase());
    const name = (pkg.name || '').toLowerCase();
    const description = (pkg.description || '').toLowerCase();

    const nameIndicators = ['mcp-server', 'mcp-server-', 'agent-', 'skill-', 'ai-tool', 'copilot-'];
    if (nameIndicators.some(ind => name.includes(ind))) return true;
    if (keywords.some(k => SKILL_INDICATOR_KEYWORDS.some(ind => k.includes(ind)))) return true;
    if (description.includes('mcp server') || description.includes('agent tool')) return true;

    const negativeIndicators = ['eslint-', 'babel-', 'webpack-', 'typescript-', 'prettier-', 'jest-'];
    if (negativeIndicators.some(ind => name.startsWith(ind))) return false;

    return false;
  }

  async getSkillDetail(externalId: string): Promise<RawSkillRecord> {
    throw new AdapterError('Not implemented');
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.client.get('/-/v1/search', { params: { text: 'mcp-server', size: 1 } });
      return true;
    } catch {
      return false;
    }
  }
}
