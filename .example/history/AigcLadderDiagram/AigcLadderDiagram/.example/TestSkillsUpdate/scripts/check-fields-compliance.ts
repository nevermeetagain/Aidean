/**
 * 检查同步脚本字段是否符合字段.md要求
 */

import { getPool } from '../src/database/connection.js';

// 字段.md中要求的Skills工具核心字段
const requiredFields = {
  // 核心信息
  core: [
    'id', 'name', 'nameCn', 'displayName', 'description', 'shortDesc',
    'category', 'subCategory', 'tags'
  ],
  // 作者与来源
  author: [
    'author', 'authorUrl', 'version', 'license', 'sourceType',
    'isOfficial', 'isPartner'
  ],
  // 技术配置
  technical: [
    'protocol', 'mcpServers', 'integrationPlatforms', 'supportedIdes',
    'programmingLanguages', 'frameworks', 'dependencies', 'configSchema',
    'installCmd', 'uninstallCmd', 'updateCmd'
  ],
  // 功能与I/O
  function: [
    'inputTypes', 'outputTypes', 'skillOutputs', 'triggerMethods',
    'usageExamples', 'templates', 'shortcuts'
  ],
  // 学习路径
  learning: [
    'prerequisites', 'learningPath', 'estimatedTime',
    'certificationAvailable', 'certificationInfo', 'relatedSkills', 'nextSteps'
  ],
  // 链接与资源
  links: [
    'homepage', 'repository', 'documentation', 'readmeUrl', 'tutorialUrl',
    'demoVideo', 'changelog', 'icon', 'screenshots'
  ],
  // 统计
  stats: [
    'downloads', 'installs', 'stars', 'rating', 'reviewCount',
    'ratingBreakdown', 'activeUsers', 'usageCount', 'completionRate', 'usageTrend'
  ],
  // 审核与状态
  audit: [
    'isVerified', 'auditStatus', 'auditBy', 'auditAt', 'auditReason',
    'isFeatured', 'isRecommended', 'recommendStartAt', 'recommendEndAt',
    'promotionBadge', 'isActive', 'visibility'
  ],
  // 运营
  ops: [
    'displayWeight', 'sortOrder', 'adminNote', 'pricingType', 'pricingInfo',
    'trialEnabled', 'trialConfig'
  ],
  // 同步
  sync: [
    'syncStatus', 'syncSource', 'syncBatchId', 'syncMetadata',
    'dataQualityScore', 'completenessRate', 'lastVerifiedAt'
  ],
  // 时间戳
  timestamps: [
    'lastUpdated', 'publishedAt', 'deprecatedAt', 'createdAt', 'updatedAt'
  ],
  // 扩展
  ext: [
    'extJson', 'attr01', 'attr02', 'attr03', 'attr04', 'attr05', 'tenantId'
  ]
};

async function checkCompliance() {
  const pool = getPool();

  console.log('========================================');
  console.log('Skills同步脚本字段合规性检查');
  console.log('========================================\n');

  // 1. 获取当前数据库表结构
  const dbFields = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'sync' AND table_name = 'skills'
    ORDER BY ordinal_position
  `);

  const currentFields = dbFields.rows.map((r: any) => r.column_name);
  
  console.log('【当前数据库字段】');
  console.log(`总计: ${currentFields.length} 个字段\n`);

  // 2. 对比检查
  console.log('【字段合规性对比】\n');
  
  let totalRequired = 0;
  let totalMissing = 0;
  let totalMatched = 0;

  for (const [category, fields] of Object.entries(requiredFields)) {
    console.log(`--- ${category.toUpperCase()} ---`);
    
    const matched: string[] = [];
    const missing: string[] = [];
    const partial: string[] = [];

    for (const field of fields) {
      totalRequired++;
      
      // 检查完全匹配
      if (currentFields.includes(field)) {
        matched.push(field);
        totalMatched++;
      }
      // 检查可能的变体（如驼峰转下划线）
      else if (currentFields.includes(field.replace(/([A-Z])/g, '_$1').toLowerCase())) {
        partial.push(`${field} → ${field.replace(/([A-Z])/g, '_$1').toLowerCase()}`);
        totalMatched++;
      }
      // 检查相似字段
      else {
        const similar = currentFields.find((f: string) => 
          f.toLowerCase().includes(field.toLowerCase()) || 
          field.toLowerCase().includes(f.toLowerCase())
        );
        if (similar) {
          partial.push(`${field} ≈ ${similar}`);
        } else {
          missing.push(field);
          totalMissing++;
        }
      }
    }

    if (matched.length > 0) {
      console.log(`  ✅ 已匹配 (${matched.length}): ${matched.join(', ')}`);
    }
    if (partial.length > 0) {
      console.log(`  ⚠️  部分匹配 (${partial.length}):`);
      partial.forEach(p => console.log(`     ${p}`));
    }
    if (missing.length > 0) {
      console.log(`  ❌ 缺失 (${missing.length}): ${missing.join(', ')}`);
    }
    console.log('');
  }

  // 3. 统计
  console.log('【统计汇总】');
  console.log(`  要求字段总数: ${totalRequired}`);
  console.log(`  已匹配: ${totalMatched} (${((totalMatched/totalRequired)*100).toFixed(1)}%)`);
  console.log(`  缺失: ${totalMissing} (${((totalMissing/totalRequired)*100).toFixed(1)}%)`);

  // 4. 当前表实际字段详情
  console.log('\n【当前表实际字段详情】');
  dbFields.rows.forEach((r: any, i: number) => {
    const nullable = r.is_nullable === 'YES' ? '?' : '';
    console.log(`  ${String(i + 1).padStart(2)}. ${r.column_name}${nullable}: ${r.data_type}`);
  });

  // 5. 建议
  console.log('\n【改进建议】');
  if (totalMissing > 0) {
    console.log('  1. 添加缺失的核心字段');
    console.log('  2. 更新适配器以获取更多信息');
    console.log('  3. 考虑字段映射关系（如下划线vs驼峰）');
  }

  await pool.end();
  
  console.log('\n========================================');
  console.log('检查完成');
  console.log('========================================');
}

checkCompliance().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
