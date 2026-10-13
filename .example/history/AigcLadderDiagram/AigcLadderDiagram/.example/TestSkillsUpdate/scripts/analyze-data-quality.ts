/**
 * 分析数据质量 - 检查字段填充情况
 */

import { getPool } from '../src/database/connection.js';

async function analyze() {
  const pool = getPool();

  console.log('========================================');
  console.log('数据质量分析报告');
  console.log('========================================\n');

  // 1. 各字段填充率统计
  console.log('【字段填充率统计】');
  const fields = [
    'name', 'description', 'author', 'stars', 'download_count',
    'category', 'tags', 'version', 'install_command', 'npm_package'
  ];

  for (const field of fields) {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN ${field} IS NOT NULL AND ${field}::text != '' AND ${field}::text != '0' AND ${field}::text != '[]' THEN 1 END) as filled,
        COUNT(CASE WHEN ${field} IS NULL OR ${field}::text = '' OR ${field}::text = '0' OR ${field}::text = '[]' THEN 1 END) as empty
      FROM sync.skills
    `);
    const r = result.rows[0];
    const rate = ((r.filled / r.total) * 100).toFixed(1);
    console.log(`  ${field.padEnd(20)}: ${String(r.filled).padStart(4)}/${r.total} (${rate}%)`);
  }

  // 2. Stars 分布
  console.log('\n【Stars 分布】');
  const starsDist = await pool.query(`
    SELECT 
      CASE 
        WHEN stars = 0 THEN '0'
        WHEN stars < 10 THEN '1-9'
        WHEN stars < 100 THEN '10-99'
        WHEN stars < 1000 THEN '100-999'
        ELSE '1000+'
      END as range,
      COUNT(*) as count
    FROM sync.skills
    GROUP BY 1
    ORDER BY 1
  `);
  starsDist.rows.forEach((r: any) => {
    console.log(`  ${r.range.padStart(6)} stars: ${r.count} 条`);
  });

  // 3. Download 分布
  console.log('\n【Download 分布】');
  const dlDist = await pool.query(`
    SELECT 
      CASE 
        WHEN download_count = 0 THEN '0'
        WHEN download_count < 100 THEN '1-99'
        WHEN download_count < 1000 THEN '100-999'
        WHEN download_count < 10000 THEN '1K-9.9K'
        ELSE '10K+'
      END as range,
      COUNT(*) as count
    FROM sync.skills
    GROUP BY 1
    ORDER BY 1
  `);
  dlDist.rows.forEach((r: any) => {
    console.log(`  ${r.range.padStart(8)} downloads: ${r.count} 条`);
  });

  // 4. Category 分布
  console.log('\n【Category 分布】');
  const catDist = await pool.query(`
    SELECT category, COUNT(*) as count
    FROM sync.skills
    GROUP BY category
    ORDER BY count DESC
    LIMIT 10
  `);
  catDist.rows.forEach((r: any, i: number) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${r.category.padEnd(20)}: ${r.count} 条`);
  });

  // 5. 有实际数据的样本
  console.log('\n【有 Stars 的数据示例】');
  const withStars = await pool.query(`
    SELECT name, source, stars, download_count, category
    FROM sync.skills
    WHERE stars > 0
    ORDER BY stars DESC
    LIMIT 5
  `);
  if (withStars.rows.length === 0) {
    console.log('  ❌ 没有 stars > 0 的数据');
  } else {
    withStars.rows.forEach((r: any, i: number) => {
      console.log(`  ${i + 1}. ${r.name}`);
      console.log(`     Stars: ${r.stars} | Downloads: ${r.download_count} | Category: ${r.category}`);
    });
  }

  // 6. 数据源对比
  console.log('\n【各数据源字段完整性对比】');
  const sourceStats = await pool.query(`
    SELECT 
      source,
      COUNT(*) as total,
      AVG(stars)::int as avg_stars,
      AVG(download_count)::int as avg_downloads,
      COUNT(CASE WHEN category != 'uncategorized' THEN 1 END) as with_category,
      COUNT(CASE WHEN tags != '[]' THEN 1 END) as with_tags
    FROM sync.skills
    GROUP BY source
  `);
  sourceStats.rows.forEach((r: any) => {
    console.log(`\n  ${r.source}:`);
    console.log(`    总数: ${r.total}`);
    console.log(`    平均 Stars: ${r.avg_stars}`);
    console.log(`    平均 Downloads: ${r.avg_downloads}`);
    console.log(`    有分类: ${r.with_category} | 有标签: ${r.with_tags}`);
  });

  await pool.end();
  
  console.log('\n========================================');
  console.log('分析完成');
  console.log('========================================');
}

analyze().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
