/**
 * 数据库重置脚本
 * 删除并重新创建数据库，执行所有SQL初始化脚本
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 数据库配置（从环境变量或默认值）
const DB_CONFIG = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || '5432',
  user: process.env.POSTGRES_USER || 'root',
  password: process.env.POSTGRES_PASSWORD || 'NewPassword123!',
  database: process.env.POSTGRES_DB || 'aidean',
};

/**
 * 执行SQL文件
 */
async function executeSqlFile(filePath: string): Promise<void> {
  try {
    const sql = readFileSync(filePath, 'utf-8');
    console.log(`执行: ${filePath}`);
    
    // 使用Prisma执行原始SQL
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
    
    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement + ';');
      } catch (err: any) {
        // 忽略某些非致命错误
        if (!err.message?.includes('already exists') && 
            !err.message?.includes('does not exist')) {
          console.warn(`警告: ${err.message}`);
        }
      }
    }
    
    console.log(`✅ 完成: ${filePath}`);
  } catch (err) {
    console.error(`❌ 失败: ${filePath}`, err);
    throw err;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('🗄️  Aidean 数据库重置工具');
  console.log('========================================\n');

  try {
    // 步骤1: 断开所有连接并删除数据库
    console.log('步骤1: 清理现有数据库...');
    try {
      await prisma.$executeRawUnsafe(`
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = '${DB_CONFIG.database}' 
        AND pid <> pg_backend_pid();
      `);
    } catch (err) {
      console.log('ℹ️  没有活动连接需要终止');
    }

    // 步骤2: 删除并重新创建数据库（需要连接到postgres数据库）
    console.log('步骤2: 重新创建数据库...');
    try {
      await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${DB_CONFIG.database};`);
      console.log('✅ 旧数据库已删除');
    } catch (err: any) {
      console.log(`ℹ️  删除数据库时: ${err.message}`);
    }

    try {
      await prisma.$executeRawUnsafe(`CREATE DATABASE ${DB_CONFIG.database};`);
      console.log('✅ 新数据库已创建');
    } catch (err: any) {
      console.log(`❌ 创建数据库失败: ${err.message}`);
      console.log('请手动执行: CREATE DATABASE aidean;');
      process.exit(1);
    }

    // 步骤3: 执行SQL初始化脚本
    console.log('\n步骤3: 执行SQL初始化脚本...');
    const sqlDir = join(__dirname, '..', 'docker', 'sql', 'init');
    
    // 获取所有.sql文件并按序号排序
    const sqlFiles = readdirSync(sqlDir)
      .filter(f => f.endsWith('.sql'))
      .sort((a, b) => {
        const numA = parseInt(a.split('_')[0]);
        const numB = parseInt(b.split('_')[0]);
        return numA - numB;
      });

    console.log(`发现 ${sqlFiles.length} 个SQL文件`);

    for (const file of sqlFiles) {
      const filePath = join(sqlDir, file);
      await executeSqlFile(filePath);
    }

    // 步骤4: 执行Prisma migrate
    console.log('\n步骤4: 执行Prisma迁移...');
    try {
      execSync('npx prisma migrate dev --name init --skip-generate --skip-seed', {
        stdio: 'inherit',
        cwd: join(__dirname, '..'),
      });
    } catch (err) {
      console.log('ℹ️  Prisma migrate 可能需要手动执行');
    }

    // 步骤5: 生成Prisma客户端
    console.log('\n步骤5: 生成Prisma客户端...');
    try {
      execSync('npx prisma generate', {
        stdio: 'inherit',
        cwd: join(__dirname, '..'),
      });
    } catch (err) {
      console.log('ℹ️  Prisma generate 可能需要手动执行');
    }

    console.log('\n========================================');
    console.log('✅ 数据库重置完成！');
    console.log('========================================');
    console.log('\n请执行以下命令完成设置:');
    console.log('1. npx prisma generate');
    console.log('2. npm run db:seed (如果需要种子数据)');

  } catch (err) {
    console.error('\n❌ 数据库重置失败:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行
main();
