/**
 * 多平台Skill数据聚合类型
 * 支持 stars = 三个平台相加的算法
 */

// 平台来源枚举
export type PlatformSource = 'skills_sh' | 'skills_hub' | 'openskills' | 'npm' | 'smithery' | 'github';

// 单个平台的数据
export interface PlatformSkillData {
  platform: PlatformSource;
  name: string;
  description?: string;
  author?: string;
  version?: string;
  stars?: number;           // 该平台的stars数
  downloads?: number;       // 该平台的下载量
  rating?: number;          // 该平台的评分
  reviewCount?: number;     // 该平台的评论数
  category?: string;
  tags?: string[];
  sourceUrl?: string;
  icon?: string;
  official?: boolean;
  lastUpdated?: Date;
  rawData?: Record<string, any>; // 原始平台数据
}

// 聚合后的Skill数据
export interface AggregatedSkill {
  // 基础信息（以优先级最高的平台为准）
  name: string;
  displayName: string;
  description: string;
  
  // 聚合统计（各平台相加）
  stars: number;            // = sum(各平台.stars)
  downloads: number;        // = sum(各平台.downloads)
  rating: number;           // = weighted average(各平台.rating)
  reviewCount: number;      // = sum(各平台.reviewCount)
  
  // 平台来源信息
  platforms: PlatformSource[];  // 该Skill在哪些平台有收录
  platformData: Map<PlatformSource, PlatformSkillData>;
  
  // 其他字段（以最佳来源为准）
  author?: string;
  version?: string;
  category?: string;
  tags?: string[];
  icon?: string;
  official?: boolean;
  
  // 同步元数据
  lastSyncedAt: Date;
  syncBatchId?: string;
}

// 平台优先级配置
export const PLATFORM_PRIORITY: Record<PlatformSource, number> = {
  'skills_sh': 100,      // 最高优先级
  'openskills': 90,
  'skills_hub': 80,
  'smithery': 70,
  'github': 60,
  'npm': 50,
};

// 平台权重配置（用于rating加权平均）
export const PLATFORM_RATING_WEIGHT: Record<PlatformSource, number> = {
  'skills_sh': 0.4,
  'openskills': 0.25,
  'skills_hub': 0.2,
  'smithery': 0.1,
  'github': 0.03,
  'npm': 0.02,
};

/**
 * 聚合多个平台的Skill数据
 * stars = 各平台相加
 * rating = 加权平均
 */
export function aggregateSkillData(
  platformDataList: PlatformSkillData[]
): AggregatedSkill {
  if (platformDataList.length === 0) {
    throw new Error('至少需要一条平台数据');
  }

  // 按优先级排序，取最高优先级的作为基础信息来源
  const sortedByPriority = [...platformDataList].sort((a, b) => {
    return (PLATFORM_PRIORITY[b.platform] || 0) - (PLATFORM_PRIORITY[a.platform] || 0);
  });

  const primarySource = sortedByPriority[0];

  // 计算聚合统计
  let totalStars = 0;
  let totalDownloads = 0;
  let totalReviewCount = 0;
  let weightedRatingSum = 0;
  let totalRatingWeight = 0;

  for (const data of platformDataList) {
    // Stars: 直接相加
    if (data.stars && data.stars > 0) {
      totalStars += data.stars;
    }

    // Downloads: 直接相加
    if (data.downloads && data.downloads > 0) {
      totalDownloads += data.downloads;
    }

    // Review Count: 直接相加
    if (data.reviewCount && data.reviewCount > 0) {
      totalReviewCount += data.reviewCount;
    }

    // Rating: 加权平均
    if (data.rating && data.rating > 0) {
      const weight = PLATFORM_RATING_WEIGHT[data.platform] || 0.1;
      weightedRatingSum += data.rating * weight;
      totalRatingWeight += weight;
    }
  }

  // 计算加权平均rating
  const aggregatedRating = totalRatingWeight > 0 
    ? weightedRatingSum / totalRatingWeight 
    : 0;

  // 合并tags（去重）
  const allTags = new Set<string>();
  for (const data of platformDataList) {
    if (data.tags) {
      data.tags.forEach(tag => allTags.add(tag));
    }
  }

  // 构建平台数据Map
  const platformDataMap = new Map<PlatformSource, PlatformSkillData>();
  for (const data of platformDataList) {
    platformDataMap.set(data.platform, data);
  }

  return {
    name: primarySource.name,
    displayName: primarySource.name
      .replace(/^@[^/]+\//, '')
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    description: primarySource.description || '',
    
    // 聚合统计
    stars: totalStars,
    downloads: totalDownloads,
    rating: parseFloat(aggregatedRating.toFixed(2)),
    reviewCount: totalReviewCount,
    
    // 平台信息
    platforms: platformDataList.map(d => d.platform),
    platformData: platformDataMap,
    
    // 其他字段
    author: primarySource.author,
    version: primarySource.version,
    category: primarySource.category,
    tags: Array.from(allTags),
    icon: primarySource.icon,
    official: platformDataList.some(d => d.official),
    
    lastSyncedAt: new Date(),
  };
}

/**
 * 标准化Skill名称（用于跨平台匹配）
 * 例如: @anthropic-ai/skills-pdf → skills-pdf
 */
export function normalizeSkillName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^@[^/]+\//, '')  // 移除npm scope
    .replace(/[^a-z0-9-]/g, '-')  // 非字母数字替换为-
    .replace(/-+/g, '-')  // 多个-合并
    .replace(/^-|-$/g, '');  // 移除首尾-
}

/**
 * 判断两个Skill是否相同（跨平台匹配）
 */
export function isSameSkill(name1: string, name2: string): boolean {
  return normalizeSkillName(name1) === normalizeSkillName(name2);
}
