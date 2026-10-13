/**
 * MCP Server 数据源适配器
 * 支持 smithery.ai / glama.ai
 */

import { safeFetch, withRetry, safeNumber, safeString, truncate } from '../tool-sync-utils';
import type { StandardizedMCP } from '../types/tool-sync';

// ==================== smithery.ai MCP 适配器 ====================

interface SmitheryMCPResponse {
  servers: SmitheryMCPItem[];
  total?: number;
}

interface SmitheryMCPItem {
  qualifiedName: string;
  displayName: string;
  description: string;
  repository: {
    url: string;
    stars: number;
  };
  connections: {
    type: string;
    url?: string;
  }[];
  downloads: number;
  installCommand: string;
  categories: string[];
  tags: string[];
  iconUrl: string;
  securityProfile: {
    scanPassed: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export async function fetchMCPFromSmithery(options: {
  limit?: number;
  timeout?: number;
  retryCount?: number;
}): Promise<StandardizedMCP[]> {
  const { limit = 500, timeout = 30000, retryCount = 3 } = options;

  console.log('[MCPAdapter:smithery] 开始获取 smithery.ai MCP 数据...');

  const allMCPs: StandardizedMCP[] = [];
  let offset = 0;
  const pageSize = 50;
  let hasMore = true;

  while (hasMore && allMCPs.length < limit) {
    const url = `https://smithery.ai/api/servers?offset=${offset}&limit=${pageSize}`;

    const data = await withRetry(async () => {
      return safeFetch<SmitheryMCPResponse>(url, { timeout });
    }, retryCount);

    if (!data.servers || data.servers.length === 0) {
      hasMore = false;
      break;
    }

    for (const item of data.servers) {
      // 从 connections 推断协议类型
      const connType = item.connections?.[0]?.type || 'stdio';
      const protocolType = mapProtocolType(connType);

      allMCPs.push({
        name: safeString(item.qualifiedName),
        displayName: safeString(item.displayName || item.qualifiedName),
        description: truncate(safeString(item.description), 2000),
        author: item.repository?.url?.split('/').slice(-2)[0] || undefined,
        authorUrl: item.repository?.url?.split('/').slice(0, -1).join('/') || undefined,
        version: undefined,
        category: item.categories?.[0] || undefined,
        tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
        protocolType,
        command: extractCommand(item.installCommand),
        npmPackage: extractNpmPackage(item.installCommand),
        homepage: item.repository?.url || undefined,
        repository: item.repository?.url || undefined,
        downloads: safeNumber(item.downloads),
        stars: safeNumber(item.repository?.stars),
        icon: safeString(item.iconUrl) || undefined,
        source: 'smithery',
        sourceId: safeString(item.qualifiedName),
        sourceUrl: `https://smithery.ai/servers/${item.qualifiedName}`,
      });
    }

    if (data.servers.length < pageSize || allMCPs.length >= limit) {
      hasMore = false;
    }
    offset += pageSize;
  }

  console.log(`[MCPAdapter:smithery] 获取 ${allMCPs.length} 条 MCP 数据`);
  return allMCPs.slice(0, limit);
}

// ==================== glama.ai 适配器 ====================

interface GlamaResponse {
  servers: GlamaItem[];
  total?: number;
}

interface GlamaItem {
  id: string;
  name: string;
  display_name: string;
  description: string;
  author: string;
  author_url: string;
  category: string;
  tags: string[];
  transport_type: string;  // stdio | sse | http
  install_command: string;
  npm_package: string;
  homepage: string;
  repository: string;
  downloads: number;
  stars: number;
  rating: number;
  icon_url: string;
  url: string;
  version: string;
  environment_variables: Record<string, string>;
  command_args: string;
}

export async function fetchMCPFromGlama(options: {
  limit?: number;
  timeout?: number;
  retryCount?: number;
}): Promise<StandardizedMCP[]> {
  const { limit = 500, timeout = 30000, retryCount = 3 } = options;

  console.log('[MCPAdapter:glama] 开始获取 glama.ai MCP 数据...');

  const allMCPs: StandardizedMCP[] = [];
  let page = 1;
  const pageSize = 50;
  let hasMore = true;

  while (hasMore && allMCPs.length < limit) {
    const url = `https://glama.ai/api/v1/mcp-servers?page=${page}&page_size=${pageSize}`;

    const data = await withRetry(async () => {
      return safeFetch<GlamaResponse>(url, { timeout });
    }, retryCount);

    if (!data.servers || data.servers.length === 0) {
      hasMore = false;
      break;
    }

    for (const item of data.servers) {
      allMCPs.push({
        name: safeString(item.name),
        displayName: safeString(item.display_name || item.name),
        description: truncate(safeString(item.description), 2000),
        author: safeString(item.author) || undefined,
        authorUrl: safeString(item.author_url) || undefined,
        version: safeString(item.version) || undefined,
        category: safeString(item.category) || undefined,
        tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
        protocolType: mapProtocolType(item.transport_type),
        command: extractCommand(item.install_command),
        args: safeString(item.command_args) || undefined,
        env: item.environment_variables || undefined,
        npmPackage: safeString(item.npm_package) || undefined,
        homepage: safeString(item.homepage) || undefined,
        repository: safeString(item.repository) || undefined,
        downloads: safeNumber(item.downloads),
        stars: safeNumber(item.stars),
        rating: item.rating ? Number(item.rating) : undefined,
        icon: safeString(item.icon_url) || undefined,
        source: 'glama',
        sourceId: safeString(item.id),
        sourceUrl: safeString(item.url) || `https://glama.ai/mcp/servers/${item.id}`,
      });
    }

    if (data.servers.length < pageSize || allMCPs.length >= limit) {
      hasMore = false;
    }
    page++;
  }

  console.log(`[MCPAdapter:glama] 获取 ${allMCPs.length} 条 MCP 数据`);
  return allMCPs.slice(0, limit);
}

// ==================== 工具函数 ====================

function mapProtocolType(raw: string): string {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('sse')) return 'sse';
  if (lower.includes('http') || lower.includes('streamable')) return 'http';
  if (lower.includes('websocket') || lower.includes('ws')) return 'websocket';
  return 'stdio';
}

function extractCommand(installCmd: string | undefined): string | undefined {
  if (!installCmd) return undefined;
  // npx @scope/package → 提取完整命令
  const match = installCmd.match(/^(npx\s+\S+|node\s+\S+|uvx\s+\S+)/);
  return match ? match[1] : undefined;
}

function extractNpmPackage(installCmd: string | undefined): string | undefined {
  if (!installCmd) return undefined;
  const match = installCmd.match(/npx\s+(@?\S[\w\-./@]+)/);
  return match ? match[1] : undefined;
}
