/**
 * 工具同步核心类型定义 (Skills / MCP / Agent)
 * 复用模型同步架构思想，简化为直接 upsert 模式
 */

// 工具同步配置
export interface ToolSyncConfig {
  dryRun?: boolean;
  sources?: string[];           // 数据源列表
  limit?: number;               // 限制处理数量
  timeout?: number;             // API 请求超时(ms)
  retryCount?: number;          // 重试次数
  entityType: 'skill' | 'mcp' | 'agent';  // 实体类型
}

// 工具同步阶段
export interface ToolSyncPhase {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  stats?: {
    fetched: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  errors?: string[];
}

// 工具同步结果
export interface ToolSyncResult {
  success: boolean;
  entityType: string;
  phases: ToolSyncPhase[];
  stats: {
    totalFetched: number;
    totalCreated: number;
    totalUpdated: number;
    totalSkipped: number;
    totalFailed: number;
    duration: number;
  };
  errors: string[];
  startedAt: Date;
  completedAt: Date;
}

// 标准化 Skill 数据
export interface StandardizedSkill {
  name: string;
  nameCn?: string;
  displayName: string;
  description: string;
  author?: string;
  authorUrl?: string;
  version?: string;
  category?: string;
  tags: string[];
  protocol: string;
  mcpServers: string[];
  downloads: number;
  stars: number;
  rating?: number;
  readmeUrl?: string;
  installCmd?: string;
  icon?: string;
  source: string;
  sourceId: string;
  sourceUrl: string;
}

// 标准化 MCP Server 数据
export interface StandardizedMCP {
  name: string;
  nameCn?: string;
  displayName: string;
  description: string;
  author?: string;
  authorUrl?: string;
  version?: string;
  category?: string;
  tags: string[];
  protocolType: string;
  command?: string;
  args?: string;
  env?: Record<string, string>;
  npmPackage?: string;
  homepage?: string;
  repository?: string;
  downloads: number;
  stars: number;
  rating?: number;
  icon?: string;
  source: string;
  sourceId: string;
  sourceUrl: string;
}

// 标准化 Agent 数据
export interface StandardizedAgent {
  name: string;
  nameCn?: string;
  displayName: string;
  description: string;
  author?: string;
  authorUrl?: string;
  version?: string;
  category?: string;
  tags: string[];
  capabilities: string[];
  modelSupport: string[];
  pricing?: Record<string, any>;
  activeUsers: number;
  taskCompleteRate?: number;
  avgRating?: number;
  icon?: string;
  website?: string;
  source: string;
  sourceId: string;
  sourceUrl: string;
}

// 数据源优先级映射
export const SOURCE_PRIORITY: Record<string, Record<string, number>> = {
  skill: {
    skillsmp: 1,
    smithery: 2,
    skills_sh: 3,
    manual: 99,
  },
  mcp: {
    smithery: 1,
    glama: 2,
    manual: 99,
  },
  agent: {
    agentindex: 1,
    agents_sh: 2,
    manual: 99,
  },
};
