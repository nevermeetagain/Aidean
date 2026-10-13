/**
 * AgentIndexAdapter — sync adapter for agentindex.dev API.
 *
 * Data source: https://agentindex.dev/api/agents
 * Returns: AI agent list with name, description, capabilities, provider.
 *
 * R-71: 聚合采集——agentindex.dev 是 AI Agent 索引平台，
 * 覆盖各类 AI Agent 的基本信息与能力描述。
 */

import { BaseSyncAdapter } from './base';
import type { SyncConfig, RawModelData } from '../types/sync';

interface AgentEntry {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  provider?: string;
  capabilities?: string[];
  category?: string;
  url?: string;
  github_url?: string;
  open_source?: boolean;
}

interface AgentResponse {
  data?: AgentEntry[];
  agents?: AgentEntry[];
}

export class AgentIndexAdapter extends BaseSyncAdapter {
  readonly name = 'agentindex';
  readonly source = 'crawler';

  private readonly apiUrl = 'https://agentindex.dev/api/agents';

  async fetch(config: SyncConfig): Promise<RawModelData[]> {
    let data: AgentResponse;
    try {
      data = await this.fetchJson(this.apiUrl) as AgentResponse;
    } catch {
      return [];
    }

    const agents = data.data ?? data.agents ?? [];
    const limit = (config.options?.limit as number | undefined) ?? agents.length;

    return agents.slice(0, limit).map(a => this.mapAgent(a));
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.fetchJson(this.apiUrl);
      return true;
    } catch {
      return false;
    }
  }

  private mapAgent(a: AgentEntry): RawModelData {
    const modelCode = a.id ?? a.slug ?? a.name ?? '';
    return {
      modelCode,
      nameDisplay: a.name ?? modelCode,
      vendorName: a.provider,
      officialUrl: a.url,
      githubUrl: a.github_url,
      isOpenSource: a.open_source,
      status: a.category,
    };
  }
}
