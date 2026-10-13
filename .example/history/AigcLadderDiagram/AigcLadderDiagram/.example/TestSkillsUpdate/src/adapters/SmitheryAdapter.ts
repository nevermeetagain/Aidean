/**
 * Smithery 数据源适配器
 * 参考：trae_mind.md 字段映射规则
 */

import { BaseSkillAdapter } from './BaseAdapter.js';
import {
  DataSourceConfig,
  RawSkillRecord,
  FieldMapping,
  FetchParams,
  AdapterError,
} from '../types/skill.js';

/**
 * Smithery 适配器
 * 数据源：smithery.ai
 * 优先级：P2
 */
export class SmitheryAdapter extends BaseSkillAdapter {
  constructor(config: DataSourceConfig) {
    super(config);
  }

  /**
   * 流式获取 Skills 数据
   */
  async* fetchSkills(params: FetchParams): AsyncGenerator<RawSkillRecord> {
    let page = params.page || 1;
    const limit = params.limit || 50;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.requestWithRetry(() =>
          this.client.get('/api/skills', {
            params: {
              page,
              per_page: limit,
              since: params.since,
            },
          })
        );

        const skills = response.data?.skills || response.data?.data || response.data || [];

        if (!Array.isArray(skills)) {
          throw new AdapterError(`Invalid response format: expected array, got ${typeof skills}`);
        }

        for (const skill of skills) {
          yield skill as RawSkillRecord;
        }

        hasMore = skills.length === limit;
        page++;

        // Smithery 限流更严格
        await this.sleep(2000);
      } catch (error) {
        if (error instanceof AdapterError) {
          throw error;
        }
        throw new AdapterError(`Failed to fetch skills from Smithery: ${(error as Error).message}`, error as Error);
      }
    }
  }

  /**
   * 获取单个 Skill 详情
   */
  async getSkillDetail(externalId: string): Promise<RawSkillRecord> {
    try {
      const response = await this.requestWithRetry(() =>
        this.client.get(`/api/skills/${externalId}`)
      );
      return response.data as RawSkillRecord;
    } catch (error) {
      throw new AdapterError(`Failed to get skill detail: ${externalId}`, error as Error);
    }
  }

  /**
   * 验证连接
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.client.get('/api/health');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 字段映射规则
   * 参考：trae_mind.md Smithery 字段映射表
   */
  getFieldMapping(): FieldMapping {
    return {
      // 唯一标识
      skillKey: (data: any) => `smithery:${data.repo || data.full_name || data.id}`,
      
      // 基础信息
      name: 'name',
      displayName: (data: any) => data.displayName || data.name,
      description: 'description',
      author: (data: any) => data.owner?.login || data.owner || data.author || 'unknown',
      
      // 来源信息
      source: () => 'smithery',
      sourceId: (data: any) => data.repo || data.full_name || data.id,
      sourceUrl: (data: any) => {
        const repo = data.repo || data.full_name;
        return repo ? `https://smithery.ai/skills/${repo}` : data.html_url || data.url;
      },
      
      // 统计数据 - Smithery 使用 GitHub 数据
      stars: (data: any) => data.stargazers_count || data.stars || 0,
      downloadCount: (data: any) => data.install_count || data.downloads || 0,
      
      // 分类标签
      category: (data: any) => data.category || data.topics?.[0] || 'uncategorized',
      tags: (data: any) => data.topics || data.tags || [],
      
      // 版本信息
      version: (data: any) => data.version || '1.0.0',
      lastUpdated: (data: any) => {
        const date = data.updated_at || data.lastUpdated;
        return date ? new Date(date) : new Date();
      },
      
      // 安装信息
      installCommand: (data: any) => {
        const repo = data.repo || data.full_name;
        return repo ? `npx @smithery/cli install ${repo}` : undefined;
      },
      npmPackage: 'npmPackage',
    };
  }
}
