/**
 * SmitheryAdapter — sync adapter for smithery.ai MCP server registry.
 *
 * Data source: https://smithery.ai/api/servers
 * Returns: MCP server list with name, description, tools, provider.
 *
 * R-71: 聚合采集——smithery.ai 是 MCP Server 索引平台，
 * 覆盖各类 MCP Server 的基本信息与工具列表。
 */

import { BaseSyncAdapter } from './base';
import type { SyncConfig, RawModelData } from '../types/sync';

interface MCPServerEntry {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  repository?: string;
  tools?: string[];
  category?: string;
  url?: string;
  verified?: boolean;
}

interface MCPResponse {
  data?: MCPServerEntry[];
  servers?: MCPServerEntry[];
}

export class SmitheryAdapter extends BaseSyncAdapter {
  readonly name = 'smithery';
  readonly source = 'crawler';

  private readonly apiUrl = 'https://smithery.ai/api/servers';

  async fetch(config: SyncConfig): Promise<RawModelData[]> {
    let data: MCPResponse;
    try {
      data = await this.fetchJson(this.apiUrl) as MCPResponse;
    } catch {
      return [];
    }

    const servers = data.data ?? data.servers ?? [];
    const limit = (config.options?.limit as number | undefined) ?? servers.length;

    return servers.slice(0, limit).map(s => this.mapServer(s));
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.fetchJson(this.apiUrl);
      return true;
    } catch {
      return false;
    }
  }

  private mapServer(s: MCPServerEntry): RawModelData {
    const modelCode = s.id ?? s.slug ?? s.name ?? '';
    return {
      modelCode,
      nameDisplay: s.name ?? modelCode,
      officialUrl: s.url,
      githubUrl: s.repository,
      status: s.category,
    };
  }
}
