/**
 * 数据库初始化脚本
 * 创建 skills_db 数据库
 */

import { Client } from 'pg';

const adminConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'NewPassword123!',
  database: 'postgres', // 连接到默认 postgres 数据库
};

const targetDbName = process.env.DB_NAME || 'skills_db';

async function initDatabase(): Promise<void> {
  const client = new Client(adminConfig);
  
  try {
    await client.connect();
    console.log('Connected to PostgreSQL admin database');
    
    // 检查数据库是否存在
    const checkResult = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDbName]
    );
    
    if (checkResult.rows.length === 0) {
      // 数据库不存在，创建它
      console.log(`Creating database: ${targetDbName}`);
      await client.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`Database "${targetDbName}" created successfully`);
    } else {
      console.log(`Database "${targetDbName}" already exists`);
    }
    
    console.log('Database initialization completed!');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initDatabase();
