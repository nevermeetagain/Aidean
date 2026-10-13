/**
 * 查看同步结果脚本
 */

import { getPool } from '../src/database/connection.js';

async function check() {
  const pool = getPool();

  // 1. 查看数据源配置
  console.log('=== 数据源配置 ===');
  const sources = await pool.query('SELECT * FROM sync.data_sources');
  sources.rows.forEach((s: any) => {
    console.log(`${s.source_code}: ${s.source_name} (类型: ${s.source_type})`);
    console.log(`  URL: ${s.base_url}`);
    console.log(`  优先级: P${s.sync_priority}`);
  });

  // 2. 查看同步任务
  console.log('\n=== 同步任务 ===');
  const tasks = await pool.query('SELECT * FROM sync.sync_tasks ORDER BY started_at DESC LIMIT 5');
  tasks.rows.forEach((t: any) => {
    console.log(`任务 #${t.id}: ${t.status}`);
    console.log(`  数据源: ${t.source_code}`);
    console.log(`  记录: ${t.total_records} 条`);
    console.log(`  成功: ${t.processed_records}, 失败: ${t.failed_records}`);
    console.log(`  时间: ${t.started_at} ~ ${t.completed_at || '进行中'}`);
  });

  // 3. 查看 Skill 字段示例
  console.log('\n=== Skill 字段示例 ===');
  const skills = await pool.query(`
    SELECT
      skill_key,
      name,
      display_name,
      author,
      source,
      source_id,
      stars,
      download_count,
      category,
      tags,
      version,
      install_command,
      npm_package,
      data_layer,
      trust_score,
      quality_score,
      last_updated
    FROM sync.skills
    LIMIT 3
  `);

  skills.rows.forEach((s: any, i: number) => {
    console.log(`\n--- Skill #${i + 1}: ${s.skill_key} ---`);
    console.log(`名称: ${s.name}`);
    console.log(`显示名: ${s.display_name}`);
    console.log(`作者: ${s.author}`);
    console.log(`数据源: ${s.source} (ID: ${s.source_id})`);
    console.log(`Stars: ${s.stars}, 下载: ${s.download_count}`);
    console.log(`分类: ${s.category}`);
    console.log(`标签: ${s.tags}`);
    console.log(`版本: ${s.version}`);
    console.log(`安装命令: ${s.install_command}`);
    console.log(`NPM包: ${s.npm_package}`);
    console.log(`数据层: ${s.data_layer}`);
    console.log(`可信度: ${s.trust_score}, 质量分: ${s.quality_score}`);
    console.log(`最后更新: ${s.last_updated}`);
  });

  // 4. 统计各数据源记录数
  console.log('\n=== 数据源统计 ===');
  const stats = await pool.query('SELECT source, COUNT(*) as count FROM sync.skills GROUP BY source ORDER BY count DESC');
  stats.rows.forEach((s: any) => {
    console.log(`${s.source}: ${s.count} 条`);
  });

  await pool.end();
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
