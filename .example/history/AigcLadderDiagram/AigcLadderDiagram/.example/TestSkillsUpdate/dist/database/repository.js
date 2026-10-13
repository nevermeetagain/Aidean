/**
 * Skill 同步脚本 - 数据访问层 v2.0
 * 核心改进：
 * 1. 连接池替代单Client（解决M7场景）
 * 2. 批量UPSERT（解决S4场景）
 * 3. 字段级更新和质量评分
 */
import { getPool } from './connection.js';
/**
 * Skill 仓库类 v2.0
 * 使用连接池管理数据库连接
 */
export class SkillRepository {
    client = null;
    async connect() {
        const pool = getPool();
        this.client = await pool.connect();
    }
    async disconnect() {
        if (this.client) {
            this.client.release();
            this.client = null;
        }
    }
    getClient() {
        if (!this.client) {
            throw new Error('Repository not connected. Call connect() first.');
        }
        return this.client;
    }
    /**
     * 根据 skillKey 查找 Skill
     */
    async findBySkillKey(skillKey) {
        const result = await this.getClient().query('SELECT * FROM sync.skills WHERE skill_key = $1', [skillKey]);
        return result.rows[0] || null;
    }
    /**
     * 根据 source 和 sourceId 查找 Skill
     */
    async findBySourceAndId(source, sourceId) {
        const result = await this.getClient().query('SELECT * FROM sync.skills WHERE source = $1 AND source_id = $2', [source, sourceId]);
        return result.rows[0] || null;
    }
    /**
     * 创建 Skill
     * v2.0: 增加quality_score/data_layer/field_hashes等字段
     */
    async create(data) {
        const result = await this.getClient().query(`
      INSERT INTO sync.skills (
        skill_key, name, display_name, description, author,
        source, source_id, source_url, stars, download_count,
        category, tags, version, last_updated, install_command,
        npm_package, raw_hash, quality_score, data_layer, field_hashes,
        multi_source_count
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21
      ) RETURNING id;
    `, [
            data.skillKey,
            data.name,
            data.displayName,
            data.description,
            data.author,
            data.source,
            data.sourceId,
            data.sourceUrl,
            data.stars,
            data.downloadCount,
            data.category,
            JSON.stringify(data.tags),
            data.version,
            data.lastUpdated,
            data.installCommand,
            data.npmPackage,
            data.rawHash,
            data.qualityScore || 0,
            data.dataLayer || 0,
            JSON.stringify(data.fieldHashes || {}),
            1,
        ]);
        return result.rows[0].id;
    }
    /**
     * 更新 Skill
     */
    async update(id, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (data.name !== undefined) {
            fields.push(`name = $${paramIndex++}`);
            values.push(data.name);
        }
        if (data.displayName !== undefined) {
            fields.push(`display_name = $${paramIndex++}`);
            values.push(data.displayName);
        }
        if (data.description !== undefined) {
            fields.push(`description = $${paramIndex++}`);
            values.push(data.description);
        }
        if (data.author !== undefined) {
            fields.push(`author = $${paramIndex++}`);
            values.push(data.author);
        }
        if (data.sourceUrl !== undefined) {
            fields.push(`source_url = $${paramIndex++}`);
            values.push(data.sourceUrl);
        }
        if (data.stars !== undefined) {
            fields.push(`stars = $${paramIndex++}`);
            values.push(data.stars);
        }
        if (data.downloadCount !== undefined) {
            fields.push(`download_count = $${paramIndex++}`);
            values.push(data.downloadCount);
        }
        if (data.category !== undefined) {
            fields.push(`category = $${paramIndex++}`);
            values.push(data.category);
        }
        if (data.tags !== undefined) {
            fields.push(`tags = $${paramIndex++}`);
            values.push(JSON.stringify(data.tags));
        }
        if (data.version !== undefined) {
            fields.push(`version = $${paramIndex++}`);
            values.push(data.version);
        }
        if (data.lastUpdated !== undefined) {
            fields.push(`last_updated = $${paramIndex++}`);
            values.push(data.lastUpdated);
        }
        if (data.installCommand !== undefined) {
            fields.push(`install_command = $${paramIndex++}`);
            values.push(data.installCommand);
        }
        if (data.npmPackage !== undefined) {
            fields.push(`npm_package = $${paramIndex++}`);
            values.push(data.npmPackage);
        }
        if (data.rawHash !== undefined) {
            fields.push(`raw_hash = $${paramIndex++}`);
            values.push(data.rawHash);
        }
        if (data.qualityScore !== undefined) {
            fields.push(`quality_score = $${paramIndex++}`);
            values.push(data.qualityScore);
        }
        if (data.fieldHashes !== undefined) {
            fields.push(`field_hashes = $${paramIndex++}`);
            values.push(JSON.stringify(data.fieldHashes));
        }
        if (data.dataLayer !== undefined) {
            fields.push(`data_layer = $${paramIndex++}`);
            values.push(data.dataLayer);
        }
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);
        await this.getClient().query(`UPDATE sync.skills SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
    }
    /**
     * v2.0: 轻量级指标更新
     * 仅更新METRIC级别字段（stars/downloadCount/rawHash），不触发完整更新流程
     */
    async updateMetrics(id, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (data.stars !== undefined) {
            fields.push(`stars = $${paramIndex++}`);
            values.push(data.stars);
        }
        if (data.downloadCount !== undefined) {
            fields.push(`download_count = $${paramIndex++}`);
            values.push(data.downloadCount);
        }
        if (data.rawHash !== undefined) {
            fields.push(`raw_hash = $${paramIndex++}`);
            values.push(data.rawHash);
        }
        if (fields.length === 0)
            return;
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);
        await this.getClient().query(`UPDATE sync.skills SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
    }
    /**
     * v2.0: 批量UPSERT（解决S4场景：10万+数据量）
     * 使用临时表+JOIN实现高效批量写入
     */
    async bulkUpsert(skills) {
        if (skills.length === 0)
            return { inserted: 0, updated: 0 };
        const client = this.getClient();
        let inserted = 0;
        let updated = 0;
        // 分批处理，每批500条
        const BATCH_SIZE = 500;
        for (let i = 0; i < skills.length; i += BATCH_SIZE) {
            const batch = skills.slice(i, i + BATCH_SIZE);
            // 使用UNNEST批量INSERT ... ON CONFLICT UPDATE
            const skillKeys = [];
            const names = [];
            const displayNames = [];
            const descriptions = [];
            const authors = [];
            const sources = [];
            const sourceIds = [];
            const sourceUrls = [];
            const starsArr = [];
            const downloadCounts = [];
            const categories = [];
            const tagsArr = [];
            const versions = [];
            const lastUpdateds = [];
            const installCommands = [];
            const npmPackages = [];
            const rawHashes = [];
            const qualityScores = [];
            const dataLayers = [];
            const fieldHashesArr = [];
            for (const s of batch) {
                skillKeys.push(s.skillKey);
                names.push(s.name);
                displayNames.push(s.displayName);
                descriptions.push(s.description);
                authors.push(s.author);
                sources.push(s.source);
                sourceIds.push(s.sourceId);
                sourceUrls.push(s.sourceUrl);
                starsArr.push(s.stars);
                downloadCounts.push(s.downloadCount);
                categories.push(s.category);
                tagsArr.push(JSON.stringify(s.tags));
                versions.push(s.version);
                lastUpdateds.push(s.lastUpdated || null);
                installCommands.push(s.installCommand || null);
                npmPackages.push(s.npmPackage || null);
                rawHashes.push(s.rawHash);
                qualityScores.push(s.qualityScore || 0);
                dataLayers.push(s.dataLayer ?? 0);
                fieldHashesArr.push(JSON.stringify(s.fieldHashes || {}));
            }
            const result = await client.query(`
        INSERT INTO sync.skills (
          skill_key, name, display_name, description, author,
          source, source_id, source_url, stars, download_count,
          category, tags, version, last_updated, install_command,
          npm_package, raw_hash, quality_score, data_layer, field_hashes
        ) SELECT * FROM UNNEST(
          $1::varchar[], $2::varchar[], $3::varchar[], $4::text[], $5::varchar[],
          $6::varchar[], $7::varchar[], $8::varchar[], $9::integer[], $10::integer[],
          $11::varchar[], $12::text[], $13::varchar[], $14::timestamptz[], $15::varchar[],
          $16::varchar[], $17::varchar[], $18::smallint[], $19::smallint[], $20::jsonb[]
        )
        ON CONFLICT (skill_key) DO UPDATE SET
          name = EXCLUDED.name,
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          author = EXCLUDED.author,
          source_url = EXCLUDED.source_url,
          stars = EXCLUDED.stars,
          download_count = EXCLUDED.download_count,
          category = EXCLUDED.category,
          tags = EXCLUDED.tags,
          version = EXCLUDED.version,
          last_updated = EXCLUDED.last_updated,
          install_command = EXCLUDED.install_command,
          npm_package = EXCLUDED.npm_package,
          raw_hash = EXCLUDED.raw_hash,
          quality_score = EXCLUDED.quality_score,
          data_layer = EXCLUDED.data_layer,
          field_hashes = EXCLUDED.field_hashes,
          multi_source_count = sync.skills.multi_source_count + 1,
          updated_at = CURRENT_TIMESTAMP
      `, [
                skillKeys, names, displayNames, descriptions, authors,
                sources, sourceIds, sourceUrls, starsArr, downloadCounts,
                categories, tagsArr, versions, lastUpdateds, installCommands,
                npmPackages, rawHashes, qualityScores, dataLayers, fieldHashesArr,
            ]);
            // 统计插入/更新数（基于affected rows的近似值）
            const affected = result.rowCount || 0;
            // 由于ON CONFLICT UPDATE，无法精确区分insert/update，使用近似值
            inserted += Math.min(affected, batch.length);
        }
        return { inserted, updated };
    }
    /**
     * 获取所有 Skills
     */
    async findAll(options) {
        let query = 'SELECT * FROM sync.skills';
        const params = [];
        if (options?.source) {
            query += ' WHERE source = $1';
            params.push(options.source);
        }
        query += ' ORDER BY stars DESC';
        if (options?.limit) {
            query += ` LIMIT $${params.length + 1}`;
            params.push(options.limit);
        }
        if (options?.offset) {
            query += ` OFFSET $${params.length + 1}`;
            params.push(options.offset);
        }
        const result = await this.getClient().query(query, params);
        return result.rows;
    }
    /**
     * 统计 Skills 数量
     */
    async count(options) {
        let query = 'SELECT COUNT(*) FROM sync.skills';
        const params = [];
        if (options?.source) {
            query += ' WHERE source = $1';
            params.push(options.source);
        }
        const result = await this.getClient().query(query, params);
        return parseInt(result.rows[0].count);
    }
    /**
     * v2.0: 事务支持
     */
    async beginTransaction() {
        await this.getClient().query('BEGIN');
    }
    async commitTransaction() {
        await this.getClient().query('COMMIT');
    }
    async rollbackTransaction() {
        await this.getClient().query('ROLLBACK');
    }
}
/**
 * 同步任务仓库类 v2.0
 */
export class SyncTaskRepository {
    client = null;
    async connect() {
        const pool = getPool();
        this.client = await pool.connect();
    }
    async disconnect() {
        if (this.client) {
            this.client.release();
            this.client = null;
        }
    }
    getClient() {
        if (!this.client) {
            throw new Error('Repository not connected. Call connect() first.');
        }
        return this.client;
    }
    /**
     * 创建同步任务
     */
    async create(data) {
        const result = await this.getClient().query(`
      INSERT INTO sync.sync_tasks (data_source_id, task_type, status, triggered_by, params)
      VALUES ($1, $2, 'pending', $3, $4)
      RETURNING id;
    `, [data.dataSourceId, data.taskType || 'skill_sync', data.triggeredBy || 'scheduler', JSON.stringify(data.params || {})]);
        return result.rows[0].id;
    }
    /**
     * 更新任务状态为运行中
     */
    async markAsRunning(id) {
        await this.getClient().query(`
      UPDATE sync.sync_tasks 
      SET status = 'running', started_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `, [id]);
    }
    /**
     * 更新任务进度
     */
    async updateProgress(id, data) {
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (data.processedRecords !== undefined) {
            updates.push(`processed_records = $${paramIndex++}`);
            values.push(data.processedRecords);
        }
        if (data.failedRecords !== undefined) {
            updates.push(`failed_records = $${paramIndex++}`);
            values.push(data.failedRecords);
        }
        if (data.skippedRecords !== undefined) {
            updates.push(`skipped_records = $${paramIndex++}`);
            values.push(data.skippedRecords);
        }
        values.push(id);
        await this.getClient().query(`UPDATE sync.sync_tasks SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
    }
    /**
     * 完成任务
     */
    async complete(id, result) {
        await this.getClient().query(`
      UPDATE sync.sync_tasks 
      SET 
        status = $1,
        completed_at = CURRENT_TIMESTAMP,
        duration_ms = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)) * 1000,
        total_records = $2,
        processed_records = $3,
        failed_records = $4,
        skipped_records = $5,
        error_message = $6
      WHERE id = $7;
    `, [
            result.status,
            result.totalRecords,
            result.processedRecords,
            result.failedRecords,
            result.skippedRecords,
            result.errorMessage || null,
            id,
        ]);
    }
    /**
     * 获取任务详情
     */
    async findById(id) {
        const result = await this.getClient().query('SELECT * FROM sync.sync_tasks WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
}
//# sourceMappingURL=repository.js.map