/**
 * Skills最终同步脚本
 * - 只同步Skills
 * - 路径和技能名一致视为同一技能
 * - stars = 三个平台相加
 * - 所有字段对接，空时填写默认值
 */

import { getPool } from '../src/database/connection.js';
import { Skill, createSkillWithDefaults } from '../src/types/skill-full.js';

// 平台来源类型
type PlatformSource = 'skills_sh' | 'skills_hub' | 'openskills' | 'npm' | 'smithery';

// 平台数据接口
interface PlatformSkillData {
  platform: PlatformSource;
  name: string;
  description?: string;
  author?: string;
  version?: string;
  stars?: number;
  downloads?: number;
  rating?: number;
  reviewCount?: number;
  category?: string;
  tags?: string[];
  sourceUrl?: string;
  icon?: string;
  official?: boolean;
  lastUpdated?: Date;
  rawData?: Record<string, any>;
}

// 聚合后的Skill数据
interface AggregatedSkillData {
  name: string;
  displayName: string;
  description: string;
  
  // 聚合统计（各平台相加）
  stars: number;
  downloads: number;
  rating: number;
  reviewCount: number;
  
  // 平台来源信息
  platforms: PlatformSource[];
  platformData: Map<PlatformSource, PlatformSkillData>;
  
  // 其他字段（以最佳来源为准）
  author?: string;
  version?: string;
  category: string;
  tags: string[];
  icon?: string;
  official: boolean;
  
  lastSyncedAt: Date;
}

// 平台优先级
const PLATFORM_PRIORITY: Record<PlatformSource, number> = {
  'skills_sh': 100,
  'openskills': 90,
  'skills_hub': 80,
  'smithery': 70,
  'npm': 50,
};

// 平台权重（用于rating加权平均）
const PLATFORM_RATING_WEIGHT: Record<PlatformSource, number> = {
  'skills_sh': 0.4,
  'openskills': 0.25,
  'skills_hub': 0.2,
  'smithery': 0.1,
  'npm': 0.05,
};

/**
 * 标准化Skill名称（用于跨平台匹配）
 */
function normalizeSkillName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^@[^/]+\//, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * 聚合多个平台的Skill数据
 * stars = 各平台相加
 */
function aggregateSkillData(platformDataList: PlatformSkillData[]): AggregatedSkillData {
  if (platformDataList.length === 0) {
    throw new Error('至少需要一条平台数据');
  }

  // 按优先级排序
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
    if (data.stars && data.stars > 0) {
      totalStars += data.stars;
    }
    if (data.downloads && data.downloads > 0) {
      totalDownloads += data.downloads;
    }
    if (data.reviewCount && data.reviewCount > 0) {
      totalReviewCount += data.reviewCount;
    }
    if (data.rating && data.rating > 0) {
      const weight = PLATFORM_RATING_WEIGHT[data.platform] || 0.1;
      weightedRatingSum += data.rating * weight;
      totalRatingWeight += weight;
    }
  }

  const aggregatedRating = totalRatingWeight > 0 
    ? weightedRatingSum / totalRatingWeight 
    : 0;

  // 合并tags
  const allTags = new Set<string>();
  for (const data of platformDataList) {
    if (data.tags) {
      data.tags.forEach(tag => allTags.add(tag));
    }
  }

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
    
    stars: totalStars,
    downloads: totalDownloads,
    rating: parseFloat(aggregatedRating.toFixed(2)),
    reviewCount: totalReviewCount,
    
    platforms: platformDataList.map(d => d.platform),
    platformData: platformDataMap,
    
    author: primarySource.author,
    version: primarySource.version,
    category: primarySource.category || 'general',
    tags: Array.from(allTags).length > 0 ? Array.from(allTags) : ['skill'],
    icon: primarySource.icon,
    official: platformDataList.some(d => d.official),
    
    lastSyncedAt: new Date(),
  };
}

/**
 * 模拟从各平台获取Skills数据
 */
async function fetchSkillsFromPlatforms(): Promise<PlatformSkillData[]> {
  const allData: PlatformSkillData[] = [];

  // 模拟 skills.sh 数据
  const skillsShData: PlatformSkillData[] = [
    {
      platform: 'skills_sh',
      name: 'pdf',
      description: 'Comprehensive PDF toolkit for document processing',
      author: 'anthropics',
      version: '1.2.3',
      stars: 214100, // 214.1K
      downloads: 500000,
      rating: 4.8,
      reviewCount: 1200,
      category: 'document',
      tags: ['pdf', 'document', 'office'],
      sourceUrl: 'https://github.com/anthropics/skills/tree/main/pdf',
      official: true,
    },
    {
      platform: 'skills_sh',
      name: 'web-search',
      description: 'Web search and browsing capabilities',
      author: 'vercel-labs',
      version: '2.1.0',
      stars: 731200, // 731.2K
      downloads: 1200000,
      rating: 4.9,
      reviewCount: 3500,
      category: 'search',
      tags: ['search', 'web', 'browser'],
      sourceUrl: 'https://github.com/vercel-labs/skills',
      official: false,
    },
    {
      platform: 'skills_sh',
      name: 'react-best-practices',
      description: 'React development best practices and patterns',
      author: 'vercel-labs',
      version: '1.5.0',
      stars: 229800, // 229.8K
      downloads: 450000,
      rating: 4.7,
      reviewCount: 890,
      category: 'code',
      tags: ['react', 'javascript', 'frontend'],
      sourceUrl: 'https://github.com/vercel-labs/agent-skills',
      official: false,
    },
  ];

  // 模拟 skills-hub 数据（部分与skills.sh重叠）
  const skillsHubData: PlatformSkillData[] = [
    {
      platform: 'skills_hub',
      name: 'pdf',
      description: 'PDF processing toolkit',
      author: 'anthropics',
      version: '1.2.3',
      stars: 15000, // 15K from skills-hub
      downloads: 80000,
      rating: 4.6,
      reviewCount: 300,
      category: 'document',
      tags: ['pdf', 'document'],
      sourceUrl: 'https://github.com/anthropics/skills',
      official: true,
    },
    {
      platform: 'skills_hub',
      name: 'github-manager',
      description: 'GitHub repository management tools',
      author: 'github',
      version: '3.0.1',
      stars: 45000,
      downloads: 200000,
      rating: 4.5,
      reviewCount: 600,
      category: 'code',
      tags: ['github', 'git', 'devops'],
      sourceUrl: 'https://github.com/github/skills',
      official: true,
    },
  ];

  // 模拟 openskills 数据
  const openskillsData: PlatformSkillData[] = [
    {
      platform: 'openskills',
      name: 'pdf',
      description: 'PDF toolkit for AI agents',
      author: 'anthropics',
      version: '1.2.3',
      stars: 8500,
      downloads: 45000,
      rating: 4.7,
      reviewCount: 180,
      category: 'document',
      tags: ['pdf', 'ai', 'agent'],
      sourceUrl: 'https://github.com/anthropics/skills',
      official: true,
    },
    {
      platform: 'openskills',
      name: 'code-reviewer',
      description: 'AI-powered code review assistant',
      author: 'openai',
      version: '2.0.0',
      stars: 32000,
      downloads: 150000,
      rating: 4.4,
      reviewCount: 420,
      category: 'code',
      tags: ['code-review', 'ai', 'development'],
      sourceUrl: 'https://github.com/openai/skills',
      official: true,
    },
  ];

  allData.push(...skillsShData, ...skillsHubData, ...openskillsData);
  
  return allData;
}

/**
 * 按Skill名称分组聚合
 */
function groupSkillsByName(dataList: PlatformSkillData[]): Map<string, PlatformSkillData[]> {
  const groups = new Map<string, PlatformSkillData[]>();
  
  for (const data of dataList) {
    const normalizedName = normalizeSkillName(data.name);
    
    if (!groups.has(normalizedName)) {
      groups.set(normalizedName, []);
    }
    
    groups.get(normalizedName)!.push(data);
  }
  
  return groups;
}

/**
 * 将聚合数据转换为完整Skill对象
 */
function toFullSkill(aggregated: AggregatedSkillData, batchId: string): Skill {
  // 获取各平台的stars详情
  const platformStars: Record<string, number> = {};
  for (const [platform, data] of aggregated.platformData) {
    if (data.stars && data.stars > 0) {
      platformStars[platform] = data.stars;
    }
  }

  // 构建extJson
  const extJson = {
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
  };

  // 使用createSkillWithDefaults确保所有字段都有值
  return createSkillWithDefaults({
    name: aggregated.name,
    displayName: aggregated.displayName,
    description: aggregated.description,
    author: aggregated.author,
    version: aggregated.version,
    category: aggregated.category,
    tags: aggregated.tags,
    icon: aggregated.icon,
    
    // 聚合统计
    stars: aggregated.stars,
    downloads: aggregated.downloads,
    rating: aggregated.rating,
    reviewCount: aggregated.reviewCount,
    
    // 平台信息
    syncSource: 'multi-platform',
    syncBatchId: batchId,
    syncMetadata: extJson,
    
    // 状态
    isOfficial: aggregated.official,
    isActive: true,
    auditStatus: 'pending',
    
    // 时间戳
    lastUpdated: aggregated.lastSyncedAt,
  });
}

/**
 * 保存Skill到数据库
 */
async function saveSkillToDB(pool: any, skill: Skill, batchId: string): Promise<void> {
  // 构建插入数据
  const dbRow: Record<string, any> = {
    name: skill.name,
    display_name: skill.displayName,
    description: skill.description,
    skill_type: skill.skillType || 'utility',
    category: skill.category || 'general',
    tags: JSON.stringify(skill.tags || []),
    
    author: skill.author || null,
    version: skill.version || null,
    license: skill.license || null,
    
    protocol: skill.protocol || 'anthropic',
    supported_ides: JSON.stringify(skill.supportedIdes || ['vscode']),
    programming_languages: JSON.stringify(skill.programmingLanguages || ['javascript']),
    frameworks: JSON.stringify(skill.frameworks || []),
    install_cmd: skill.installCmd || `npm install ${skill.name}`,
    
    homepage: skill.homepage || null,
    repository: skill.repository || null,
    documentation: skill.documentation || null,
    icon: skill.icon || '🔧',
    
    stars: skill.stars || 0,
    downloads: skill.downloads || 0,
    rating: skill.rating || 0,
    review_count: skill.reviewCount || 0,
    
    is_verified: skill.isVerified || false,
    is_featured: skill.isFeatured || false,
    is_recommended: skill.isRecommended || false,
    is_active: skill.isActive !== false,
    
    sync_source: skill.syncSource || 'manual',
    sync_batch_id: batchId,
    sync_metadata: skill.syncMetadata ? JSON.stringify(skill.syncMetadata) : null,
    
    last_updated: skill.lastUpdated || new Date(),
  };

  // 处理JSON字段
  const processedRow: Record<string, any> = {};
  for (const [key, value] of Object.entries(dbRow)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        processedRow[key] = JSON.stringify(value);
      } else {
        processedRow[key] = value;
      }
    } else {
      processedRow[key] = null;
    }
  }

  const columns = Object.keys(processedRow);
  const values = Object.values(processedRow);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

  const query = `
    INSERT INTO sync.skills (${columns.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT (name) DO UPDATE SET
    ${columns.map(c => `${c} = EXCLUDED.${c}`).join(', ')},
    updated_at = NOW()
  `;

  await pool.query(query, values);
}

/**
 * 主同步函数
 */
async function sync() {
  console.log('========================================');
  console.log('Skills最终同步 - 多平台聚合');
  console.log('算法: stars = 三个平台相加');
  console.log('========================================\n');

  const pool = getPool();
  const batchId = `batch_${Date.now()}`;

  try {
    // 1. 从各平台获取数据
    console.log('【1/4】从各平台获取Skills数据...');
    const platformData = await fetchSkillsFromPlatforms();
    console.log(`  获取到 ${platformData.length} 条平台数据`);

    // 2. 按Skill名称分组
    console.log('\n【2/4】按Skill名称分组...');
    const skillGroups = groupSkillsByName(platformData);
    console.log(`  识别到 ${skillGroups.size} 个唯一Skills`);

    // 3. 聚合各平台数据
    console.log('\n【3/4】聚合各平台数据...');
    const aggregatedSkills: AggregatedSkillData[] = [];
    
    for (const [normalizedName, platformDataList] of skillGroups) {
      try {
        const aggregated = aggregateSkillData(platformDataList);
        aggregatedSkills.push(aggregated);
        
        // 显示聚合详情
        const platformInfo = platformDataList.map(p => 
          `${p.platform}(${p.stars || 0}⭐)`
        ).join(' + ');
        
        console.log(`  ✓ ${aggregated.name.padEnd(20)} | ${platformInfo} = ${aggregated.stars}⭐`);
      } catch (error) {
        console.error(`  ✗ ${normalizedName}:`, (error as Error).message);
      }
    }

    // 4. 保存到数据库
    console.log('\n【4/4】保存到数据库...');
    let successCount = 0;
    let errorCount = 0;

    for (const aggregated of aggregatedSkills) {
      try {
        const skill = toFullSkill(aggregated, batchId);
        await saveSkillToDB(pool, skill, batchId);
        successCount++;
        console.log(`  ✓ ${skill.name}`);
      } catch (error) {
        errorCount++;
        console.error(`  ✗ ${aggregated.name}:`, (error as Error).message);
      }
    }

    // 5. 输出统计
    console.log('\n========================================');
    console.log('同步完成！');
    console.log('========================================');
    console.log(`批次ID: ${batchId}`);
    console.log(`成功: ${successCount}`);
    console.log(`失败: ${errorCount}`);
    console.log(`总计: ${aggregatedSkills.length}`);

    // 6. 显示聚合示例
    console.log('\n【聚合示例】');
    const pdfSkill = aggregatedSkills.find(s => s.name === 'pdf');
    if (pdfSkill) {
      console.log(`\nSkill: ${pdfSkill.name}`);
      console.log(`显示名: ${pdfSkill.displayName}`);
      console.log(`描述: ${pdfSkill.description}`);
      console.log(`分类: ${pdfSkill.category}`);
      console.log(`标签: ${pdfSkill.tags.join(', ')}`);
      console.log(`作者: ${pdfSkill.author}`);
      console.log(`\n平台分布:`);
      for (const [platform, data] of pdfSkill.platformData) {
        console.log(`  - ${platform}: ${data.stars}⭐, ${data.downloads}↓, ${data.rating}★`);
      }
      console.log(`\n聚合结果:`);
      console.log(`  总Stars: ${pdfSkill.stars}`);
      console.log(`  总Downloads: ${pdfSkill.downloads}`);
      console.log(`  加权Rating: ${pdfSkill.rating}`);
      console.log(`  总ReviewCount: ${pdfSkill.reviewCount}`);
      console.log(`  官方认证: ${pdfSkill.official}`);
    }

  } finally {
    await pool.end();
  }
}

// 执行同步
sync().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
