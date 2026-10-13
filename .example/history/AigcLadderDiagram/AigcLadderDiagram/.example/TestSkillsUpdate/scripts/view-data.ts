/**
 * 查看同步数据 - 表格形式展示
 */

import { getPool } from '../src/database/connection.js';

async function viewData() {
  const pool = getPool();

  console.log('========================================');
  console.log('Skill 同步数据查看');
  console.log('========================================\n');

  // 1. 总体统计
  console.log('【总体统计】');
  const stats = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT source) as source_count,
      AVG(quality_score)::int as avg_quality,
      MAX(updated_at) as last_sync
    FROM sync.skills
  `);
  const s = stats.rows[0];
  console.log(`  总记录数: ${s.total}`);
  console.log(`  数据源数: ${s.source_count}`);
  console.log(`  平均质量分: ${s.avg_quality}`);
  console.log(`  最后同步: ${s.last_sync}`);

  // 2. 数据源分布
  console.log('\n【数据源分布】');
  const sources = await pool.query(`
    SELECT source, COUNT(*) as count, AVG(quality_score)::int as avg_q
    FROM sync.skills 
    GROUP BY source 
    ORDER BY count DESC
  `);
  sources.rows.forEach((r: any) => {
    console.log(`  ${r.source.padEnd(12)}: ${String(r.count).padStart(5)} 条 (质量分: ${r.avg_q})`);
  });

  // 3. 分类分布
  console.log('\n【分类分布 Top 10】');
  const cats = await pool.query(`
    SELECT category, COUNT(*) as count 
    FROM sync.skills 
    GROUP BY category 
    ORDER BY count DESC 
    LIMIT 10
  `);
  cats.rows.forEach((r: any, i: number) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${r.category.padEnd(20)}: ${r.count} 条`);
  });

  // 4. 高质量 Skill Top 10
  console.log('\n【高质量 Skill Top 10】');
  const topSkills = await pool.query(`
    SELECT 
      skill_key,
      name,
      author,
      quality_score,
      stars,
      download_count,
      version
    FROM sync.skills 
    ORDER BY quality_score DESC, stars DESC 
    LIMIT 10
  `);
  topSkills.rows.forEach((r: any, i: number) => {
    console.log(`\n  ${String(i + 1).padStart(2)}. ${r.name}`);
    console.log(`      作者: ${r.author}`);
    console.log(`      质量分: ${r.quality_score} | Stars: ${r.stars} | 下载: ${r.download_count}`);
    console.log(`      版本: ${r.version}`);
    console.log(`      Key: ${r.skill_key}`);
  });

  // 5. 最新同步的 Skill
  console.log('\n【最新同步的 5 条】');
  const latest = await pool.query(`
    SELECT 
      skill_key,
      name,
      source,
      quality_score,
      created_at
    FROM sync.skills 
    ORDER BY created_at DESC 
    LIMIT 5
  `);
  latest.rows.forEach((r: any, i: number) => {
    console.log(`  ${String(i + 1).padStart(2)}. [${r.source}] ${r.name} (质量: ${r.quality_score})`);
    console.log(`      时间: ${r.created_at}`);
  });

  // 6. 字段示例详情
  console.log('\n【字段示例详情】');
  const sample = await pool.query(`
    SELECT 
      skill_key,
      name,
      display_name,
      description,
      author,
      source,
      source_url,
      stars,
      download_count,
      category,
      tags,
      version,
      install_command,
      npm_package,
      quality_score,
      data_layer,
      multi_source_count,
      created_at,
      updated_at
    FROM sync.skills 
    LIMIT 1
  `);
  const skill = sample.rows[0];
  
  console.log(`\n  Skill Key: ${skill.skill_key}`);
  console.log(`  名称: ${skill.name}`);
  console.log(`  显示名: ${skill.display_name}`);
  console.log(`  描述: ${skill.description ? skill.description.substring(0, 100) + '...' : 'N/A'}`);
  console.log(`  作者: ${skill.author}`);
  console.log(`  数据源: ${skill.source}`);
  console.log(`  源地址: ${skill.source_url}`);
  console.log(`  Stars: ${skill.stars}`);
  console.log(`  下载量: ${skill.download_count}`);
  console.log(`  分类: ${skill.category}`);
  console.log(`  标签: ${skill.tags}`);
  console.log(`  版本: ${skill.version}`);
  console.log(`  安装命令: ${skill.install_command}`);
  console.log(`  NPM包: ${skill.npm_package}`);
  console.log(`  质量分: ${skill.quality_score}`);
  console.log(`  数据层: ${skill.data_layer}`);
  console.log(`  多源计数: ${skill.multi_source_count}`);
  console.log(`  创建时间: ${skill.created_at}`);
  console.log(`  更新时间: ${skill.updated_at}`);

  await pool.end();
  
  console.log('\n========================================');
  console.log('数据查看完成');
  console.log('========================================');
}

viewData().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
