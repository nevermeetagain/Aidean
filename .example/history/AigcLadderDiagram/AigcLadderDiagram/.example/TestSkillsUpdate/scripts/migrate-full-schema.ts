/**
 * Skills完整字段数据库迁移脚本
 * 根据字段.md创建完整的82个字段表结构
 */

import { getPool } from '../src/database/connection.js';

async function migrate() {
  const pool = getPool();

  console.log('========================================');
  console.log('Skills完整字段数据库迁移');
  console.log('========================================\n');

  try {
    // 1. 删除旧表（如果存在）
    console.log('1. 删除旧表...');
    await pool.query(`DROP TABLE IF EXISTS sync.skills CASCADE`);
    console.log('   ✓ 旧表已删除\n');

    // 2. 创建完整字段表
    console.log('2. 创建完整字段表（82个字段）...');
    await pool.query(`
      CREATE TABLE sync.skills (
        -- 主键
        id SERIAL PRIMARY KEY,
        
        -- 3.1 核心信息字段 (11个)
        name VARCHAR(255) NOT NULL,
        name_cn VARCHAR(255),
        display_name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        short_desc VARCHAR(255),
        skill_type VARCHAR(50) NOT NULL DEFAULT 'utility',
        difficulty_level VARCHAR(50),
        category VARCHAR(100) NOT NULL DEFAULT 'general',
        sub_category VARCHAR(100),
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        
        -- 3.2 作者与来源字段 (7个)
        author VARCHAR(255),
        author_url TEXT,
        version VARCHAR(50),
        license VARCHAR(100),
        source_type VARCHAR(50) NOT NULL DEFAULT 'community',
        is_official BOOLEAN NOT NULL DEFAULT false,
        is_partner BOOLEAN NOT NULL DEFAULT false,
        
        -- 3.3 技术配置字段 (11个)
        protocol VARCHAR(50) NOT NULL DEFAULT 'anthropic',
        mcp_servers JSONB NOT NULL DEFAULT '[]'::jsonb,
        integration_platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
        supported_ides JSONB NOT NULL DEFAULT '[]'::jsonb,
        programming_languages JSONB NOT NULL DEFAULT '[]'::jsonb,
        frameworks JSONB NOT NULL DEFAULT '[]'::jsonb,
        dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
        config_schema JSONB,
        install_cmd TEXT,
        uninstall_cmd TEXT,
        update_cmd TEXT,
        
        -- 3.4 功能与输入输出字段 (7个)
        input_types JSONB NOT NULL DEFAULT '[]'::jsonb,
        output_types JSONB NOT NULL DEFAULT '[]'::jsonb,
        skill_outputs JSONB NOT NULL DEFAULT '[]'::jsonb,
        trigger_methods JSONB NOT NULL DEFAULT '[]'::jsonb,
        usage_examples JSONB,
        templates JSONB,
        shortcuts JSONB,
        
        -- 3.5 学习路径字段 (7个)
        prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb,
        learning_path JSONB,
        estimated_time INTEGER,
        certification_available BOOLEAN NOT NULL DEFAULT false,
        certification_info JSONB,
        related_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
        next_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
        
        -- 3.6 链接与资源字段 (9个)
        homepage TEXT,
        repository TEXT,
        documentation TEXT,
        readme_url TEXT,
        tutorial_url TEXT,
        demo_video TEXT,
        changelog TEXT,
        icon TEXT,
        screenshots JSONB NOT NULL DEFAULT '[]'::jsonb,
        
        -- 3.7 统计数据字段 (10个)
        downloads INTEGER NOT NULL DEFAULT 0,
        installs INTEGER NOT NULL DEFAULT 0,
        stars INTEGER NOT NULL DEFAULT 0,
        rating DECIMAL(2,1),
        review_count INTEGER NOT NULL DEFAULT 0,
        rating_breakdown JSONB,
        active_users INTEGER NOT NULL DEFAULT 0,
        usage_count INTEGER NOT NULL DEFAULT 0,
        completion_rate DECIMAL(5,2),
        usage_trend JSONB,
        
        -- 3.8 审核与状态字段 (12个)
        is_verified BOOLEAN NOT NULL DEFAULT false,
        audit_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        audit_by VARCHAR(255),
        audit_at TIMESTAMP WITH TIME ZONE,
        audit_reason TEXT,
        is_featured BOOLEAN NOT NULL DEFAULT false,
        is_recommended BOOLEAN NOT NULL DEFAULT false,
        recommend_start_at TIMESTAMP WITH TIME ZONE,
        recommend_end_at TIMESTAMP WITH TIME ZONE,
        promotion_badge VARCHAR(100),
        is_active BOOLEAN NOT NULL DEFAULT true,
        visibility VARCHAR(50) NOT NULL DEFAULT 'public',
        
        -- 3.9 运营配置字段 (7个)
        display_weight INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        admin_note TEXT,
        pricing_type VARCHAR(50),
        pricing_info JSONB,
        trial_enabled BOOLEAN NOT NULL DEFAULT false,
        trial_config JSONB,
        
        -- 3.10 采集同步与时间戳字段 (14个)
        sync_status VARCHAR(50) NOT NULL DEFAULT 'manual',
        sync_source VARCHAR(100) NOT NULL DEFAULT 'manual',
        sync_batch_id VARCHAR(255),
        sync_metadata JSONB,
        data_quality_score DECIMAL(3,2),
        completeness_rate DECIMAL(5,2),
        last_updated TIMESTAMP WITH TIME ZONE,
        last_verified_at TIMESTAMP WITH TIME ZONE,
        published_at TIMESTAMP WITH TIME ZONE,
        deprecated_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        ext_json JSONB,
        attr01 VARCHAR(255),
        attr02 VARCHAR(255),
        attr03 VARCHAR(255),
        attr04 VARCHAR(255),
        attr05 VARCHAR(255),
        tenant_id VARCHAR(50) NOT NULL DEFAULT '0',
        
        -- 唯一约束
        CONSTRAINT unique_skill_name UNIQUE (name)
      )
    `);
    console.log('   ✓ 完整字段表已创建\n');

    // 3. 创建索引
    console.log('3. 创建索引...');
    await pool.query(`
      CREATE INDEX idx_skills_category ON sync.skills(category);
      CREATE INDEX idx_skills_skill_type ON sync.skills(skill_type);
      CREATE INDEX idx_skills_author ON sync.skills(author);
      CREATE INDEX idx_skills_stars ON sync.skills(stars DESC);
      CREATE INDEX idx_skills_downloads ON sync.skills(downloads DESC);
      CREATE INDEX idx_skills_rating ON sync.skills(rating DESC);
      CREATE INDEX idx_skills_is_verified ON sync.skills(is_verified);
      CREATE INDEX idx_skills_is_featured ON sync.skills(is_featured);
      CREATE INDEX idx_skills_is_active ON sync.skills(is_active);
      CREATE INDEX idx_skills_visibility ON sync.skills(visibility);
      CREATE INDEX idx_skills_sync_source ON sync.skills(sync_source);
      CREATE INDEX idx_skills_display_weight ON sync.skills(display_weight DESC);
      CREATE INDEX idx_skills_created_at ON sync.skills(created_at DESC);
      
      -- GIN索引用于JSONB数组搜索
      CREATE INDEX idx_skills_tags ON sync.skills USING GIN(tags);
      CREATE INDEX idx_skills_mcp_servers ON sync.skills USING GIN(mcp_servers);
      CREATE INDEX idx_skills_programming_languages ON sync.skills USING GIN(programming_languages);
      CREATE INDEX idx_skills_frameworks ON sync.skills USING GIN(frameworks);
    `);
    console.log('   ✓ 索引已创建\n');

    // 4. 验证字段数量
    console.log('4. 验证字段数量...');
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = 'sync' AND table_name = 'skills'
    `);
    console.log(`   ✓ 表字段总数: ${result.rows[0].count}\n`);

    console.log('========================================');
    console.log('迁移完成！');
    console.log('========================================');

  } catch (error) {
    console.error('迁移失败:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
