/**
 * Arena AI Leaderboard 类型定义
 * 数据来源: api.wulong.dev/arena-ai-leaderboards/v1
 * 所有字段均为 optional，防止 API 变更导致 break
 */

export interface ArenaLeaderboardEntry {
  rank?: number;           // 排名
  model?: string;          // 模型名称
  vendor?: string;         // 厂商
  license?: string;        // 许可证类型: "open", "proprietary", "semi"
  score?: number;          // Elo 评分
  ci_lower?: number;       // 置信区间下限
  ci_upper?: number;       // 置信区间上限
  votes?: number;          // 投票数
}

export interface ArenaLeaderboardResponse {
  leaderboard?: ArenaLeaderboardEntry[];
  updated_at?: string;
}

// 内部使用的标准化评分结构
export interface StandardizedScore {
  modelName?: string;
  vendor?: string;
  actualScore?: number;      // Elo 分数
  ciLower?: number;          // 置信区间下限
  ciUpper?: number;          // 置信区间上限
  votes?: number;            // 投票数
  isOpenSource?: boolean;    // 是否开源
  rawData?: ArenaLeaderboardEntry;
}
