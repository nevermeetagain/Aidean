/**
 * SkillsMPAdapter — sync adapter for skillsmp.com AI skills registry.
 *
 * Data source: https://skillsmp.com/api/skills
 * Returns: AI skill list with name, description, category, provider.
 *
 * R-71: 聚合采集——skillsmp.com 是 AI Skills 索引平台，
 * 覆盖各类 AI 技能/插件的信息。
 */

import { BaseSyncAdapter } from './base';
import type { SyncConfig, RawModelData } from '../types/sync';

interface SkillEntry {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  provider?: string;
  category?: string;
  url?: string;
  github_url?: string;
  open_source?: boolean;
}

interface SkillsResponse {
  data?: SkillEntry[];
  skills?: SkillEntry[];
}

export class SkillsMPAdapter extends BaseSyncAdapter {
  readonly name = 'skillsmp';
  readonly source = 'crawler';

  private readonly apiUrl = 'https://skillsmp.com/api/skills';

  async fetch(config: SyncConfig): Promise<RawModelData[]> {
    let data: SkillsResponse;
    try {
      data = await this.fetchJson(this.apiUrl) as SkillsResponse;
    } catch {
      return [];
    }

    const skills = data.data ?? data.skills ?? [];
    const limit = (config.options?.limit as number | undefined) ?? skills.length;

    return skills.slice(0, limit).map(s => this.mapSkill(s));
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.fetchJson(this.apiUrl);
      return true;
    } catch {
      return false;
    }
  }

  private mapSkill(s: SkillEntry): RawModelData {
    const modelCode = s.id ?? s.slug ?? s.name ?? '';
    return {
      modelCode,
      nameDisplay: s.name ?? modelCode,
      vendorName: s.provider,
      officialUrl: s.url,
      githubUrl: s.github_url,
      isOpenSource: s.open_source,
      status: s.category,
    };
  }
}
