/**
 * Agent 数据源适配器
 * 支持 agentindex.dev / agents.sh
 */

import { safeFetch, withRetry, safeNumber, safeString, truncate } from '../tool-sync-utils';
import type { StandardizedAgent } from '../types/tool-sync';

// ==================== agentindex.dev 适配器 ====================

interface AgentIndexResponse {
  agents: AgentIndexItem[];
  total?: number;
}

interface AgentIndexItem {
  id: string;
  name: string;
  display_name: string;
  description: string;
  author: string;
  author_url: string;
  category: string;
  tags: string[];
  capabilities: string[];
  model_support: string[];
  pricing: Record<string, any>;
  active_users: number;
  task_complete_rate: number;
  avg_rating: number;
  icon_url: string;
  website: string;
  url: string;
  version: string;
  name_cn: string;
}

export async function fetchFromAgentIndex(options: {
  limit?: number;
  timeout?: number;
  retryCount?: number;
}): Promise<StandardizedAgent[]> {
  const { limit = 500, timeout = 30000, retryCount = 3 } = options;

  console.log('[AgentAdapter:agentindex] 开始获取 agentindex.dev 数据...');

  const allAgents: StandardizedAgent[] = [];
  let page = 1;
  const pageSize = 50;
  let hasMore = true;

  while (hasMore && allAgents.length < limit) {
    const url = `https://agentindex.dev/api/v1/agents?page=${page}&page_size=${pageSize}`;

    const data = await withRetry(async () => {
      return safeFetch<AgentIndexResponse>(url, { timeout });
    }, retryCount);

    if (!data.agents || data.agents.length === 0) {
      hasMore = false;
      break;
    }

    for (const item of data.agents) {
      allAgents.push({
        name: safeString(item.name),
        nameCn: item.name_cn || undefined,
        displayName: safeString(item.display_name || item.name),
        description: truncate(safeString(item.description), 2000),
        author: safeString(item.author) || undefined,
        authorUrl: safeString(item.author_url) || undefined,
        version: safeString(item.version) || undefined,
        category: safeString(item.category) || undefined,
        tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
        capabilities: Array.isArray(item.capabilities) ? item.capabilities.filter(Boolean) : [],
        modelSupport: Array.isArray(item.model_support) ? item.model_support.filter(Boolean) : [],
        pricing: item.pricing || undefined,
        activeUsers: safeNumber(item.active_users),
        taskCompleteRate: item.task_complete_rate ? Number(item.task_complete_rate) : undefined,
        avgRating: item.avg_rating ? Number(item.avg_rating) : undefined,
        icon: safeString(item.icon_url) || undefined,
        website: safeString(item.website) || undefined,
        source: 'agentindex',
        sourceId: safeString(item.id),
        sourceUrl: safeString(item.url) || `https://agentindex.dev/agents/${item.id}`,
      });
    }

    if (data.agents.length < pageSize || allAgents.length >= limit) {
      hasMore = false;
    }
    page++;
  }

  console.log(`[AgentAdapter:agentindex] 获取 ${allAgents.length} 条 Agent 数据`);
  return allAgents.slice(0, limit);
}

// ==================== agents.sh 适配器 ====================

interface AgentsShResponse {
  data: AgentsShItem[];
  meta: {
    total: number;
    page: number;
    per_page: number;
  };
}

interface AgentsShItem {
  id: string;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  topics: string[];
  owner: {
    login: string;
    html_url: string;
  };
  capabilities: string[];
  model_support: string[];
  active_users: number;
  avg_rating: number;
  url: string;
}

export async function fetchFromAgentsSh(options: {
  limit?: number;
  timeout?: number;
  retryCount?: number;
}): Promise<StandardizedAgent[]> {
  const { limit = 500, timeout = 30000, retryCount = 3 } = options;

  console.log('[AgentAdapter:agents_sh] 开始获取 agents.sh 数据...');

  const allAgents: StandardizedAgent[] = [];
  let page = 1;
  const pageSize = 50;
  let hasMore = true;

  while (hasMore && allAgents.length < limit) {
    const url = `https://agents.sh/api/v1/agents?page=${page}&per_page=${pageSize}`;

    const data = await withRetry(async () => {
      return safeFetch<AgentsShResponse>(url, { timeout });
    }, retryCount);

    if (!data.data || data.data.length === 0) {
      hasMore = false;
      break;
    }

    for (const item of data.data) {
      allAgents.push({
        name: safeString(item.full_name || item.name),
        displayName: safeString(item.name),
        description: truncate(safeString(item.description), 2000),
        author: item.owner?.login || undefined,
        authorUrl: item.owner?.html_url || undefined,
        category: item.language || undefined,
        tags: Array.isArray(item.topics) ? item.topics.filter(Boolean) : [],
        capabilities: Array.isArray(item.capabilities) ? item.capabilities.filter(Boolean) : [],
        modelSupport: Array.isArray(item.model_support) ? item.model_support.filter(Boolean) : [],
        activeUsers: safeNumber(item.active_users),
        avgRating: item.avg_rating ? Number(item.avg_rating) : undefined,
        website: safeString(item.html_url) || undefined,
        source: 'agents_sh',
        sourceId: safeString(item.id || item.full_name),
        sourceUrl: safeString(item.url || item.html_url) || `https://agents.sh/agents/${item.full_name}`,
      });
    }

    if (data.data.length < pageSize || allAgents.length >= limit) {
      hasMore = false;
    }
    page++;
  }

  console.log(`[AgentAdapter:agents_sh] 获取 ${allAgents.length} 条 Agent 数据`);
  return allAgents.slice(0, limit);
}
