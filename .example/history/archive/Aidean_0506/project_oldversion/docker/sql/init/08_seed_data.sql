-- ============================================================
-- Aidean AI模型天梯图平台 - 种子数据脚本
-- 08_seed_data.sql
-- 功能：插入字典数据、初始功能开关、系统配置、示例数据
-- 环境：PostgreSQL 16+
-- ============================================================

-- ============================================================
-- 1. 字典数据
-- ============================================================

-- 用户角色字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(1, 'user_role', '0', '访客', 'Guest', 0, NOW(), NOW(), true, 1, 0),
(2, 'user_role', '1', '普通用户', 'User', 1, NOW(), NOW(), true, 1, 0),
(3, 'user_role', '2', '工具提供者', 'Provider', 2, NOW(), NOW(), true, 1, 0),
(4, 'user_role', '3', '管理员', 'Admin', 3, NOW(), NOW(), true, 1, 0),
(5, 'user_role', '99', '系统', 'System', 99, NOW(), NOW(), true, 1, 0);

-- 用户状态字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(6, 'user_status', '0', '禁用', 'Disabled', 0, NOW(), NOW(), true, 1, 0),
(7, 'user_status', '1', '正常', 'Active', 1, NOW(), NOW(), true, 1, 0),
(8, 'user_status', '2', '待验证', 'Pending', 2, NOW(), NOW(), true, 1, 0);

-- 模型类型字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(9, 'model_type', '0', '全部', 'All', 0, NOW(), NOW(), true, 1, 0),
(10, 'model_type', '1', '对话', 'Chat', 1, NOW(), NOW(), true, 1, 0),
(11, 'model_type', '2', '生图', 'Image Generation', 2, NOW(), NOW(), true, 1, 0),
(12, 'model_type', '3', '嵌入', 'Embedding', 3, NOW(), NOW(), true, 1, 0),
(13, 'model_type', '4', '重排序', 'Rerank', 4, NOW(), NOW(), true, 1, 0),
(14, 'model_type', '5', '语音', 'Audio', 5, NOW(), NOW(), true, 1, 0),
(15, 'model_type', '6', '视频', 'Video', 6, NOW(), NOW(), true, 1, 0),
(16, 'model_type', '7', '系统', 'System', 7, NOW(), NOW(), true, 1, 0),
(17, 'model_type', '8', '多模态', 'Multimodal', 8, NOW(), NOW(), true, 1, 0);

-- 模型分类字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(18, 'model_category', '1', '专业版', 'Professional', 1, NOW(), NOW(), true, 1, 0),
(19, 'model_category', '2', '应用版', 'Application', 2, NOW(), NOW(), true, 1, 0);

-- 模型协议字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(20, 'model_protocol', '0', '其他', 'Other', 0, NOW(), NOW(), true, 1, 0),
(21, 'model_protocol', '1', 'OpenAI', 'OpenAI', 1, NOW(), NOW(), true, 1, 0),
(22, 'model_protocol', '2', 'Anthropic', 'Anthropic', 2, NOW(), NOW(), true, 1, 0);

-- 模型状态字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(23, 'model_status', '0', '下架', 'Offline', 0, NOW(), NOW(), true, 1, 0),
(24, 'model_status', '1', '正常', 'Active', 1, NOW(), NOW(), true, 1, 0),
(25, 'model_status', '2', '测试中', 'Testing', 2, NOW(), NOW(), true, 1, 0);

-- 榜单类型字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(26, 'ladder_type', '1', '性能天梯图', 'Performance Ladder', 1, NOW(), NOW(), true, 1, 0),
(27, 'ladder_type', '2', '性价比排行', 'Cost-Performance Ranking', 2, NOW(), NOW(), true, 1, 0),
(28, 'ladder_type', '3', '开源模型榜', 'Open Source Ranking', 3, NOW(), NOW(), true, 1, 0),
(29, 'ladder_type', '4', '手机端模型榜', 'Mobile Model Ranking', 4, NOW(), NOW(), true, 1, 0);

-- 交易类型字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(30, 'transaction_type', '1', '充值', 'Recharge', 1, NOW(), NOW(), true, 1, 0),
(31, 'transaction_type', '2', '消费', 'Consumption', 2, NOW(), NOW(), true, 1, 0),
(32, 'transaction_type', '3', '退款', 'Refund', 3, NOW(), NOW(), true, 1, 0),
(33, 'transaction_type', '4', '系统调整', 'System Adjustment', 4, NOW(), NOW(), true, 1, 0);

-- 支付方式字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(34, 'pay_method', '1', '微信支付', 'WeChat Pay', 1, NOW(), NOW(), true, 1, 0),
(35, 'pay_method', '2', '支付宝', 'Alipay', 2, NOW(), NOW(), true, 1, 0);

-- 订单状态字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(36, 'order_status', '0', '待支付', 'Pending', 0, NOW(), NOW(), true, 1, 0),
(37, 'order_status', '1', '已支付', 'Paid', 1, NOW(), NOW(), true, 1, 0),
(38, 'order_status', '2', '已取消', 'Cancelled', 2, NOW(), NOW(), true, 1, 0),
(39, 'order_status', '3', '已退款', 'Refunded', 3, NOW(), NOW(), true, 1, 0);

-- 收藏类型字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(40, 'favorite_type', '1', '模型', 'Model', 1, NOW(), NOW(), true, 1, 0),
(41, 'favorite_type', '2', 'Skill', 'Skill', 2, NOW(), NOW(), true, 1, 0),
(42, 'favorite_type', '3', 'MCP', 'MCP', 3, NOW(), NOW(), true, 1, 0),
(43, 'favorite_type', '4', 'Agent', 'Agent', 4, NOW(), NOW(), true, 1, 0),
(44, 'favorite_type', '5', 'API站', 'API Station', 5, NOW(), NOW(), true, 1, 0);

-- 测评状态字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(45, 'evaluation_status', '0', '待执行', 'Pending', 0, NOW(), NOW(), true, 1, 0),
(46, 'evaluation_status', '1', '执行中', 'Running', 1, NOW(), NOW(), true, 1, 0),
(47, 'evaluation_status', '2', '已完成', 'Completed', 2, NOW(), NOW(), true, 1, 0),
(48, 'evaluation_status', '3', '失败', 'Failed', 3, NOW(), NOW(), true, 1, 0);

-- 订阅类型字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(49, 'subscription_plan', '1', '月度会员', 'Monthly', 1, NOW(), NOW(), true, 1, 0),
(50, 'subscription_plan', '2', '季度会员', 'Quarterly', 2, NOW(), NOW(), true, 1, 0),
(51, 'subscription_plan', '3', '年度会员', 'Yearly', 3, NOW(), NOW(), true, 1, 0);

-- ============================================================
-- 2. 功能开关
-- ============================================================

INSERT INTO feature_flags (id, key, name, enabled, config, created_at, updated_at, is_active, version, tenant_id) VALUES
(1001, 'ladder_performance', '性能天梯图', true, '{"description": "大模型性能天梯图"}', NOW(), NOW(), true, 1, 0),
(1002, 'ladder_cost_performance', '性价比排行', true, '{"description": "大模型性价比天梯图"}', NOW(), NOW(), true, 1, 0),
(1003, 'ladder_open_source', '开源模型榜', true, '{"description": "大模型开源天梯图"}', NOW(), NOW(), true, 1, 0),
(1004, 'ladder_mobile', '手机端模型榜', true, '{"description": "手机端大模型天梯图"}', NOW(), NOW(), true, 1, 0),
(1005, 'evaluation_free', '免费测评', true, '{"description": "免费查看历史测评数据"}', NOW(), NOW(), true, 1, 0),
(1006, 'evaluation_paid', '付费测评', true, '{"description": "付费自定义提示词实时对比", "price_per_model": 2.00}', NOW(), NOW(), true, 1, 0),
(1007, 'ladder_skills', 'Skills天梯图', false, '{"description": "Skill技能天梯图"}', NOW(), NOW(), true, 1, 0),
(1008, 'ladder_mcp', 'MCP天梯图', false, '{"description": "MCP服务器天梯图"}', NOW(), NOW(), true, 1, 0),
(1009, 'ladder_agent', 'Agent天梯图', false, '{"description": "Agent智能体天梯图"}', NOW(), NOW(), true, 1, 0),
(1010, 'ladder_api_station', 'API站天梯图', false, '{"description": "API中转站天梯图"}', NOW(), NOW(), true, 1, 0),
(1011, 'favorite_system', '收藏系统', true, '{"description": "用户收藏功能"}', NOW(), NOW(), true, 1, 0),
(1012, 'recharge_system', '充值系统', true, '{"description": "用户余额充值"}', NOW(), NOW(), true, 1, 0),
(1013, 'news_module', '资讯模块', true, '{"description": "AI行业资讯"}', NOW(), NOW(), true, 1, 0);

-- ============================================================
-- 3. 系统配置
-- ============================================================

INSERT INTO system_configs (id, config_key, config_value, description, is_secret, created_at, updated_at, is_active, version, tenant_id) VALUES
(2001, 'ladder_weight_official', '0.25', '官方评测基准权重', false, NOW(), NOW(), true, 1, 0),
(2002, 'ladder_weight_practical', '0.25', '实际评测权重', false, NOW(), NOW(), true, 1, 0),
(2003, 'ladder_weight_reputation', '0.25', '风评权重', false, NOW(), NOW(), true, 1, 0),
(2004, 'ladder_weight_self_test', '0.25', '自测权重', false, NOW(), NOW(), true, 1, 0),
(2005, 'evaluation_price_per_model', '2.00', '单次测评每模型价格(元)', false, NOW(), NOW(), true, 1, 0),
(2006, 'min_recharge_amount', '10.00', '最低充值金额(元)', false, NOW(), NOW(), true, 1, 0),
(2007, 'exchange_rate_usd_cny', '5.00', '美元兑人民币汇率(用于价格换算)', false, NOW(), NOW(), true, 1, 0),
(2008, 'default_page_size', '50', '默认每页显示数量', false, NOW(), NOW(), true, 1, 0),
(2009, 'max_page_size', '200', '最大每页显示数量', false, NOW(), NOW(), true, 1, 0),
(2010, 'cache_ttl_model_detail', '3600', '模型详情缓存时间(秒)', false, NOW(), NOW(), true, 1, 0),
(2011, 'cache_ttl_ladder_list', '300', '天梯列表缓存时间(秒)', false, NOW(), NOW(), true, 1, 0),
(2012, 'cache_ttl_user_profile', '1800', '用户资料缓存时间(秒)', false, NOW(), NOW(), true, 1, 0),
(2013, 'redis_key_prefix', 'aidean', 'Redis Key前缀', false, NOW(), NOW(), true, 1, 0),
(2014, 'snowflake_worker_id', '1', 'Snowflake算法Worker ID', false, NOW(), NOW(), true, 1, 0),
(2015, 'snowflake_datacenter_id', '1', 'Snowflake算法Datacenter ID', false, NOW(), NOW(), true, 1, 0);

-- ============================================================
-- 4. 示例模型商数据
-- ============================================================

INSERT INTO providers (id, name, name_en, name_zh, slug, logo_url, website, description, country, sort_order, status, created_at, updated_at, is_active, version, tenant_id) VALUES
(10001, 'OpenAI', 'OpenAI', 'OpenAI', 'openai', '/logos/openai.svg', 'https://openai.com', 'ChatGPT背后的公司，GPT系列模型开发者', 'US', 1, 1, NOW(), NOW(), true, 1, 0),
(10002, 'Anthropic', 'Anthropic', 'Anthropic', 'anthropic', '/logos/anthropic.svg', 'https://anthropic.com', 'Claude系列模型开发者', 'US', 2, 1, NOW(), NOW(), true, 1, 0),
(10003, 'Google', 'Google', '谷歌', 'google', '/logos/google.svg', 'https://deepmind.google', 'Gemini系列模型开发者', 'US', 3, 1, NOW(), NOW(), true, 1, 0),
(10004, '通义千问', 'Qwen', '通义千问', 'qwen', '/logos/qwen.svg', 'https://tongyi.aliyun.com', '阿里巴巴旗下大模型', 'CN', 4, 1, NOW(), NOW(), true, 1, 0),
(10005, '智谱AI', 'Zhipu AI', '智谱AI', 'zhipu', '/logos/zhipu.svg', 'https://zhipuai.cn', 'GLM系列模型开发者', 'CN', 5, 1, NOW(), NOW(), true, 1, 0),
(10006, 'DeepSeek', 'DeepSeek', '深度求索', 'deepseek', '/logos/deepseek.svg', 'https://deepseek.com', 'DeepSeek系列模型开发者', 'CN', 6, 1, NOW(), NOW(), true, 1, 0),
(10007, '月之暗面', 'Moonshot AI', '月之暗面', 'kimi', '/logos/kimi.svg', 'https://kimi.ai', 'Kimi智能助手开发者', 'CN', 7, 1, NOW(), NOW(), true, 1, 0),
(10008, 'MiniMax', 'MiniMax', 'MiniMax', 'minimax', '/logos/minimax.svg', 'https://minimax.chat', 'MiniMax系列模型开发者', 'CN', 8, 1, NOW(), NOW(), true, 1, 0),
(10009, '百度', 'Baidu', '百度', 'baidu', '/logos/baidu.svg', 'https://yiyan.baidu.com', '文心一言开发者', 'CN', 9, 1, NOW(), NOW(), true, 1, 0),
(10010, '零一万物', '01.AI', '零一万物', '01ai', '/logos/01ai.svg', 'https://01.ai', 'Yi系列模型开发者', 'CN', 10, 1, NOW(), NOW(), true, 1, 0);

-- ============================================================
-- 5. 示例模型数据
-- ============================================================

INSERT INTO models (id, name, name_en, name_zh, slug, provider_id, type, category, params, context_length, is_open_source, protocol, release_date, status, created_at, updated_at, is_active, version, tenant_id) VALUES
(20001, 'GPT-4o', 'GPT-4o', 'GPT-4o', 'gpt-4o', 10001, 1, 1, '混合', 128000, false, 1, '2024-05-13', 1, NOW(), NOW(), true, 1, 0),
(20002, 'GPT-4o-mini', 'GPT-4o-mini', 'GPT-4o-mini', 'gpt-4o-mini', 10001, 1, 1, '混合', 128000, false, 1, '2024-07-18', 1, NOW(), NOW(), true, 1, 0),
(20003, 'Claude 3.5 Sonnet', 'Claude 3.5 Sonnet', 'Claude 3.5 Sonnet', 'claude-3-5-sonnet', 10002, 1, 1, '混合', 200000, false, 2, '2024-10-22', 1, NOW(), NOW(), true, 1, 0),
(20004, 'Claude 3.5 Haiku', 'Claude 3.5 Haiku', 'Claude 3.5 Haiku', 'claude-3-5-haiku', 10002, 1, 1, '混合', 200000, false, 2, '2024-10-22', 1, NOW(), NOW(), true, 1, 0),
(20005, 'Gemini 2.0 Flash', 'Gemini 2.0 Flash', 'Gemini 2.0 Flash', 'gemini-2-flash', 10003, 1, 1, '混合', 1000000, false, 0, '2024-12-01', 1, NOW(), NOW(), true, 1, 0),
(20006, 'Qwen 2.5 72B', 'Qwen 2.5 72B', '通义千问2.5 72B', 'qwen-2.5-72b', 10004, 1, 1, '72B', 131072, true, 0, '2024-09-19', 1, NOW(), NOW(), true, 1, 0),
(20007, 'GLM-4', 'GLM-4', 'GLM-4', 'glm-4', 10005, 1, 1, '混合', 128000, false, 0, '2024-06-05', 1, NOW(), NOW(), true, 1, 0),
(20008, 'DeepSeek V3', 'DeepSeek V3', 'DeepSeek V3', 'deepseek-v3', 10006, 1, 1, '671B', 128000, true, 0, '2024-12-26', 1, NOW(), NOW(), true, 1, 0),
(20009, 'Kimi k1.5', 'Kimi k1.5', 'Kimi k1.5', 'kimi-k1-5', 10007, 1, 1, '混合', 128000, false, 0, '2025-01-01', 1, NOW(), NOW(), true, 1, 0),
(20010, 'MiniMax M1', 'MiniMax M1', 'MiniMax M1', 'minimax-m1', 10008, 1, 1, '混合', 128000, false, 0, '2025-01-15', 1, NOW(), NOW(), true, 1, 0);

-- ============================================================
-- 6. 示例模型评分数据
-- ============================================================

INSERT INTO model_scores (id, model_id, official_score, practical_score, reputation_score, self_test_score, total_score, weight_config, calculated_at, created_at, updated_at, is_active, version, tenant_id) VALUES
(30001, 20001, 92.5, 88.3, 95.0, 90.1, 91.48, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0),
(30002, 20002, 85.0, 82.1, 88.0, 84.5, 84.90, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0),
(30003, 20003, 94.2, 91.5, 93.8, 92.0, 92.88, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0),
(30004, 20004, 82.0, 79.5, 85.0, 80.2, 81.68, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0),
(30005, 20005, 90.0, 87.2, 89.5, 88.0, 88.68, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0),
(30006, 20006, 88.5, 85.0, 87.2, 86.5, 86.80, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0),
(30007, 20007, 86.0, 83.5, 85.0, 84.0, 84.63, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0),
(30008, 20008, 91.0, 89.2, 90.5, 88.8, 89.88, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0),
(30009, 20009, 87.5, 84.0, 86.5, 85.2, 85.80, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0),
(30010, 20010, 84.0, 81.5, 83.0, 82.5, 82.75, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0);

-- ============================================================
-- 7. 示例天梯排名数据
-- ============================================================

INSERT INTO ladder_rankings (id, model_id, ladder_type, rank, score, snapshot_date, created_at, updated_at, is_active, version, tenant_id) VALUES
(40001, 20003, 1, 1, 92.88, CURRENT_DATE, NOW(), NOW(), true, 1, 0),
(40002, 20001, 1, 2, 91.48, CURRENT_DATE, NOW(), NOW(), true, 1, 0),
(40003, 20008, 1, 3, 89.88, CURRENT_DATE, NOW(), NOW(), true, 1, 0),
(40004, 20005, 1, 4, 88.68, CURRENT_DATE, NOW(), NOW(), true, 1, 0),
(40005, 20006, 1, 5, 86.80, CURRENT_DATE, NOW(), NOW(), true, 1, 0),
(40006, 20009, 1, 6, 85.80, CURRENT_DATE, NOW(), NOW(), true, 1, 0),
(40007, 20007, 1, 7, 84.63, CURRENT_DATE, NOW(), NOW(), true, 1, 0),
(40008, 20002, 1, 8, 84.90, CURRENT_DATE, NOW(), NOW(), true, 1, 0),
(40009, 20010, 1, 9, 82.75, CURRENT_DATE, NOW(), NOW(), true, 1, 0),
(40010, 20004, 1, 10, 81.68, CURRENT_DATE, NOW(), NOW(), true, 1, 0);

-- ============================================================
-- 8. 示例基准测试数据
-- ============================================================

INSERT INTO benchmarks (id, model_id, benchmark_name, score, max_score, source, source_url, recorded_at, created_at, updated_at, is_active, version, tenant_id) VALUES
(50001, 20001, 'MMLU', 88.7, 100, 'OpenAI', 'https://openai.com', '2024-05-13', NOW(), NOW(), true, 1, 0),
(50002, 20001, 'HumanEval', 90.2, 100, 'OpenAI', 'https://openai.com', '2024-05-13', NOW(), NOW(), true, 1, 0),
(50003, 20003, 'MMLU', 91.5, 100, 'Anthropic', 'https://anthropic.com', '2024-10-22', NOW(), NOW(), true, 1, 0),
(50004, 20003, 'HumanEval', 92.8, 100, 'Anthropic', 'https://anthropic.com', '2024-10-22', NOW(), NOW(), true, 1, 0),
(50005, 20008, 'MMLU', 90.1, 100, 'DeepSeek', 'https://deepseek.com', '2024-12-26', NOW(), NOW(), true, 1, 0),
(50006, 20008, 'HumanEval', 89.5, 100, 'DeepSeek', 'https://deepseek.com', '2024-12-26', NOW(), NOW(), true, 1, 0);

-- ============================================================
-- 9. 示例管理员用户 (密码: admin123, 需要应用层加密)
-- ============================================================

-- 注意：实际密码应由应用层使用bcrypt加密后存储
-- 这里仅作为示例，密码哈希为 "admin123" 的bcrypt哈希 (需要替换为真实哈希)
INSERT INTO users (id, email, password_hash, nickname, role, status, balance, created_at, updated_at, is_active, version, tenant_id) VALUES
(1, 'admin@aidean.com', '$2b$10$dummy_hash_please_replace_in_production', '系统管理员', 3, 1, 0, NOW(), NOW(), true, 1, 0);

-- ============================================================
-- 10. 更新序列值 (如果使用序列生成ID)
-- ============================================================

-- 设置各表序列起始值 (如果使用序列)
-- SELECT setval('dict_items_id_seq', 51);
-- SELECT setval('feature_flags_id_seq', 1013);
-- SELECT setval('system_configs_id_seq', 2015);
-- SELECT setval('providers_id_seq', 10010);
-- SELECT setval('models_id_seq', 20010);
-- SELECT setval('model_scores_id_seq', 30010);
-- SELECT setval('ladder_rankings_id_seq', 40010);
-- SELECT setval('benchmarks_id_seq', 50006);
-- SELECT setval('users_id_seq', 1);
