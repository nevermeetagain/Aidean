/**
 * Skills完整字段数据访问层
 * 支持82个字段的CRUD操作
 */

import { Pool } from 'pg';
import { Skill, SkillDBRow } from '../types/skill-full.js';

export class SkillRepository {
  constructor(private pool: Pool) {}

  /**
   * 将Skill对象转换为数据库行（蛇形命名）
   */
  private toDBRow(skill: Partial<Skill>): Partial<SkillDBRow> {
    return {
      name: skill.name,
      name_cn: skill.nameCn,
      display_name: skill.displayName,
      description: skill.description,
      short_desc: skill.shortDesc,
      skill_type: skill.skillType,
      difficulty_level: skill.difficultyLevel,
      category: skill.category,
      sub_category: skill.subCategory,
      tags: skill.tags,
      author: skill.author,
      author_url: skill.authorUrl,
      version: skill.version,
      license: skill.license,
      source_type: skill.sourceType,
      is_official: skill.isOfficial,
      is_partner: skill.isPartner,
      protocol: skill.protocol,
      mcp_servers: skill.mcpServers,
      integration_platforms: skill.integrationPlatforms,
      supported_ides: skill.supportedIdes,
      programming_languages: skill.programmingLanguages,
      frameworks: skill.frameworks,
      dependencies: skill.dependencies,
      config_schema: skill.configSchema,
      install_cmd: skill.installCmd,
      uninstall_cmd: skill.uninstallCmd,
      update_cmd: skill.updateCmd,
      input_types: skill.inputTypes,
      output_types: skill.outputTypes,
      skill_outputs: skill.skillOutputs,
      trigger_methods: skill.triggerMethods,
      usage_examples: skill.usageExamples,
      templates: skill.templates,
      shortcuts: skill.shortcuts,
      prerequisites: skill.prerequisites,
      learning_path: skill.learningPath,
      estimated_time: skill.estimatedTime,
      certification_available: skill.certificationAvailable,
      certification_info: skill.certificationInfo,
      related_skills: skill.relatedSkills,
      next_steps: skill.nextSteps,
      homepage: skill.homepage,
      repository: skill.repository,
      documentation: skill.documentation,
      readme_url: skill.readmeUrl,
      tutorial_url: skill.tutorialUrl,
      demo_video: skill.demoVideo,
      changelog: skill.changelog,
      icon: skill.icon,
      screenshots: skill.screenshots,
      downloads: skill.downloads,
      installs: skill.installs,
      stars: skill.stars,
      rating: skill.rating,
      review_count: skill.reviewCount,
      rating_breakdown: skill.ratingBreakdown,
      active_users: skill.activeUsers,
      usage_count: skill.usageCount,
      completion_rate: skill.completionRate,
      usage_trend: skill.usageTrend,
      is_verified: skill.isVerified,
      audit_status: skill.auditStatus,
      audit_by: skill.auditBy,
      audit_at: skill.auditAt,
      audit_reason: skill.auditReason,
      is_featured: skill.isFeatured,
      is_recommended: skill.isRecommended,
      recommend_start_at: skill.recommendStartAt,
      recommend_end_at: skill.recommendEndAt,
      promotion_badge: skill.promotionBadge,
      is_active: skill.isActive,
      visibility: skill.visibility,
      display_weight: skill.displayWeight,
      sort_order: skill.sortOrder,
      admin_note: skill.adminNote,
      pricing_type: skill.pricingType,
      pricing_info: skill.pricingInfo,
      trial_enabled: skill.trialEnabled,
      trial_config: skill.trialConfig,
      sync_status: skill.syncStatus,
      sync_source: skill.syncSource,
      sync_batch_id: skill.syncBatchId,
      sync_metadata: skill.syncMetadata,
      data_quality_score: skill.dataQualityScore,
      completeness_rate: skill.completenessRate,
      last_updated: skill.lastUpdated,
      last_verified_at: skill.lastVerifiedAt,
      published_at: skill.publishedAt,
      deprecated_at: skill.deprecatedAt,
      ext_json: skill.extJson,
      attr01: skill.attr01,
      attr02: skill.attr02,
      attr03: skill.attr03,
      attr04: skill.attr04,
      attr05: skill.attr05,
      tenant_id: skill.tenantId,
    };
  }

  /**
   * 插入或更新Skill（完整字段）
   */
  async upsertFull(skill: Skill, batchId?: string): Promise<void> {
    const dbRow = this.toDBRow(skill);
    
    // 添加batchId到dbRow
    if (batchId) {
      (dbRow as any).sync_batch_id = batchId;
    }
    
    // 处理JSONB字段 - 确保数组被正确序列化
    const processedRow: Record<string, any> = {};
    for (const [key, value] of Object.entries(dbRow)) {
      if (value !== undefined) {
        // 如果是数组或对象，确保它被正确序列化为JSON
        if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
          processedRow[key] = JSON.stringify(value);
        } else {
          processedRow[key] = value;
        }
      }
    }
    
    const columns = Object.keys(processedRow);
    const values = Object.values(processedRow);
    
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `
      INSERT INTO sync.skills (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (name) DO UPDATE SET
      ${columns.map(c => `${c} = EXCLUDED.${c}`).join(', ')},
      updated_at = NOW()
    `;
    
    await this.pool.query(query, values);
  }

  /**
   * 批量插入Skills（完整字段）
   */
  async batchUpsertFull(skills: Skill[], batchId?: string): Promise<void> {
    if (skills.length === 0) return;
    
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const skill of skills) {
        await this.upsertFull(skill, batchId);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 根据名称查找Skill
   */
  async findByName(name: string): Promise<SkillDBRow | null> {
    const result = await this.pool.query(
      'SELECT * FROM sync.skills WHERE name = $1',
      [name]
    );
    return result.rows[0] || null;
  }

  /**
   * 获取所有Skills
   */
  async findAll(limit: number = 100): Promise<SkillDBRow[]> {
    const result = await this.pool.query(
      'SELECT * FROM sync.skills ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }

  /**
   * 更新字段完整度
   */
  async updateCompletenessRate(name: string): Promise<void> {
    await this.pool.query(`
      UPDATE sync.skills
      SET completeness_rate = (
        SELECT 
          ROUND(
            (
              COUNT(CASE WHEN value IS NOT NULL AND value::text != '' AND value::text != '0' AND value::text != '[]' AND value::text != 'false' THEN 1 END) * 100.0 /
              COUNT(*)
            ), 2
          )
        FROM jsonb_each_text(to_jsonb(sync.skills))
        WHERE key NOT IN ('id', 'created_at', 'updated_at', 'sync_metadata', 'ext_json')
      )
      WHERE name = $1
    `, [name]);
  }

  /**
   * 获取字段统计信息
   */
  async getFieldStats(): Promise<Record<string, { filled: number; total: number; rate: string }>> {
    const fields = [
      'name', 'name_cn', 'display_name', 'description', 'short_desc',
      'skill_type', 'difficulty_level', 'category', 'sub_category', 'tags',
      'author', 'author_url', 'version', 'license',
      'protocol', 'mcp_servers', 'programming_languages', 'frameworks',
      'install_cmd', 'homepage', 'repository', 'documentation',
      'downloads', 'stars', 'rating', 'review_count',
      'is_verified', 'is_featured', 'is_active'
    ];

    const stats: Record<string, { filled: number; total: number; rate: string }> = {};

    for (const field of fields) {
      const result = await this.pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN ${field} IS NOT NULL AND ${field}::text != '' AND ${field}::text != '0' AND ${field}::text != '[]' AND ${field}::text != 'false' THEN 1 END) as filled
        FROM sync.skills
      `);
      const r = result.rows[0];
      stats[field] = {
        filled: parseInt(r.filled),
        total: parseInt(r.total),
        rate: ((parseInt(r.filled) / parseInt(r.total)) * 100).toFixed(1) + '%'
      };
    }

    return stats;
  }
}
