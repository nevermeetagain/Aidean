/**
 * 查看数据库表结构
 */

import { getPool } from '../src/database/connection.js';

async function check() {
  const pool = getPool();

  // 查看 skills 表字段
  const result = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'sync' AND table_name = 'skills'
    ORDER BY ordinal_position
  `);

  console.log('=== Skills 表字段 ===');
  result.rows.forEach((r: any, i: number) => {
    console.log(`  ${i + 1}. ${r.column_name}: ${r.data_type}`);
  });

  // 查看数据示例
  console.log('\n=== 数据示例 ===');
  const skills = await pool.query(`
    SELECT * FROM sync.skills LIMIT 2
  `);

  skills.rows.forEach((s: any, i: number) => {
    console.log(`\n--- Skill #${i + 1} ---`);
    Object.entries(s).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        const display = typeof value === 'string' && value.length > 50
          ? value.substring(0, 50) + '...'
          : value;
        console.log(`  ${key}: ${display}`);
      }
    });
  });

  // 统计
  console.log('\n=== 统计 ===');
  const count = await pool.query('SELECT COUNT(*) as total FROM sync.skills');
  console.log(`总记录数: ${count.rows[0].total}`);

  const bySource = await pool.query('SELECT source, COUNT(*) as count FROM sync.skills GROUP BY source');
  console.log('\n按数据源分布:');
  bySource.rows.forEach((r: any) => {
    console.log(`  ${r.source}: ${r.count}`);
  });

  await pool.end();
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
