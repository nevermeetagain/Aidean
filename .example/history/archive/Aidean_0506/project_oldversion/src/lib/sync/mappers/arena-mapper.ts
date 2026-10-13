/**
 * Arena Leaderboard 数据映射器
 * 将 Arena API 数据转换为本地评分结构
 */

import type { ArenaLeaderboardEntry, StandardizedScore } from '../types/arena';

/**
 * 判断模型是否开源
 */
function isOpenSource(license?: string): boolean {
  if (!license) {
    return false;
  }
  
  const openLicenses = ['open', 'apache', 'mit', 'bsd', 'gpl'];
  const licenseLower = license.toLowerCase();
  
  return openLicenses.some(l => licenseLower.includes(l));
}

/**
 * 将 ArenaLeaderboardEntry 映射为标准评分
 */
export function mapToStandardizedScore(entry: ArenaLeaderboardEntry): StandardizedScore {
  return {
    modelName: entry.model || '',
    vendor: entry.vendor || '',
    actualScore: entry.score || 0,
    ciLower: entry.ci_lower || 0,
    ciUpper: entry.ci_upper || 0,
    votes: entry.votes || 0,
    isOpenSource: isOpenSource(entry.license),
    rawData: entry,
  };
}

/**
 * 批量映射
 */
export function mapToStandardizedScores(entries: ArenaLeaderboardEntry[]): StandardizedScore[] {
  return entries.map(mapToStandardizedScore);
}

/**
 * 根据模型名称查找评分
 */
export function findScoreByModelName(
  scores: StandardizedScore[], 
  modelName: string
): StandardizedScore | undefined {
  // 精确匹配
  const exactMatch = scores.find(s => 
    s.modelName?.toLowerCase() === modelName.toLowerCase()
  );
  if (exactMatch) {
    return exactMatch;
  }
  
  // 包含匹配
  const containsMatch = scores.find(s => {
    const name = s.modelName?.toLowerCase() || '';
    const search = modelName.toLowerCase();
    return name.includes(search) || search.includes(name);
  });
  
  return containsMatch;
}

/**
 * 合并模型数据和评分数据
 */
export function mergeModelWithScore(
  modelData: Record<string, any>,
  score?: StandardizedScore
): Record<string, any> {
  if (!score) {
    return modelData;
  }
  
  return {
    ...modelData,
    arenaScore: score.actualScore,
    arenaCiLower: score.ciLower,
    arenaCiUpper: score.ciUpper,
    arenaVotes: score.votes,
    arenaRank: score.rawData?.rank,
  };
}
