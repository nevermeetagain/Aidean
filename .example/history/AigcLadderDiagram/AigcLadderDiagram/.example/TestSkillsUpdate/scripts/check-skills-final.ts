/**
 * 检查Skills最终同步结果
 * 验证所有字段是否已正确填充
 */

import { getPool } from '../src/database/connection.js';

async function check() {
  const pool = getPool();

  console.log('========================================');
  console.log('Skills最终同步结果检查');
  console.log('========================================\n');

  try {
    // 1. 基本统计
    const countResult = await pool.query('SELECT COUNT(*) as count FROM sync.skills');
    const totalCount = parseInt(countResult.rows[0].count);
    console.log(`【总记录数】${totalCount}\n`);

    // 2. 查询所有Skills
    const skillsResult = await pool.query(`
      SELECT 
        name,
        display_name,
        description,
        skill_type,
        category,
        tags,
        author,
        version,
        license,
        protocol,
        supported_ides,
        programming_languages,
        install_cmd,
        homepage,
        repository,
        documentation,
        icon,
        stars,
        downloads,
        rating,
        review_count,
        is_verified,
        is_featured,
        is_recommended,
        is_active,
        sync_source,
        sync_batch_id,
        sync_metadata,
        last_updated
      FROM sync.skills
      ORDER BY stars DESC
    `);

    // 3. 显示每个Skill的详情
    console.log('【Skills详情】\n');
    for (const skill of skillsResult.rows) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📦 ${skill.name}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  显示名: ${skill.display_name}`);
      console.log(`  描述: ${skill.description?.substring(0, 60)}...`);
      console.log(`  类型: ${skill.skill_type} / ${skill.category}`);
      console.log(`  标签: ${JSON.stringify(skill.tags)?.substring(0, 50)}`);
      console.log(`  作者: ${skill.author || 'N/A'}`);
      console.log(`  版本: ${skill.version || 'N/A'}`);
      console.log(`  许可证: ${skill.license || 'N/A'}`);
      console.log(`  协议: ${skill.protocol}`);
      console.log(`  支持IDE: ${JSON.stringify(skill.supported_ides)}`);
      console.log(`  编程语言: ${JSON.stringify(skill.programming_languages)}`);
      console.log(`  安装命令: ${skill.install_cmd}`);
      console.log(`  主页: ${skill.homepage || 'N/A'}`);
      console.log(`  仓库: ${skill.repository || 'N/A'}`);
      console.log(`  文档: ${skill.documentation || 'N/A'}`);
      console.log(`  图标: ${skill.icon}`);
      console.log(`  ⭐ Stars: ${skill.stars?.toLocaleString()}`);
      console.log(`  ⬇️ Downloads: ${skill.downloads?.toLocaleString()}`);
      console.log(`  ⭐ Rating: ${skill.rating}`);
      console.log(`  💬 Reviews: ${skill.review_count}`);
      console.log(`  已验证: ${skill.is_verified}`);
      console.log(`  精选: ${skill.is_featured}`);
      console.log(`  推荐: ${skill.is_recommended}`);
      console.log(`  启用: ${skill.is_active}`);
      console.log(`  同步来源: ${skill.sync_source}`);
      console.log(`  批次ID: ${skill.sync_batch_id}`);
      
      // 解析sync_metadata显示平台分布
      if (skill.sync_metadata) {
        try {
          const metadata = typeof skill.sync_metadata === 'string' 
            ? JSON.parse(skill.sync_metadata) 
            : skill.sync_metadata;
          
          if (metadata.platforms) {
            console.log(`  平台来源: ${metadata.platforms.join(', ')}`);
          }
          if (metadata.platformStars) {
            const starsDetail = Object.entries(metadata.platformStars)
              .map(([p, s]) => `${p}: ${(s as number).toLocaleString()}⭐`)
              .join(', ');
            console.log(`  Stars详情: ${starsDetail}`);
          }
        } catch (e) {
          console.log(`  元数据: (解析失败)`);
        }
      }
      
      console.log(`  最后更新: ${skill.last_updated}`);
      console.log();
    }

    // 4. 字段填充率统计
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('【字段填充率统计】');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const fieldsToCheck = [
      { name: 'name', label: '名称' },
      { name: 'display_name', label: '显示名' },
      { name: 'description', label: '描述' },
      { name: 'skill_type', label: '技能类型' },
      { name: 'category', label: '分类' },
      { name: 'tags', label: '标签' },
      { name: 'author', label: '作者' },
      { name: 'version', label: '版本' },
      { name: 'license', label: '许可证' },
      { name: 'protocol', label: '协议' },
      { name: 'supported_ides', label: '支持IDE' },
      { name: 'programming_languages', label: '编程语言' },
      { name: 'frameworks', label: '框架' },
      { name: 'install_cmd', label: '安装命令' },
      { name: 'homepage', label: '主页' },
      { name: 'repository', label: '仓库' },
      { name: 'documentation', label: '文档' },
      { name: 'icon', label: '图标' },
      { name: 'stars', label: 'Stars' },
      { name: 'downloads', label: 'Downloads' },
      { name: 'rating', label: 'Rating' },
      { name: 'review_count', label: '评论数' },
      { name: 'is_verified', label: '已验证' },
      { name: 'is_featured', label: '精选' },
      { name: 'is_recommended', label: '推荐' },
      { name: 'is_active', label: '启用' },
      { name: 'sync_source', label: '同步来源' },
      { name: 'sync_batch_id', label: '批次ID' },
      { name: 'sync_metadata', label: '同步元数据' },
      { name: 'last_updated', label: '最后更新' },
    ];

    let filledCount = 0;
    let totalFields = fieldsToCheck.length * totalCount;

    for (const field of fieldsToCheck) {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE 
            WHEN ${field.name} IS NOT NULL 
            AND ${field.name}::text != '' 
            AND ${field.name}::text != '0' 
            AND ${field.name}::text != '[]'
            AND ${field.name}::text != 'false'
            AND ${field.name}::text != '{}'
            AND ${field.name}::text != 'null'
            THEN 1 
          END) as filled
        FROM sync.skills
      `);
      
      const r = result.rows[0];
      const rate = ((parseInt(r.filled) / parseInt(r.total)) * 100).toFixed(1);
      const status = parseFloat(rate) >= 90 ? '✅' : parseFloat(rate) >= 50 ? '⚠️' : '❌';
      
      filledCount += parseInt(r.filled);
      console.log(`  ${status} ${field.label.padEnd(12)}: ${String(r.filled).padStart(3)}/${r.total} (${rate}%)`);
    }

    // 5. 总体填充率
    const overallRate = ((filledCount / totalFields) * 100).toFixed(1);
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`【总体字段填充率】: ${overallRate}%`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // 6. 聚合算法验证
    console.log('\n【聚合算法验证】');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const pdfSkill = skillsResult.rows.find((s: any) => s.name === 'pdf');
    if (pdfSkill && pdfSkill.sync_metadata) {
      const metadata = typeof pdfSkill.sync_metadata === 'string' 
        ? JSON.parse(pdfSkill.sync_metadata) 
        : pdfSkill.sync_metadata;
      
      console.log(`\n📦 pdf Skill 聚合详情:`);
      console.log(`  总Stars: ${pdfSkill.stars?.toLocaleString()}`);
      
      if (metadata.platformStars) {
        let calculatedTotal = 0;
        console.log(`  平台分解:`);
        for (const [platform, stars] of Object.entries(metadata.platformStars)) {
          console.log(`    - ${platform}: ${(stars as number).toLocaleString()}⭐`);
          calculatedTotal += stars as number;
        }
        console.log(`  验证: ${calculatedTotal.toLocaleString()} == ${pdfSkill.stars?.toLocaleString()} ? ${calculatedTotal === pdfSkill.stars ? '✅' : '❌'}`);
      }
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
