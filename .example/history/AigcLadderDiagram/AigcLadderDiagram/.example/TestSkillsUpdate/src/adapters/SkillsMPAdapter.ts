/**
 * SkillsMP 数据源适配器
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
 * SkillsMP 适配器
 * 数据源：skillsmp.com
 * 优先级：P1（最高）
 */
export class SkillsMPAdapter extends BaseSkillAdapter {
  constructor(config: DataSourceConfig) {
    super(config);
  }

  /**
   * 流式获取 Skills 数据
   */
  async* fetchSkills(params: FetchParams): AsyncGenerator<RawSkillRecord> {
    let page = params.page || 1;
    const limit = params.limit || 100;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.requestWithRetry(() =>
          this.client.get('/api/skills', {
            params: {
              page,
              limit,
              since: params.since,
            },
          })
        );

        const skills = response.data?.data || response.data || [];

        if (!Array.isArray(skills)) {
          throw new AdapterError(`Invalid response format: expected array, got ${typeof skills}`);
        }

        for (const skill of skills) {
          yield skill as RawSkillRecord;
        }

        hasMore = skills.length === limit;
        page++;

        // 限流控制
        await this.rateLimit();
      } catch (error) {
        if (error instanceof AdapterError) {
          throw error;
        }
        throw new AdapterError(`Failed to fetch skills from SkillsMP: ${(error as Error).message}`, error as Error);
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
   * 参考：trae_mind.md SkillsMP 字段映射表
   */
  getFieldMapping(): FieldMapping {
    return {
      // 唯一标识
      skillKey: (data: any) => `skillsmp:${data.repo || data.id}`,
      
      // 基础信息
      name: 'name',
      displayName: (data: any) => data.displayName || data.name,
      description: 'description',
      author: 'author',
      
      // 来源信息
      source: () => 'skillsmp',
      sourceId: (data: any) => data.repo || data.id,
      sourceUrl: 'url',
      
      // 统计数据
      stars: (data: any) => data.stars || 0,
      downloadCount: (data: any) => data.installs || data.downloads || 0,
      
      // 分类标签
      category: (data: any) => data.category || 'uncategorized',
      tags: (data: any) => data.tags || [],
      
      // 版本信息
      version: (data: any) => data.version || '1.0.0',
      lastUpdated: (data: any) => data.lastUpdated ? new Date(data.lastUpdated) : new Date(),
      
      // 安装信息
      installCommand: 'installCommand',
      npmPackage: 'npmPackage',
    };
  }
}
