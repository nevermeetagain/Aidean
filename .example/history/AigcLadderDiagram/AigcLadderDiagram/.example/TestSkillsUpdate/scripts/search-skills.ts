/**
 * 搜索指定技能
 */

import { getPool } from '../src/database/connection.js';

const keywords = ['gsd', 'openspec', 'superpower', 'oh-my-openagent'];

async function search() {
  const pool = getPool();

  console.log('========================================');
  console.log('技能搜索');
  console.log('========================================\n');

  for (const keyword of keywords) {
    console.log(`\n【搜索: "${keyword}"】`);
    
    const result = await pool.query(`
      SELECT 
        skill_key,
        name,
        description,
        author,
        source,
        stars,
        download_count,
        quality_score,
        install_command
      FROM sync.skills 
      WHERE 
        LOWER(name) LIKE LOWER($1) OR
        LOWER(skill_key) LIKE LOWER($1) OR
        LOWER(COALESCE(description, '')) LIKE LOWER($1)
      ORDER BY quality_score DESC, stars DESC
    `, [`%${keyword}%`]);

    if (result.rows.length === 0) {
      console.log('  ❌ 未找到匹配的技能');
    } else {
      console.log(`  ✅ 找到 ${result.rows.length} 条匹配`);
      result.rows.forEach((r: any, i: number) => {
        console.log(`\n  ${i + 1}. ${r.name}`);
        console.log(`     Key: ${r.skill_key}`);
        console.log(`     描述: ${r.description ? r.description.substring(0, 80) + '...' : 'N/A'}`);
        console.log(`     作者: ${r.author} | 来源: ${r.source}`);
        console.log(`     质量: ${r.quality_score} | Stars: ${r.stars} | 下载: ${r.download_count}`);
        console.log(`     安装: ${r.install_command}`);
      });
    }
  }

  // 额外：显示所有包含这些关键词的变体
  console.log('\n\n========================================');
  console.log('模糊搜索（所有相关技能）');
  console.log('========================================');

  const allResults = await pool.query(`
    SELECT 
      skill_key,
      name,
      source,
      quality_score
    FROM sync.skills 
    WHERE 
      LOWER(name) LIKE '%gsd%' OR
      LOWER(name) LIKE '%open%' OR
      LOWER(name) LIKE '%super%' OR
      LOWER(name) LIKE '%agent%'
    ORDER BY name
    LIMIT 20
  `);

  console.log(`\n找到 ${allResults.rows.length} 条相关记录：`);
  allResults.rows.forEach((r: any, i: number) => {
    console.log(`  ${String(i + 1).padStart(2)}. [${r.source}] ${r.name} (质量: ${r.quality_score})`);
  });

  await pool.end();
  
  console.log('\n========================================');
  console.log('搜索完成');
  console.log('========================================');
}

search().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
