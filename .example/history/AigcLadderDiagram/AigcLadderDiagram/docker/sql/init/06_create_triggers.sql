-- ============================================================
-- Aidean AI模型天梯图平台 - 触发器创建脚本
-- 06_create_triggers.sql
-- 功能：创建自动更新、审计、全文搜索触发器
-- 环境：PostgreSQL 16+
-- ============================================================

-- ============================================================
-- 1. 自动更新 updated_at 和 version 触发器
-- ============================================================

-- 创建触发器函数
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_update_timestamp IS '自动更新updated_at和version字段';

-- 为所有表创建触发器
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'users', 'subscriptions', 'providers', 'models', 'model_prices',
        'model_scores', 'benchmarks', 'ladder_rankings', 'ladder_configs',
        'evaluations', 'evaluation_results', 'evaluation_models',
        'transactions', 'recharge_orders', 'favorites',
        'skills', 'mcp_servers', 'agents', 'api_stations', 'api_station_models',
        'feature_flags', 'scheduled_scripts', 'script_executions',
        'audit_logs', 'dict_items', 'system_configs', 'news',
        'sync_batches', 'custom_metrics', 'custom_metric_values',
        'vendor_relations', 'model_versions', 'user_collections', 'price_alerts',
        'model_api_usage', 'resource_access_logs', 'tags', 'resource_tags',
        'roles', 'permissions', 'user_roles', 'role_permissions',
        'departments', 'teams', 'team_members',
        'subscription_plans', 'user_quotas'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format('
            CREATE TRIGGER trg_update_timestamp_%I
            BEFORE UPDATE ON %I
            FOR EACH ROW
            WHEN (OLD.* IS DISTINCT FROM NEW.*)
            EXECUTE FUNCTION fn_update_timestamp()
        ', tbl, tbl);
    END LOOP;
END
$$;

-- ============================================================
-- 2. 审计日志触发器
-- ============================================================

-- 创建审计日志函数
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[];
    key TEXT;
BEGIN
    -- 获取旧数据和新数据
    IF TG_OP = 'DELETE' THEN
        old_data = to_jsonb(OLD);
        new_data = NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        old_data = to_jsonb(OLD);
        new_data = to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        old_data = NULL;
        new_data = to_jsonb(NEW);
    END IF;

    -- 计算变更字段
    IF TG_OP = 'UPDATE' AND old_data IS NOT NULL AND new_data IS NOT NULL THEN
        changed_fields := ARRAY[]::TEXT[];
        FOR key IN SELECT jsonb_object_keys(new_data)
        LOOP
            IF old_data->key IS DISTINCT FROM new_data->key THEN
                changed_fields := array_append(changed_fields, key);
            END IF;
        END LOOP;
    END IF;

    -- 插入审计日志
    INSERT INTO audit_logs (
        id,
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        changed_fields,
        actor_id,
        actor_ip,
        created_at,
        updated_at,
        is_active,
        version,
        tenant_id
    ) VALUES (
        -- 使用Snowflake ID (这里用序列模拟，实际由应用生成)
        EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 + (RANDOM() * 1000)::BIGINT,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE TG_OP
            WHEN 'INSERT' THEN 1
            WHEN 'UPDATE' THEN 2
            WHEN 'DELETE' THEN 3
        END,
        old_data,
        new_data,
        changed_fields,
        NULL, -- actor_id 由应用设置
        NULL, -- actor_ip 由应用设置
        NOW(),
        NOW(),
        TRUE,
        1,
        COALESCE(NEW.tenant_id, OLD.tenant_id, 0)
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_audit_log IS '审计日志触发器函数，记录所有数据变更';

-- 为关键业务表创建审计触发器
DO $$
DECLARE
    tbl TEXT;
    audit_tables TEXT[] := ARRAY[
        'users', 'providers', 'models', 'model_prices', 'model_scores',
        'benchmarks', 'ladder_rankings', 'ladder_configs',
        'evaluations', 'evaluation_results',
        'transactions', 'recharge_orders', 'subscriptions',
        'favorites', 'skills', 'mcp_servers', 'agents',
        'api_stations', 'api_station_models',
        'feature_flags', 'scheduled_scripts', 'system_configs', 'news'
    ];
BEGIN
    FOREACH tbl IN ARRAY audit_tables
    LOOP
        EXECUTE format('
            CREATE TRIGGER trg_audit_%I
            AFTER INSERT OR UPDATE OR DELETE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION fn_audit_log()
        ', tbl, tbl);
    END LOOP;
END
$$;

-- ============================================================
-- 3. 全文搜索向量更新触发器
-- ============================================================

-- 创建全文搜索更新函数
CREATE OR REPLACE FUNCTION fn_update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    -- 根据表名组合搜索字段
    CASE TG_TABLE_NAME
        WHEN 'users' THEN
            NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.nickname, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.email, '')), 'B') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.search_text, '')), 'C');
        WHEN 'providers' THEN
            NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.name_en, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.name_zh, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.search_text, '')), 'C');
        WHEN 'models' THEN
            NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.name_en, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.name_zh, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.params, '')), 'B') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.search_text, '')), 'C');
        WHEN 'skills' THEN
            NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.search_text, '')), 'C');
        WHEN 'mcp_servers' THEN
            NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.search_text, '')), 'C');
        WHEN 'agents' THEN
            NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.search_text, '')), 'C');
        WHEN 'api_stations' THEN
            NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.name_en, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.search_text, '')), 'C');
        WHEN 'news' THEN
            NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.title_en, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.summary, '')), 'B') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.content, '')), 'C') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.search_text, '')), 'D');
        ELSE
            -- 默认处理
            NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.search_text, '')), 'C');
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_update_search_vector IS '全文搜索向量自动更新函数';

-- 为有search_vector的表创建触发器
DO $$
DECLARE
    tbl TEXT;
    search_tables TEXT[] := ARRAY[
        'users', 'providers', 'models', 'skills', 'mcp_servers',
        'agents', 'api_stations', 'news'
    ];
BEGIN
    FOREACH tbl IN ARRAY search_tables
    LOOP
        EXECUTE format('
            CREATE TRIGGER trg_search_vector_%I
            BEFORE INSERT OR UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION fn_update_search_vector()
        ', tbl, tbl);
    END LOOP;
END
$$;

-- ============================================================
-- 4. 软删除触发器 (级联标记)
-- ============================================================

-- 创建软删除函数
CREATE OR REPLACE FUNCTION fn_soft_delete_cascade()
RETURNS TRIGGER AS $$
BEGIN
    -- 根据表名执行级联软删除
    CASE TG_TABLE_NAME
        WHEN 'providers' THEN
            UPDATE models SET deleted_at = NEW.deleted_at, updated_at = NOW()
            WHERE provider_id = OLD.id AND deleted_at IS NULL;
        WHEN 'models' THEN
            UPDATE model_prices SET deleted_at = NEW.deleted_at, updated_at = NOW()
            WHERE model_id = OLD.id AND deleted_at IS NULL;
            UPDATE model_scores SET deleted_at = NEW.deleted_at, updated_at = NOW()
            WHERE model_id = OLD.id AND deleted_at IS NULL;
            UPDATE benchmarks SET deleted_at = NEW.deleted_at, updated_at = NOW()
            WHERE model_id = OLD.id AND deleted_at IS NULL;
            UPDATE ladder_rankings SET deleted_at = NEW.deleted_at, updated_at = NOW()
            WHERE model_id = OLD.id AND deleted_at IS NULL;
        WHEN 'evaluations' THEN
            UPDATE evaluation_results SET deleted_at = NEW.deleted_at, updated_at = NOW()
            WHERE evaluation_id = OLD.id AND deleted_at IS NULL;
            UPDATE evaluation_models SET deleted_at = NEW.deleted_at, updated_at = NOW()
            WHERE evaluation_id = OLD.id AND deleted_at IS NULL;
        WHEN 'api_stations' THEN
            UPDATE api_station_models SET deleted_at = NEW.deleted_at, updated_at = NOW()
            WHERE station_id = OLD.id AND deleted_at IS NULL;
        WHEN 'scheduled_scripts' THEN
            UPDATE script_executions SET deleted_at = NEW.deleted_at, updated_at = NOW()
            WHERE script_id = OLD.id AND deleted_at IS NULL;
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_soft_delete_cascade IS '软删除级联触发器函数';

-- 为关键表创建软删除触发器
DO $$
DECLARE
    tbl TEXT;
    cascade_tables TEXT[] := ARRAY[
        'providers', 'models', 'evaluations', 'api_stations', 'scheduled_scripts'
    ];
BEGIN
    FOREACH tbl IN ARRAY cascade_tables
    LOOP
        EXECUTE format('
            CREATE TRIGGER trg_soft_delete_%I
            AFTER UPDATE ON %I
            FOR EACH ROW
            WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
            EXECUTE FUNCTION fn_soft_delete_cascade()
        ', tbl, tbl);
    END LOOP;
END
$$;

-- ============================================================
-- 5. 访问计数自动更新触发器
-- ============================================================

CREATE OR REPLACE FUNCTION fn_increment_access_count()
RETURNS TRIGGER AS $$
BEGIN
    -- 根据目标类型更新对应表的访问计数
    CASE NEW.target_type
        WHEN 1 THEN -- 模型
            UPDATE models SET access_count = access_count + 1, last_accessed_at = NOW(),
                              popularity_score = popularity_score + 0.1
            WHERE id = NEW.target_id AND is_active = true;
        WHEN 2 THEN -- Skill
            UPDATE skills SET access_count = access_count + 1, last_accessed_at = NOW(),
                              popularity_score = popularity_score + 0.1
            WHERE id = NEW.target_id AND is_active = true;
        WHEN 3 THEN -- MCP
            UPDATE mcp_servers SET access_count = access_count + 1, last_accessed_at = NOW(),
                                   popularity_score = popularity_score + 0.1
            WHERE id = NEW.target_id AND is_active = true;
        WHEN 4 THEN -- Agent
            UPDATE agents SET access_count = access_count + 1, last_accessed_at = NOW(),
                              popularity_score = popularity_score + 0.1
            WHERE id = NEW.target_id AND is_active = true;
        WHEN 5 THEN -- API站
            UPDATE api_stations SET access_count = access_count + 1, last_accessed_at = NOW(),
                                    popularity_score = popularity_score + 0.1
            WHERE id = NEW.target_id AND is_active = true;
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_increment_access_count IS '收藏时自动增加目标访问计数';

CREATE TRIGGER trg_favorite_access_count
    AFTER INSERT ON favorites
    FOR EACH ROW
    EXECUTE FUNCTION fn_increment_access_count();
