/**
 * 检查完整字段同步结果
 */

import { getPool } from '../src/database/connection.js';

async function check() {
  const pool = getPool();

  console.log('========================================');
  console.log('Skills完整字段同步结果检查');
  console.log('========================================\n');

  try {
    // 1. 基本统计
    const countResult = await pool.query('SELECT COUNT(*) as count FROM sync.skills');
    console.log(`【总记录数】${countResult.rows[0].count}\n`);

    // 2. 核心字段填充率
    console.log('【核心字段填充率】');
    const coreFields = [
      { name: 'name', label: '名称' },
      { name: 'display_name', label: '显示名' },
      { name: 'description', label: '描述' },
      { name: 'skill_type', label: '技能类型' },
      { name: 'category', label: '分类' },
      { name: 'tags', label: '标签' },
      { name: 'author', label: '作者' },
      { name: 'version', label: '版本' },
      { name: 'license', label: '许可证' },
    ];

    for (const field of coreFields) {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN ${field.name} IS NOT NULL AND ${field.name}::text != '' AND ${field.name}::text != '[]' THEN 1 END) as filled
        FROM sync.skills
      `);
      const r = result.rows[0];
      const rate = ((parseInt(r.filled) / parseInt(r.total)) * 100).toFixed(1);
      console.log(`  ${field.label.padEnd(10)}: ${String(r.filled).padStart(3)}/${r.total} (${rate}%)`);
    }

    // 3. 技术配置字段
    console.log('\n【技术配置字段】');
    const techFields = [
      { name: 'protocol', label: '协议' },
      { name: 'supported_ides', label: '支持IDE' },
      { name: 'programming_languages', label: '编程语言' },
      { name: 'frameworks', label: '框架' },
      { name: 'install_cmd', label: '安装命令' },
    ];

    for (const field of techFields) {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN ${field.name} IS NOT NULL AND ${field.name}::text != '' AND ${field.name}::text != '[]' THEN 1 END) as filled
        FROM sync.skills
      `);
      const r = result.rows[0];
      const rate = ((parseInt(r.filled) / parseInt(r.total)) * 100).toFixed(1);
      console.log(`  ${field.label.padEnd(12)}: ${String(r.filled).padStart(3)}/${r.total} (${rate}%)`);
    }

    // 4. 链接与资源
    console.log('\n【链接与资源字段】');
    const linkFields = [
      { name: 'homepage', label: '主页' },
      { name: 'repository', label: '仓库' },
      { name: 'documentation', label: '文档' },
      { name: 'icon', label: '图标' },
    ];

    for (const field of linkFields) {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN ${field.name} IS NOT NULL AND ${field.name}::text != '' THEN 1 END) as filled
        FROM sync.skills
      `);
      const r = result.rows[0];
      const rate = ((parseInt(r.filled) / parseInt(r.total)) * 100).toFixed(1);
      console.log(`  ${field.label.padEnd(10)}: ${String(r.filled).padStart(3)}/${r.total} (${rate}%)`);
    }

    // 5. 统计数据
    console.log('\n【统计数据字段】');
    const statsFields = [
      { name: 'downloads', label: '下载量' },
      { name: 'stars', label: 'Stars' },
      { name: 'rating', label: '评分' },
      { name: 'review_count', label: '评论数' },
    ];

    for (const field of statsFields) {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN ${field.name} IS NOT NULL AND ${field.name}::text != '0' THEN 1 END) as filled
        FROM sync.skills
      `);
      const r = result.rows[0];
      const rate = ((parseInt(r.filled) / parseInt(r.total)) * 100).toFixed(1);
      console.log(`  ${field.label.padEnd(10)}: ${String(r.filled).padStart(3)}/${r.total} (${rate}%)`);
    }

    // 6. 审核与状态
    console.log('\n【审核与状态字段】');
    const auditFields = [
      { name: 'is_verified', label: '已验证' },
      { name: 'is_featured', label: '精选' },
      { name: 'is_recommended', label: '推荐' },
      { name: 'is_active', label: '启用' },
    ];

    for (const field of auditFields) {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN ${field.name} = true THEN 1 END) as filled
        FROM sync.skills
      `);
      const r = result.rows[0];
      const rate = ((parseInt(r.filled) / parseInt(r.total)) * 100).toFixed(1);
      console.log(`  ${field.label.padEnd(10)}: ${String(r.filled).padStart(3)}/${r.total} (${rate}%)`);
    }

    // 7. 同步信息
    console.log('\n【同步信息】');
    const syncResult = await pool.query(`
      SELECT sync_source, COUNT(*) as count 
      FROM sync.skills 
      GROUP BY sync_source
    `);
    for (const row of syncResult.rows) {
      console.log(`  ${row.sync_source}: ${row.count}`);
    }

    // 8. 样本数据
    console.log('\n【样本数据】');
    const sampleResult = await pool.query(`
      SELECT 
        name, 
        display_name, 
        skill_type, 
        category, 
        author, 
        stars, 
        supported_ides,
        programming_languages
      FROM sync.skills 
      ORDER BY stars DESC 
      LIMIT 3
    `);
    
    for (const row of sampleResult.rows) {
      console.log(`\n  名称: ${row.name}`);
      console.log(`  显示名: ${row.display_name}`);
      console.log(`  类型: ${row.skill_type} / ${row.category}`);
      console.log(`  作者: ${row.author || 'N/A'}`);
      console.log(`  Stars: ${row.stars}`);
      console.log(`  IDE: ${JSON.stringify(row.supported_ides)}`);
      console.log(`  语言: ${JSON.stringify(row.programming_languages)}`);
    }

    console.log('\n========================================');
    console.log('检查完成！');
    console.log('========================================');

  } finally {
    await pool.end();
  }
}

check().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
