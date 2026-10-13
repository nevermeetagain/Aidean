/**
 * 资源中心相关常量
 */

// 资源类型
export const RESOURCE_TYPES = [
  { value: "skill", label: "Skill", icon: "Zap", description: "技能组件" },
  { value: "mcp", label: "MCP", icon: "Server", description: "MCP服务器" },
  { value: "agent", label: "Agent", icon: "Bot", description: "智能体" },
  { value: "news", label: "AI资讯", icon: "Newspaper", description: "最新AI动态" },
  { value: "scenario", label: "场景方案", icon: "Briefcase", description: "应用方案" },
] as const;

// Skill分类
export const SKILL_CATEGORIES = [
  { value: "productivity", label: "生产力", icon: "Briefcase" },
  { value: "development", label: "开发工具", icon: "Code" },
  { value: "data", label: "数据处理", icon: "Database" },
  { value: "media", label: "媒体处理", icon: "Image" },
  { value: "communication", label: "通讯协作", icon: "MessageSquare" },
  { value: "automation", label: "自动化", icon: "Workflow" },
] as const;

// MCP协议类型
export const MCP_PROTOCOLS = [
  { value: "stdio", label: "Standard IO", description: "标准输入输出" },
  { value: "sse", label: "SSE", description: "Server-Sent Events" },
  { value: "websocket", label: "WebSocket", description: "双向通信" },
  { value: "http", label: "HTTP", description: "HTTP REST API" },
] as const;

// Agent类型
export const AGENT_TYPES = [
  { value: "chat", label: "对话助手", icon: "MessageCircle" },
  { value: "coding", label: "编程助手", icon: "Code2" },
  { value: "research", label: "研究助手", icon: "Search" },
  { value: "creative", label: "创意助手", icon: "Sparkles" },
  { value: "analysis", label: "分析助手", icon: "BarChart3" },
] as const;

// 新闻分类
export const NEWS_CATEGORIES = [
  { value: "industry", label: "行业动态", color: "blue" },
  { value: "product", label: "产品发布", color: "green" },
  { value: "research", label: "研究成果", color: "purple" },
  { value: "policy", label: "政策法规", color: "orange" },
  { value: "event", label: "活动会议", color: "pink" },
  { value: "tutorial", label: "教程指南", color: "teal" },
] as const;

// 资源状态
export const RESOURCE_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  INACTIVE: "inactive",
  DEPRECATED: "deprecated",
} as const;

// 排序选项
export const RESOURCE_SORT_OPTIONS = [
  { value: "newest", label: "最新发布" },
  { value: "popular", label: "最受欢迎" },
  { value: "name", label: "名称" },
  { value: "rating", label: "评分" },
] as const;
