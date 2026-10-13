/**
 * 平台数据聚合引擎
 * 实现 stars = 三个平台相加的算法
 */

import { 
  PlatformSource, 
  PlatformSkillData, 
  AggregatedSkill, 
  aggregateSkillData,
  normalizeSkillName 
} from '../types/skill-platform.js';
import { Skill } from '../types/skill-full.js';

/**
 * 平台聚合器
 */
export class PlatformAggregator {
  private platformData: Map<string, Map<PlatformSource, PlatformSkillData>> = new Map();

  /**
   * 添加单个平台的数据
   */
  addPlatformData(data: PlatformSkillData): void {
    const normalizedName = normalizeSkillName(data.name);
    
    if (!this.platformData.has(normalizedName)) {
      this.platformData.set(normalizedName, new Map());
    }
    
    const skillPlatforms = this.platformData.get(normalizedName)!;
    skillPlatforms.set(data.platform, data);
  }

  /**
   * 批量添加平台数据
   */
  addBatchPlatformData(platform: PlatformSource, dataList: PlatformSkillData[]): void {
    for (const data of dataList) {
      this.addPlatformData({ ...data, platform });
    }
  }

  /**
   * 获取聚合后的Skill数据
   */
  getAggregatedSkill(name: string): AggregatedSkill | null {
    const normalizedName = normalizeSkillName(name);
    const skillPlatforms = this.platformData.get(normalizedName);
    
    if (!skillPlatforms || skillPlatforms.size === 0) {
      return null;
    }

    const platformDataList = Array.from(skillPlatforms.values());
    return aggregateSkillData(platformDataList);
  }

  /**
   * 获取所有聚合后的Skill
   */
  getAllAggregatedSkills(): AggregatedSkill[] {
    const results: AggregatedSkill[] = [];
    
    for (const [name, platforms] of this.platformData) {
      if (platforms.size > 0) {
        const platformDataList = Array.from(platforms.values());
        results.push(aggregateSkillData(platformDataList));
      }
    }
    
    return results;
  }

  /**
   * 获取指定平台的数据
   */
  getPlatformData(name: string, platform: PlatformSource): PlatformSkillData | null {
    const normalizedName = normalizeSkillName(name);
    const skillPlatforms = this.platformData.get(normalizedName);
    
    if (!skillPlatforms) {
      return null;
    }
    
    return skillPlatforms.get(platform) || null;
  }

  /**
   * 获取Skill在哪些平台有收录
   */
  getSkillPlatforms(name: string): PlatformSource[] {
    const normalizedName = normalizeSkillName(name);
    const skillPlatforms = this.platformData.get(normalizedName);
    
    if (!skillPlatforms) {
      return [];
    }
    
    return Array.from(skillPlatforms.keys());
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalSkills: number;
    platformCounts: Record<PlatformSource, number>;
    multiPlatformSkills: number;
  } {
    const platformCounts: Record<string, number> = {};
    let multiPlatformSkills = 0;

    for (const [name, platforms] of this.platformData) {
      if (platforms.size > 1) {
        multiPlatformSkills++;
      }
      
      for (const platform of platforms.keys()) {
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
      }
    }

    return {
      totalSkills: this.platformData.size,
      platformCounts: platformCounts as Record<PlatformSource, number>,
      multiPlatformSkills,
    };
  }

  /**
   * 清空数据
   */
  clear(): void {
    this.platformData.clear();
  }

  /**
   * 将聚合数据转换为Skill类型（用于数据库同步）
   */
  static toSkill(aggregated: AggregatedSkill): Partial<Skill> {
    // 获取各平台的stars详情
    const platformStars: Record<string, number> = {};
    let totalStars = 0;
    
    for (const [platform, data] of aggregated.platformData) {
      if (data.stars && data.stars > 0) {
        platformStars[platform] = data.stars;
        totalStars += data.stars;
      }
    }

    return {
      name: aggregated.name,
      displayName: aggregated.displayName,
      description: aggregated.description,
      author: aggregated.author,
      version: aggregated.version,
      category: aggregated.category,
      tags: aggregated.tags,
      icon: aggregated.icon,
      
      // 聚合统计
      stars: totalStars,
      downloads: aggregated.downloads,
      rating: aggregated.rating,
      reviewCount: aggregated.reviewCount,
      
      // 平台信息（存储在extJson中）
      extJson: {
        platforms: aggregated.platforms,
        platformStars,
        platformData: Object.fromEntries(
          Array.from(aggregated.platformData.entries()).map(([k, v]) => [
            k, 
            { 
              stars: v.stars, 
              downloads: v.downloads, 
              rating: v.rating,
              sourceUrl: v.sourceUrl 
            }
          ])
        ),
      },
      
      isOfficial: aggregated.official,
      lastUpdated: aggregated.lastSyncedAt,
    };
  }
}

/**
 * 创建平台聚合器实例
 */
export function createPlatformAggregator(): PlatformAggregator {
  return new PlatformAggregator();
}
