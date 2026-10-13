-- ============================================================
-- Aidean AI模型天梯图平台 - 约束创建脚本
-- 05_create_constraints.sql
-- 功能：创建所有外键约束和检查约束
-- 环境：PostgreSQL 16+
-- ============================================================

-- ============================================================
-- 1. 用户域外键
-- ============================================================

-- 订阅表外键
ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_order
    FOREIGN KEY (order_id) REFERENCES recharge_orders(id) ON DELETE SET NULL;

-- ============================================================
-- 2. 模型域外键
-- ============================================================

-- 模型表外键
ALTER TABLE models ADD CONSTRAINT fk_models_provider
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT;

-- 模型价格表外键
ALTER TABLE model_prices ADD CONSTRAINT fk_model_prices_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;

-- 模型评分表外键
ALTER TABLE model_scores ADD CONSTRAINT fk_model_scores_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;

-- 基准测试表外键
ALTER TABLE benchmarks ADD CONSTRAINT fk_benchmarks_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;

-- 天梯排名表外键
ALTER TABLE ladder_rankings ADD CONSTRAINT fk_ladder_rankings_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;

-- ============================================================
-- 3. 测评域外键
-- ============================================================

-- 测评任务表外键
ALTER TABLE evaluations ADD CONSTRAINT fk_evaluations_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 测评结果表外键
ALTER TABLE evaluation_results ADD CONSTRAINT fk_eval_results_evaluation
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE;

ALTER TABLE evaluation_results ADD CONSTRAINT fk_eval_results_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE RESTRICT;

-- 测评模型关联表外键
ALTER TABLE evaluation_models ADD CONSTRAINT fk_eval_models_evaluation
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE;

ALTER TABLE evaluation_models ADD CONSTRAINT fk_eval_models_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE RESTRICT;

-- ============================================================
-- 4. 财务域外键
-- ============================================================

-- 交易记录表外键
ALTER TABLE transactions ADD CONSTRAINT fk_transactions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 充值订单表外键
ALTER TABLE recharge_orders ADD CONSTRAINT fk_recharge_orders_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE recharge_orders ADD CONSTRAINT fk_recharge_orders_transaction
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;

-- ============================================================
-- 5. 收藏域外键
-- ============================================================

-- 收藏表外键
ALTER TABLE favorites ADD CONSTRAINT fk_favorites_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 6. 扩展天图表外键
-- ============================================================

-- API站模型关联表外键
ALTER TABLE api_station_models ADD CONSTRAINT fk_api_station_models_station
    FOREIGN KEY (station_id) REFERENCES api_stations(id) ON DELETE CASCADE;

ALTER TABLE api_station_models ADD CONSTRAINT fk_api_station_models_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE RESTRICT;

-- ============================================================
-- 7. 系统管理域外键
-- ============================================================

-- 脚本执行记录表外键
ALTER TABLE script_executions ADD CONSTRAINT fk_executions_script
    FOREIGN KEY (script_id) REFERENCES scheduled_scripts(id) ON DELETE CASCADE;

-- ============================================================
-- 8. 余额检查约束
-- ============================================================

-- 确保用户余额不为负
ALTER TABLE users ADD CONSTRAINT chk_users_balance_non_negative
    CHECK (balance >= 0);

-- 交易金额不能为0
ALTER TABLE transactions ADD CONSTRAINT chk_transactions_amount_non_zero
    CHECK (amount != 0);

-- 交易前后余额必须匹配
ALTER TABLE transactions ADD CONSTRAINT chk_transactions_balance_match
    CHECK (balance_after = balance_before + amount);

-- 充值金额必须为正
ALTER TABLE recharge_orders ADD CONSTRAINT chk_recharge_amount_positive
    CHECK (amount > 0);

-- 订阅结束时间必须晚于开始时间
ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_date_order
    CHECK (expire_at > start_at);

-- 价格必须非负
ALTER TABLE model_prices ADD CONSTRAINT chk_model_prices_non_negative
    CHECK (input_price >= 0 AND output_price >= 0 AND cache_hit_price >= 0);

-- 评分必须在0-100之间
ALTER TABLE model_scores ADD CONSTRAINT chk_model_scores_range
    CHECK (
        (official_score IS NULL OR (official_score >= 0 AND official_score <= 100)) AND
        (practical_score IS NULL OR (practical_score >= 0 AND practical_score <= 100)) AND
        (reputation_score IS NULL OR (reputation_score >= 0 AND reputation_score <= 100)) AND
        (self_test_score IS NULL OR (self_test_score >= 0 AND self_test_score <= 100)) AND
        (total_score IS NULL OR (total_score >= 0 AND total_score <= 100))
    );

-- 基准测试分数必须非负
ALTER TABLE benchmarks ADD CONSTRAINT chk_benchmarks_score_non_negative
    CHECK (score >= 0);

-- 排名必须为正
ALTER TABLE ladder_rankings ADD CONSTRAINT chk_ladder_rank_positive
    CHECK (rank > 0);

-- ============================================================
-- 6. 数据审计域外键约束
-- ============================================================

-- 变更日志关联模型
ALTER TABLE model_change_logs ADD CONSTRAINT fk_change_logs_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;

-- 变更日志关联同步批次
ALTER TABLE model_change_logs ADD CONSTRAINT fk_change_logs_batch
    FOREIGN KEY (sync_batch_id) REFERENCES sync_batches(id) ON DELETE SET NULL;

-- 自定义指标值关联指标
ALTER TABLE custom_metric_values ADD CONSTRAINT fk_metric_values_metric
    FOREIGN KEY (metric_id) REFERENCES custom_metrics(id) ON DELETE CASCADE;

-- 自定义指标值关联模型
ALTER TABLE custom_metric_values ADD CONSTRAINT fk_metric_values_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;

-- 同步批次操作人
ALTER TABLE sync_batches ADD CONSTRAINT fk_sync_batches_operator
    FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL;

-- 变更日志操作人
ALTER TABLE model_change_logs ADD CONSTRAINT fk_change_logs_operator
    FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL;

-- 自定义指标创建者
ALTER TABLE custom_metrics ADD CONSTRAINT fk_custom_metrics_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- 7. 资源管理扩展域外键约束
-- ============================================================

-- 厂商关系
ALTER TABLE vendor_relations ADD CONSTRAINT fk_vendor_rel_parent
    FOREIGN KEY (parent_vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;
ALTER TABLE vendor_relations ADD CONSTRAINT fk_vendor_rel_child
    FOREIGN KEY (child_vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;

-- 模型版本
ALTER TABLE model_versions ADD CONSTRAINT fk_model_versions_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;
ALTER TABLE model_versions ADD CONSTRAINT fk_model_versions_parent
    FOREIGN KEY (parent_model_id) REFERENCES models(id) ON DELETE SET NULL;

-- 用户收藏
ALTER TABLE user_collections ADD CONSTRAINT fk_collections_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 价格提醒
ALTER TABLE price_alerts ADD CONSTRAINT fk_price_alerts_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE price_alerts ADD CONSTRAINT fk_price_alerts_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;

-- API使用统计
ALTER TABLE model_api_usage ADD CONSTRAINT fk_api_usage_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;
ALTER TABLE model_api_usage ADD CONSTRAINT fk_api_usage_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 资源访问日志
ALTER TABLE resource_access_logs ADD CONSTRAINT fk_access_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 资源标签关联
ALTER TABLE resource_tags ADD CONSTRAINT fk_resource_tags_tag
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;
