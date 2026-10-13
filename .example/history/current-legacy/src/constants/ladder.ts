/**
 * 天梯图相关常量
 */

// 天梯图类型
export const LADDER_TYPES = [
  { 
    id: "performance", 
    label: "性能天梯图", 
    icon: "Trophy",
    description: "综合性能评分排名",
    defaultSort: "overallScore"
  },
  { 
    id: "price", 
    label: "性价比天梯图", 
    icon: "Coins",
    description: "单位价格性能比",
    defaultSort: "valueScore"
  },
  { 
    id: "opensource", 
    label: "开源天梯图", 
    icon: "GitBranch",
    description: "开源模型专项排名",
    defaultSort: "openSourceScore"
  },
  { 
    id: "mobile", 
    label: "移动端天梯图", 
    icon: "Smartphone",
    description: "移动设备适配模型",
    defaultSort: "mobileScore"
  },
  { 
    id: "vision", 
    label: "视觉天梯图", 
    icon: "Eye",
    description: "多模态视觉能力",
    defaultSort: "visionScore"
  },
  { 
    id: "coding", 
    label: "编程天梯图", 
    icon: "Code2",
    description: "代码生成能力",
    defaultSort: "codingScore"
  },
] as const;

// 排序选项
export const LADDER_SORT_OPTIONS = [
  { value: "overallScore", label: "综合评分", order: "desc" },
  { value: "priceAsc", label: "价格: 低到高", order: "asc" },
  { value: "priceDesc", label: "价格: 高到低", order: "desc" },
  { value: "newest", label: "最新发布", order: "desc" },
  { value: "name", label: "名称", order: "asc" },
  { value: "popularity", label: "热度", order: "desc" },
] as const;

// 评分维度
export const SCORE_DIMENSIONS = [
  { key: "overall", label: "综合评分", weight: 1, color: "#3B82F6" },
  { key: "capability", label: "能力评分", weight: 0.25, color: "#10B981" },
  { key: "speed", label: "速度评分", weight: 0.2, color: "#F59E0B" },
  { key: "price", label: "价格评分", weight: 0.2, color: "#EF4444" },
  { key: "stability", label: "稳定性评分", weight: 0.15, color: "#8B5CF6" },
  { key: "ecosystem", label: "生态评分", weight: 0.1, color: "#EC4899" },
  { key: "innovation", label: "创新评分", weight: 0.1, color: "#06B6D4" },
] as const;

// 评分等级
export const SCORE_LEVELS = [
  { min: 90, label: "S+", color: "#FFD700", bgColor: "bg-yellow-400" },
  { min: 85, label: "S", color: "#C0C0C0", bgColor: "bg-gray-300" },
  { min: 80, label: "A+", color: "#22C55E", bgColor: "bg-green-500" },
  { min: 75, label: "A", color: "#3B82F6", bgColor: "bg-blue-500" },
  { min: 70, label: "B+", color: "#6366F1", bgColor: "bg-indigo-500" },
  { min: 65, label: "B", color: "#8B5CF6", bgColor: "bg-purple-500" },
  { min: 60, label: "C+", color: "#F59E0B", bgColor: "bg-amber-500" },
  { min: 0, label: "C", color: "#EF4444", bgColor: "bg-red-500" },
] as const;

// 表格缩放级别
export const TABLE_ZOOM_LEVELS = [
  { value: 0, label: "0%", scale: 0.5, minWidth: "40px" },
  { value: 25, label: "25%", scale: 0.65, minWidth: "52px" },
  { value: 50, label: "50%", scale: 0.8, minWidth: "64px" },
  { value: 75, label: "75%", scale: 0.9, minWidth: "72px" },
  { value: 100, label: "100%", scale: 1, minWidth: "80px" },
] as const;

// 视图模式
export const VIEW_MODES = [
  { value: "table", label: "表格视图", icon: "Table" },
  { value: "chart", label: "图表视图", icon: "BarChart3" },
] as const;

// 专业版/应用版筛选差异
export const FILTER_VERSIONS = {
  professional: [
    { key: "modelType", label: "模型类型", type: "multi-select" },
    { key: "protocol", label: "API协议", type: "multi-select" },
    { key: "isOpenSource", label: "开源/闭源", type: "toggle" },
    { key: "benchmark", label: "测评集", type: "select" },
    { key: "vendor", label: "厂商", type: "multi-select" },
    { key: "tags", label: "标签", type: "multi-select" },
    { key: "dateRange", label: "发布时间", type: "date-range" },
  ],
  application: [
    { key: "scenario", label: "应用场景", type: "cascader" },
    { key: "difficulty", label: "使用难度", type: "select" },
    { key: "costRange", label: "价格区间", type: "range" },
    { key: "features", label: "功能特性", type: "multi-select" },
  ],
} as const;
