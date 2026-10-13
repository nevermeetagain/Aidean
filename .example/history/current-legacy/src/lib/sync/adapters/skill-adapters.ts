/**
 * Skills 数据源适配器
 * 支持 skillsmp.com / smithery.ai / skills.sh
 */

import { safeFetch, withRetry, safeNumber, safeString, truncate } from '../tool-sync-utils';
import type { StandardizedSkill } from '../types/tool-sync';

// ==================== skillsmp.com 适配器 ====================

interface SkillsmpResponse {
  skills: SkillsmpItem[];
  total: number;
}

interface SkillsmpItem {
  id: string;
  name: string;
  display_name: string;
  description: string;
  author: string;
  author_url: string;
  category: string;
  tags: string[];
  protocol: string;
  downloads: number;
  stars: number;
  rating: number;
  install_command: string;
  readme_url: string;
  icon_url: string;
  url: string;
  mcp_servers: string[];
  version: string;
  name_cn: string;
}

export async function fetchFromSkillsmp(options: {
  limit?: number;
  timeout?: number;
  retryCount?: number;
}): Promise<StandardizedSkill[]> {
  const { limit = 500, timeout = 30000, retryCount = 3 } = options;

  console.log('[SkillsAdapter:skillsmp] 开始获取 skillsmp.com 数据...');

  const allSkills: StandardizedSkill[] = [];
  let page = 1;
  const pageSize = 50;
  let hasMore = true;

  while (hasMore && allSkills.length < limit) {
    const url = `https://skillsmp.com/api/v1/skills?page=${page}&page_size=${pageSize}`;

    const data = await withRetry(async () => {
      return safeFetch<SkillsmpResponse>(url, { timeout });
    }, retryCount);

    if (!data.skills || data.skills.length === 0) {
      hasMore = false;
      break;
    }

    for (const item of data.skills) {
      allSkills.push({
        name: safeString(item.name),
        nameCn: item.name_cn || undefined,
        displayName: safeString(item.display_name || item.name),
        description: truncate(safeString(item.description), 2000),
        author: safeString(item.author) || undefined,
        authorUrl: safeString(item.author_url) || undefined,
        version: safeString(item.version) || undefined,
        category: safeString(item.category) || undefined,
        tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
        protocol: safeString(item.protocol, 'anthropic'),
        mcpServers: Array.isArray(item.mcp_servers) ? item.mcp_servers.filter(Boolean) : [],
        downloads: safeNumber(item.downloads),
        stars: safeNumber(item.stars),
        rating: item.rating ? Number(item.rating) : undefined,
        readmeUrl: safeString(item.readme_url) || undefined,
        installCmd: safeString(item.install_command) || undefined,
        icon: safeString(item.icon_url) || undefined,
        source: 'skillsmp',
        sourceId: safeString(item.id),
        sourceUrl: safeString(item.url) || `https://skillsmp.com/skills/${item.id}`,
      });
    }

    if (data.skills.length < pageSize || allSkills.length >= limit) {
      hasMore = false;
    }
    page++;
  }

  console.log(`[SkillsAdapter:skillsmp] 获取 ${allSkills.length} 条 Skills 数据`);
  return allSkills.slice(0, limit);
}

// ==================== smithery.ai 适配器 ====================

interface SmitheryResponse {
  servers: SmitheryItem[];
  total?: number;
}

interface SmitheryItem {
  qualifiedName: string;
  displayName: string;
  description: string;
  repository: {
    url: string;
    stars: number;
    forkCount: number;
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
  createdAt: string;
  updatedAt: string;
}

export async function fetchFromSmithery(options: {
  limit?: number;
  timeout?: number;
  retryCount?: number;
}): Promise<StandardizedSkill[]> {
  const { limit = 500, timeout = 30000, retryCount = 3 } = options;

  console.log('[SkillsAdapter:smithery] 开始获取 smithery.ai Skills 数据...');

  const allSkills: StandardizedSkill[] = [];
  let offset = 0;
  const pageSize = 50;
  let hasMore = true;

  while (hasMore && allSkills.length < limit) {
    const url = `https://smithery.ai/api/skills?offset=${offset}&limit=${pageSize}`;

    const data = await withRetry(async () => {
      return safeFetch<SmitheryResponse>(url, { timeout });
    }, retryCount);

    if (!data.servers || data.servers.length === 0) {
      hasMore = false;
      break;
    }

    for (const item of data.servers) {
      allSkills.push({
        name: safeString(item.qualifiedName),
        displayName: safeString(item.displayName || item.qualifiedName),
        description: truncate(safeString(item.description), 2000),
        author: item.repository?.url?.split('/').slice(-2)[0] || undefined,
        authorUrl: item.repository?.url?.split('/').slice(0, -1).join('/') || undefined,
        version: undefined,
        category: item.categories?.[0] || undefined,
        tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
        protocol: 'anthropic',
        mcpServers: [],
        downloads: safeNumber(item.downloads),
        stars: safeNumber(item.repository?.stars),
        readmeUrl: item.repository?.url || undefined,
        installCmd: safeString(item.installCommand) || undefined,
        icon: safeString(item.iconUrl) || undefined,
        source: 'smithery',
        sourceId: safeString(item.qualifiedName),
        sourceUrl: `https://smithery.ai/skills/${item.qualifiedName}`,
      });
    }

    if (data.servers.length < pageSize || allSkills.length >= limit) {
      hasMore = false;
    }
    offset += pageSize;
  }

  console.log(`[SkillsAdapter:smithery] 获取 ${allSkills.length} 条 Skills 数据`);
  return allSkills.slice(0, limit);
}

// ==================== skills.sh 适配器 ====================

interface SkillsShResponse {
  data: SkillsShItem[];
  meta: {
    total: number;
    page: number;
    per_page: number;
  };
}

interface SkillsShItem {
  id: string;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  topics: string[];
  created_at: string;
  updated_at: string;
  owner: {
    login: string;
    html_url: string;
  };
}

export async function fetchFromSkillsSh(options: {
  limit?: number;
  timeout?: number;
  retryCount?: number;
}): Promise<StandardizedSkill[]> {
  const { limit = 500, timeout = 30000, retryCount = 3 } = options;

  console.log('[SkillsAdapter:skills_sh] 开始获取 skills.sh 数据...');

  const allSkills: StandardizedSkill[] = [];
  let page = 1;
  const pageSize = 50;
  let hasMore = true;

  while (hasMore && allSkills.length < limit) {
    const url = `https://skills.sh/api/v1/skills?page=${page}&per_page=${pageSize}`;

    const data = await withRetry(async () => {
      return safeFetch<SkillsShResponse>(url, { timeout });
    }, retryCount);

    if (!data.data || data.data.length === 0) {
      hasMore = false;
      break;
    }

    for (const item of data.data) {
      allSkills.push({
        name: safeString(item.full_name || item.name),
        displayName: safeString(item.name),
        description: truncate(safeString(item.description), 2000),
        author: item.owner?.login || undefined,
        authorUrl: item.owner?.html_url || undefined,
        version: undefined,
        category: item.language || undefined,
        tags: Array.isArray(item.topics) ? item.topics.filter(Boolean) : [],
        protocol: 'anthropic',
        mcpServers: [],
        downloads: safeNumber(item.forks_count),
        stars: safeNumber(item.stargazers_count),
        readmeUrl: safeString(item.html_url) || undefined,
        source: 'skills_sh',
        sourceId: safeString(item.id || item.full_name),
        sourceUrl: safeString(item.html_url) || `https://skills.sh/skills/${item.full_name}`,
      });
    }

    if (data.data.length < pageSize || allSkills.length >= limit) {
      hasMore = false;
    }
    page++;
  }

  console.log(`[SkillsAdapter:skills_sh] 获取 ${allSkills.length} 条 Skills 数据`);
  return allSkills.slice(0, limit);
}
