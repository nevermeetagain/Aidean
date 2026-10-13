/**
 * Skills完整字段同步脚本
 * 使用完整82个字段进行同步
 */

import { getPool } from '../src/database/connection.js';
import { NpmAdapterFull } from '../src/adapters/NpmAdapterFull.js';
import { SkillRepository } from '../src/database/repository-full.js';
import { createSkillWithDefaults, Skill } from '../src/types/skill-full.js';

async function sync() {
  console.log('========================================');
  console.log('Skills完整字段同步');
  console.log('========================================\n');

  const pool = getPool();
  const adapter = new NpmAdapterFull();
  const repository = new SkillRepository(pool);

  const batchId = `batch_${Date.now()}`;
  let totalSynced = 0;

  try {
    // 1. 搜索关键词列表
    const searchQueries = [
      'mcp skill',
      'claude skill',
      'ai skill',
      'llm tool',
      'anthropic',
    ];

    for (const query of searchQueries) {
      console.log(`\n【搜索】${query}`);
      
      try {
        const skills = await adapter.search(query, 20);
        
        for (const skill of skills) {
          try {
            await repository.upsertFull(skill, batchId);
            totalSynced++;
            console.log(`  ✓ ${skill.name}`);
          } catch (error) {
            console.error(`  ✗ ${skill.name}:`, (error as Error).message);
          }
        }
      } catch (error) {
        console.error(`搜索失败 "${query}":`, (error as Error).message);
      }

      // 避免请求过快
      await new Promise(r => setTimeout(r, 1000));
    }

    // 2. 同步特定技能
    console.log('\n【同步特定技能】');
    const specificPackages = [
      '@anthropic-ai/mcp',
      '@modelcontextprotocol/server-filesystem',
      '@modelcontextprotocol/server-github',
    ];

    for (const pkgName of specificPackages) {
      try {
        const skill = await adapter.getPackage(pkgName);
        if (skill) {
          await repository.upsertFull(skill, batchId);
          totalSynced++;
          console.log(`  ✓ ${pkgName}`);
        }
      } catch (error) {
        console.error(`  ✗ ${pkgName}:`, (error as Error).message);
      }
    }

    console.log('\n========================================');
    console.log(`同步完成！总计: ${totalSynced} 个技能`);
    console.log(`批次ID: ${batchId}`);
    console.log('========================================');

  } finally {
    await pool.end();
  }
}

sync().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
