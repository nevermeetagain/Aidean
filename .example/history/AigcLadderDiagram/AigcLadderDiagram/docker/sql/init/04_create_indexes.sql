-- ============================================================
-- Aidean AI模型天梯图平台 - 索引创建脚本
-- 04_create_indexes.sql
-- 功能：为所有表创建完整索引，覆盖所有查询场景
-- 环境：PostgreSQL 16+
-- ============================================================

-- ============================================================
-- 1. 用户表索引
-- ============================================================

-- 主键索引 (自动创建)
-- 邮箱唯一索引 (软删除条件)
CREATE UNIQUE INDEX idx_users_email_unique ON users(email) WHERE deleted_at IS NULL AND email IS NOT NULL;
COMMENT ON INDEX idx_users_email_unique IS '用户邮箱唯一索引';

-- 租户+状态复合索引
CREATE INDEX idx_users_tenant_status ON users(tenant_id, status) WHERE is_active = true;
COMMENT ON INDEX idx_users_tenant_status IS '租户+状态复合索引';

-- 登录时间索引
CREATE INDEX idx_users_last_login ON users(last_login_at) WHERE last_login_at IS NOT NULL;
COMMENT ON INDEX idx_users_last_login IS '最后登录时间索引';

-- 全文搜索索引
CREATE INDEX idx_users_search ON users USING GIN(search_vector);
COMMENT ON INDEX idx_users_search IS '用户全文搜索GIN索引';

-- 覆盖索引 (常用查询字段)
CREATE INDEX idx_users_covering ON users(tenant_id, status, role) INCLUDE (nickname, email, balance) WHERE is_active = true;
COMMENT ON INDEX idx_users_covering IS '用户覆盖索引';

-- ============================================================
-- 2. 模型商表索引
-- ============================================================

-- Slug唯一索引
CREATE UNIQUE INDEX idx_providers_slug_unique ON providers(slug) WHERE deleted_at IS NULL;
COMMENT ON INDEX idx_providers_slug_unique IS '模型商slug唯一索引';

-- 排序+状态索引
CREATE INDEX idx_providers_sort ON providers(sort_order, status) WHERE is_active = true;
COMMENT ON INDEX idx_providers_sort IS '模型商排序+状态索引';

-- 名称模糊搜索索引
CREATE INDEX idx_providers_name_trgm ON providers USING GIN(name gin_trgm_ops);
COMMENT ON INDEX idx_providers_name_trgm IS '模型商名称模糊搜索索引';

-- 全文搜索索引
CREATE INDEX idx_providers_search ON providers USING GIN(search_vector);
COMMENT ON INDEX idx_providers_search IS '模型商全文搜索GIN索引';

-- ============================================================
-- 3. 模型表索引
-- ============================================================

-- Slug唯一索引
CREATE UNIQUE INDEX idx_models_slug_unique ON models(slug) WHERE deleted_at IS NULL;
COMMENT ON INDEX idx_models_slug_unique IS '模型slug唯一索引';

-- 厂商+状态索引
CREATE INDEX idx_models_provider_status ON models(provider_id, status) WHERE is_active = true;
COMMENT ON INDEX idx_models_provider_status IS '模型厂商+状态复合索引';

-- 类型+分类复合索引
CREATE INDEX idx_models_type_category ON models(type, category) WHERE is_active = true AND deleted_at IS NULL;
COMMENT ON INDEX idx_models_type_category IS '模型类型+分类复合索引';

-- 开源+状态索引
CREATE INDEX idx_models_open_source ON models(is_open_source, status) WHERE is_active = true;
COMMENT ON INDEX idx_models_open_source IS '模型开源+状态索引';

-- 协议索引
CREATE INDEX idx_models_protocol ON models(protocol) WHERE is_active = true AND protocol IS NOT NULL;
COMMENT ON INDEX idx_models_protocol IS '模型协议索引';

-- 上下文长度BRIN索引 (大范围查询优化)
CREATE INDEX idx_models_context_brin ON models USING BRIN(context_length);
COMMENT ON INDEX idx_models_context_brin IS '模型上下文长度BRIN索引';

-- 名称模糊搜索索引
CREATE INDEX idx_models_name_trgm ON models USING GIN(name gin_trgm_ops);
COMMENT ON INDEX idx_models_name_trgm IS '模型名称模糊搜索索引';

-- 标签数组GIN索引
CREATE INDEX idx_models_tags_gin ON models USING GIN(tags);
COMMENT ON INDEX idx_models_tags_gin IS '模型标签数组GIN索引';

-- 全文搜索索引
CREATE INDEX idx_models_search ON models USING GIN(search_vector);
COMMENT ON INDEX idx_models_search IS '模型全文搜索GIN索引';

-- 热度排序索引
CREATE INDEX idx_models_popularity ON models(popularity_score DESC) WHERE is_active = true AND status = 1;
COMMENT ON INDEX idx_models_popularity IS '模型热度排序索引';

-- ============================================================
-- 4. 模型价格表索引
-- ============================================================

-- 模型+生效时间索引
CREATE INDEX idx_model_prices_model_effective ON model_prices(model_id, effective_date DESC) WHERE is_active = true;
COMMENT ON INDEX idx_model_prices_model_effective IS '模型价格模型+生效时间索引';

-- 有效期范围索引
CREATE INDEX idx_model_prices_date_range ON model_prices(effective_date, expiry_date) WHERE is_active = true AND expiry_date IS NOT NULL;
COMMENT ON INDEX idx_model_prices_date_range IS '模型价格有效期范围索引';

-- 来源索引
CREATE INDEX idx_model_prices_source ON model_prices(source) WHERE is_active = true AND source IS NOT NULL;
COMMENT ON INDEX idx_model_prices_source IS '模型价格来源索引';

-- ============================================================
-- 5. 模型评分表索引
-- ============================================================

-- 模型唯一索引 (最新评分)
CREATE UNIQUE INDEX idx_model_scores_model_unique ON model_scores(model_id) WHERE is_active = true AND deleted_at IS NULL;
COMMENT ON INDEX idx_model_scores_model_unique IS '模型评分模型唯一索引';

-- 总分排序索引
CREATE INDEX idx_model_scores_total ON model_scores(total_score DESC) WHERE is_active = true;
COMMENT ON INDEX idx_model_scores_total IS '模型评分总分排序索引';

-- 计算时间索引
CREATE INDEX idx_model_scores_calculated ON model_scores(calculated_at DESC);
COMMENT ON INDEX idx_model_scores_calculated IS '模型评分计算时间索引';

-- ============================================================
-- 6. 基准测试表索引
-- ============================================================

-- 模型+测试名称复合索引
CREATE INDEX idx_benchmarks_model_name ON benchmarks(model_id, benchmark_name) WHERE is_active = true;
COMMENT ON INDEX idx_benchmarks_model_name IS '基准测试模型+名称复合索引';

-- 测试名称索引
CREATE INDEX idx_benchmarks_name ON benchmarks(benchmark_name) WHERE is_active = true;
COMMENT ON INDEX idx_benchmarks_name IS '基准测试名称索引';

-- 来源索引
CREATE INDEX idx_benchmarks_source ON benchmarks(source) WHERE is_active = true AND source IS NOT NULL;
COMMENT ON INDEX idx_benchmarks_source IS '基准测试来源索引';

-- 记录时间BRIN索引
CREATE INDEX idx_benchmarks_recorded_brin ON benchmarks USING BRIN(recorded_at);
COMMENT ON INDEX idx_benchmarks_recorded_brin IS '基准测试记录时间BRIN索引';

-- JSONB GIN索引
CREATE INDEX idx_benchmarks_raw_data_gin ON benchmarks USING GIN(raw_data jsonb_path_ops);
COMMENT ON INDEX idx_benchmarks_raw_data_gin IS '基准测试原始数据JSONB GIN索引';

-- ============================================================
-- 7. 天梯排名表索引
-- ============================================================

-- 榜单类型+排名复合索引
CREATE INDEX idx_ladder_type_rank ON ladder_rankings(ladder_type, rank) WHERE is_active = true;
COMMENT ON INDEX idx_ladder_type_rank IS '天梯排名榜单类型+排名复合索引';

-- 模型+榜单类型索引
CREATE INDEX idx_ladder_model_type ON ladder_rankings(model_id, ladder_type) WHERE is_active = true;
COMMENT ON INDEX idx_ladder_model_type IS '天梯排名模型+榜单类型索引';

-- 快照日期索引
CREATE INDEX idx_ladder_snapshot ON ladder_rankings(snapshot_date DESC);
COMMENT ON INDEX idx_ladder_snapshot IS '天梯排名快照日期索引';

-- 最新快照+榜单类型覆盖索引
CREATE INDEX idx_ladder_latest ON ladder_rankings(ladder_type, snapshot_date DESC) INCLUDE (model_id, rank, score) WHERE is_active = true;
COMMENT ON INDEX idx_ladder_latest IS '天梯排名最新快照覆盖索引';

-- 状态索引
CREATE INDEX idx_ladder_status ON ladder_rankings(status) WHERE is_active = true;
COMMENT ON INDEX idx_ladder_status IS '天梯排名状态索引';

-- ============================================================
-- 8. 天梯配置表索引
-- ============================================================

-- 配置键唯一索引
CREATE UNIQUE INDEX idx_ladder_configs_key_unique ON ladder_configs(config_key) WHERE deleted_at IS NULL;
COMMENT ON INDEX idx_ladder_configs_key_unique IS '天梯配置键唯一索引';

-- ============================================================
-- 9. 测评任务表索引
-- ============================================================

-- 用户+状态复合索引
CREATE INDEX idx_evaluations_user_status ON evaluations(user_id, status) WHERE is_active = true;
COMMENT ON INDEX idx_evaluations_user_status IS '测评任务用户+状态复合索引';

-- 创建时间BRIN索引
CREATE INDEX idx_evaluations_created_brin ON evaluations USING BRIN(created_at);
COMMENT ON INDEX idx_evaluations_created_brin IS '测评任务创建时间BRIN索引';

-- 付费状态索引
CREATE INDEX idx_evaluations_paid ON evaluations(is_paid, status) WHERE is_active = true;
COMMENT ON INDEX idx_evaluations_paid IS '测评任务付费状态索引';

-- 全文搜索索引 (prompt)
CREATE INDEX idx_evaluations_search ON evaluations USING GIN(search_vector);
COMMENT ON INDEX idx_evaluations_search IS '测评任务全文搜索GIN索引';

-- 评测类型索引
CREATE INDEX idx_evaluations_type ON evaluations(eval_type) WHERE is_active = true;
COMMENT ON INDEX idx_evaluations_type IS '评测类型索引';

-- 进度索引
CREATE INDEX idx_evaluations_progress ON evaluations(progress) WHERE status = 1; -- status=1 执行中
COMMENT ON INDEX idx_evaluations_progress IS '评测进度索引（查询进行中的任务）';

-- 胜出模型索引
CREATE INDEX idx_evaluations_winner ON evaluations(winner_model_id) WHERE winner_model_id IS NOT NULL;
COMMENT ON INDEX idx_evaluations_winner IS '评测胜出模型索引';

-- ============================================================
-- 10. 测评结果表索引
-- ============================================================

-- 测评任务+模型复合索引
CREATE INDEX idx_eval_results_eval_model ON evaluation_results(evaluation_id, model_id) WHERE is_active = true;
COMMENT ON INDEX idx_eval_results_eval_model IS '测评结果测评任务+模型复合索引';

-- 状态索引
CREATE INDEX idx_eval_results_status ON evaluation_results(status) WHERE is_active = true;
COMMENT ON INDEX idx_eval_results_status IS '测评结果状态索引';

-- ============================================================
-- 11. 测评模型关联表索引
-- ============================================================

-- 测评任务索引
CREATE INDEX idx_eval_models_eval ON evaluation_models(evaluation_id) WHERE is_active = true;
COMMENT ON INDEX idx_eval_models_eval IS '测评模型关联测评任务索引';

-- 模型索引
CREATE INDEX idx_eval_models_model ON evaluation_models(model_id) WHERE is_active = true;
COMMENT ON INDEX idx_eval_models_model IS '测评模型关联模型索引';

-- 唯一约束
CREATE UNIQUE INDEX idx_eval_models_unique ON evaluation_models(evaluation_id, model_id) WHERE deleted_at IS NULL;
COMMENT ON INDEX idx_eval_models_unique IS '测评模型关联唯一索引';

-- 状态索引
CREATE INDEX idx_eval_models_status ON evaluation_models(status);
COMMENT ON INDEX idx_eval_models_status IS '测评模型结果状态索引';

-- 评分索引
CREATE INDEX idx_eval_models_score ON evaluation_models(score DESC) WHERE score IS NOT NULL;
COMMENT ON INDEX idx_eval_models_score IS '测评模型评分排序索引';

-- 延迟索引
CREATE INDEX idx_eval_models_latency ON evaluation_models(latency_ms) WHERE latency_ms IS NOT NULL;
COMMENT ON INDEX idx_eval_models_latency IS '测评模型响应延迟索引';

-- 多维度评分复合索引
CREATE INDEX idx_eval_model_scores ON evaluation_models(score, accuracy_score, relevance_score) WHERE score IS NOT NULL;
COMMENT ON INDEX idx_eval_model_scores IS '测评模型多维度评分复合索引';

-- ============================================================
-- 12. 交易记录表索引
-- ============================================================

-- 用户+创建时间复合索引 (分页查询)
CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at DESC) WHERE is_active = true;
COMMENT ON INDEX idx_transactions_user_created IS '交易记录用户+创建时间复合索引';

-- 交易类型索引
CREATE INDEX idx_transactions_type ON transactions(type) WHERE is_active = true;
COMMENT ON INDEX idx_transactions_type IS '交易记录类型索引';

-- 引用类型+引用ID复合索引
CREATE INDEX idx_transactions_ref ON transactions(ref_type, ref_id) WHERE is_active = true AND ref_type IS NOT NULL;
COMMENT ON INDEX idx_transactions_ref IS '交易记录引用复合索引';

-- 创建时间BRIN索引
CREATE INDEX idx_transactions_created_brin ON transactions USING BRIN(created_at);
COMMENT ON INDEX idx_transactions_created_brin IS '交易记录创建时间BRIN索引';

-- ============================================================
-- 13. 充值订单表索引
-- ============================================================

-- 用户+状态复合索引
CREATE INDEX idx_recharge_user_status ON recharge_orders(user_id, status) WHERE is_active = true;
COMMENT ON INDEX idx_recharge_user_status IS '充值订单用户+状态复合索引';

-- 订单号唯一索引
CREATE UNIQUE INDEX idx_recharge_order_no_unique ON recharge_orders(order_no) WHERE deleted_at IS NULL;
COMMENT ON INDEX idx_recharge_order_no_unique IS '充值订单号唯一索引';

-- 支付状态索引
CREATE INDEX idx_recharge_paid ON recharge_orders(status) WHERE is_active = true AND status = 1;
COMMENT ON INDEX idx_recharge_paid IS '充值订单已支付状态索引';

-- 过期时间索引
CREATE INDEX idx_recharge_expire ON recharge_orders(expire_at) WHERE is_active = true AND status = 0;
COMMENT ON INDEX idx_recharge_expire IS '充值订单过期时间索引';

-- ============================================================
-- 14. 收藏表索引
-- ============================================================

-- 用户+类型复合索引
CREATE INDEX idx_favorites_user_type ON favorites(user_id, target_type) WHERE is_active = true;
COMMENT ON INDEX idx_favorites_user_type IS '收藏用户+类型复合索引';

-- 目标类型+目标ID复合索引
CREATE INDEX idx_favorites_target ON favorites(target_type, target_id) WHERE is_active = true;
COMMENT ON INDEX idx_favorites_target IS '收藏目标复合索引';

-- 用户+目标唯一索引
CREATE UNIQUE INDEX idx_favorites_user_target_unique ON favorites(user_id, target_type, target_id) WHERE deleted_at IS NULL;
COMMENT ON INDEX idx_favorites_user_target_unique IS '收藏用户+目标唯一索引';

-- 创建时间索引
CREATE INDEX idx_favorites_created ON favorites(created_at DESC) WHERE is_active = true;
COMMENT ON INDEX idx_favorites_created IS '收藏创建时间索引';

-- ============================================================
-- 15. Skill/MCP/Agent/API站索引
-- ============================================================

-- Skills
CREATE INDEX idx_skills_status ON skills(status) WHERE is_active = true;
CREATE INDEX idx_skills_install_count ON skills(install_count DESC) WHERE is_active = true;
CREATE INDEX idx_skills_name_trgm ON skills USING GIN(name gin_trgm_ops);
CREATE INDEX idx_skills_search ON skills USING GIN(search_vector);
CREATE INDEX idx_skills_tags_gin ON skills USING GIN(tags);

-- MCP Servers
CREATE INDEX idx_mcp_status ON mcp_servers(status) WHERE is_active = true;
CREATE INDEX idx_mcp_stability ON mcp_servers(stability_score DESC) WHERE is_active = true;
CREATE INDEX idx_mcp_name_trgm ON mcp_servers USING GIN(name gin_trgm_ops);
CREATE INDEX idx_mcp_search ON mcp_servers USING GIN(search_vector);

-- Agents
CREATE INDEX idx_agents_status ON agents(status) WHERE is_active = true;
CREATE INDEX idx_agents_activity ON agents(activity_score DESC) WHERE is_active = true;
CREATE INDEX idx_agents_name_trgm ON agents USING GIN(name gin_trgm_ops);
CREATE INDEX idx_agents_search ON agents USING GIN(search_vector);
CREATE INDEX idx_agents_capabilities_gin ON agents USING GIN(capabilities jsonb_path_ops);

-- API Stations
CREATE INDEX idx_api_stations_status ON api_stations(status) WHERE is_active = true;
CREATE INDEX idx_api_stations_name_trgm ON api_stations USING GIN(name gin_trgm_ops);
CREATE INDEX idx_api_stations_search ON api_stations USING GIN(search_vector);

-- API Station Models
CREATE INDEX idx_api_station_models_station ON api_station_models(station_id) WHERE is_active = true;
CREATE INDEX idx_api_station_models_model ON api_station_models(model_id) WHERE is_active = true;
CREATE UNIQUE INDEX idx_api_station_models_unique ON api_station_models(station_id, model_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 16. 系统管理表索引
-- ============================================================

-- Feature Flags
CREATE UNIQUE INDEX idx_feature_flags_key_unique ON feature_flags(key) WHERE deleted_at IS NULL;
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled) WHERE is_active = true;

-- Scheduled Scripts
CREATE INDEX idx_scripts_active ON scheduled_scripts(is_active) WHERE is_active = true;
CREATE INDEX idx_scripts_next_run ON scheduled_scripts(next_run_at) WHERE is_active = true AND next_run_at IS NOT NULL;

-- Script Executions
CREATE INDEX idx_executions_script ON script_executions(script_id, started_at DESC) WHERE is_active = true;
CREATE INDEX idx_executions_status ON script_executions(status) WHERE is_active = true;
CREATE INDEX idx_executions_started_brin ON script_executions USING BRIN(started_at);

-- Audit Logs (大表，使用BRIN)
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id) WHERE is_active = true;
CREATE INDEX idx_audit_logs_action ON audit_logs(action) WHERE is_active = true;
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id) WHERE is_active = true AND actor_id IS NOT NULL;
CREATE INDEX idx_audit_logs_created_brin ON audit_logs USING BRIN(created_at);

-- Dict Items
CREATE INDEX idx_dict_category_code ON dict_items(category, code) WHERE is_active = true;
CREATE INDEX idx_dict_category_sort ON dict_items(category, sort_order) WHERE is_active = true;

-- System Configs
CREATE UNIQUE INDEX idx_system_configs_key_unique ON system_configs(config_key) WHERE deleted_at IS NULL;

-- News
CREATE INDEX idx_news_status_published ON news(status, published_at DESC) WHERE is_active = true AND status = 1;
CREATE INDEX idx_news_title_trgm ON news USING GIN(title gin_trgm_ops);
CREATE INDEX idx_news_search ON news USING GIN(search_vector);
CREATE INDEX idx_news_tags_gin ON news USING GIN(tags);

-- ============================================================
-- Audit & Rollback Domain
-- ============================================================

-- Sync Batches
CREATE UNIQUE INDEX idx_sync_batches_code ON sync_batches(batch_code);
CREATE INDEX idx_sync_batches_status ON sync_batches(status, created_at DESC);
CREATE INDEX idx_sync_batches_operator ON sync_batches(operator_id) WHERE operator_id IS NOT NULL;

-- Model Change Logs
CREATE INDEX idx_change_logs_model ON model_change_logs(model_id, created_at DESC);
CREATE INDEX idx_change_logs_batch ON model_change_logs(sync_batch_id) WHERE sync_batch_id IS NOT NULL;
CREATE INDEX idx_change_logs_type ON model_change_logs(change_type, created_at);
CREATE INDEX idx_change_logs_reverted ON model_change_logs(is_reverted) WHERE is_reverted = TRUE;
CREATE INDEX idx_change_logs_validation ON model_change_logs(validation_status);

-- Custom Metrics
CREATE UNIQUE INDEX idx_custom_metrics_code ON custom_metrics(metric_code);
CREATE INDEX idx_custom_metrics_user ON custom_metrics(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_custom_metrics_active ON custom_metrics(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_custom_metrics_status ON custom_metrics(status);
CREATE INDEX idx_custom_metrics_frequency ON custom_metrics(calc_frequency);

-- Custom Metric Values
CREATE INDEX idx_metric_values_metric ON custom_metric_values(metric_id, rank_position) WHERE rank_position IS NOT NULL;
CREATE INDEX idx_metric_values_model ON custom_metric_values(model_id);
CREATE INDEX idx_metric_values_expires ON custom_metric_values(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_metric_values_status ON custom_metric_values(status);

-- ============================================================
-- Resource Management Extensions
-- ============================================================

-- Vendor Relations
CREATE INDEX idx_vendor_relations_parent ON vendor_relations(parent_vendor_id);
CREATE INDEX idx_vendor_relations_child ON vendor_relations(child_vendor_id);
CREATE INDEX idx_vendor_relations_current ON vendor_relations(is_current) WHERE is_current = TRUE;

-- Model Versions
CREATE INDEX idx_model_versions_model ON model_versions(model_id);
CREATE INDEX idx_model_versions_parent ON model_versions(parent_model_id);

-- User Collections
CREATE INDEX idx_collections_user ON user_collections(user_id);
CREATE INDEX idx_collections_type ON user_collections(collection_type);
CREATE INDEX idx_collections_public ON user_collections(is_public) WHERE is_public = TRUE;

-- Price Alerts
CREATE INDEX idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_model ON price_alerts(model_id);
CREATE INDEX idx_price_alerts_triggered ON price_alerts(is_triggered) WHERE is_triggered = FALSE;

-- Model API Usage
CREATE INDEX idx_api_usage_model ON model_api_usage(model_id);
CREATE INDEX idx_api_usage_user ON model_api_usage(user_id);
CREATE INDEX idx_api_usage_date ON model_api_usage(usage_date);

-- Resource Access Logs
CREATE INDEX idx_access_logs_user ON resource_access_logs(user_id);
CREATE INDEX idx_access_logs_resource ON resource_access_logs(resource_type, resource_id);
CREATE INDEX idx_access_logs_action ON resource_access_logs(action);
CREATE INDEX idx_access_logs_created ON resource_access_logs(created_at);

-- Tags
CREATE INDEX idx_tags_category ON tags(category);
CREATE INDEX idx_tags_active ON tags(is_active) WHERE is_active = TRUE;

-- Resource Tags
CREATE INDEX idx_resource_tags_tag ON resource_tags(tag_id);
CREATE INDEX idx_resource_tags_resource ON resource_tags(resource_type, resource_id);
