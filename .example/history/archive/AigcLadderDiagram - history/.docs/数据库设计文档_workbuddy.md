# AI模型天梯图平台 - 数据库设计综合分析报告

> 生成日期：2026-04-09
> 分析文档：数据库设计文档_opencode.md + 数据库设计文档_trae.md

---

## 一、静态界面功能统计（42个页面）

### 1.1 核心天梯图页面（9个）

| 页面路径 | 功能描述 | 涉及动态参数 | 优先级 |
|---------|---------|-------------|--------|
| / | 首页 - 轮播图+功能入口 | 轮播图数据、统计数据 | P0 |
| /models | 大模型性能天梯图 | 模型列表、筛选条件、排序规则 | P0 |
| /models/mobile | 移动端模型天梯图 | 移动端模型筛选数据 | P1 |
| /models/image | 图像模型天梯图 | 图像类模型数据 | P1 |
| /models/video | 视频模型天梯图 | 视频类模型数据 | P1 |
| /models/audio | 音频模型天梯图 | 音频类模型数据 | P1 |
| /models/[id] | 模型详情页 | 模型详情、基准测试、价格、收藏状态 | P0 |
| /compare | 模型对比页 | 对比模型ID列表、模型详细数据 | P1 |
| /evaluation | 测评页 | 测评记录、余额扣除 | P1 |

### 1.2 资源页面（6个）

| 页面路径 | 功能描述 | 涉及动态参数 | 优先级 |
|---------|---------|-------------|--------|
| /resources | 资源首页 | 资源分类数据 | P1 |
| /resources/news | AI快讯 | 资讯列表、分类筛选、搜索 | P1 |
| /resources/scenarios | 场景方案 | 方案列表、分类筛选 | P2 |
| /resources/agent | Agent集合 | Agent列表、分类、排序 | P2 |
| /resources/mcp | MCP工具 | MCP列表、分类、筛选 | P2 |
| /resources/skills | Skill技能 | Skills列表、分类、同步状态 | P2 |

### 1.3 产品页面（5个）

| 页面路径 | 功能描述 | 涉及动态参数 | 优先级 |
|---------|---------|-------------|--------|
| /products | 产品首页 | 产品分类数据 | P1 |
| /products/ai-employee | AI员工 | 员工类型、能力展示 | P1 |
| /products/knowledge-base | 知识库 | 知识库功能介绍 | P1 |
| /products/solutions | 解决方案 | 行业方案数据 | P1 |
| /products/consulting | 业务咨询 | 咨询服务类型 | P1 |

### 1.4 文档页面（5个）

| 页面路径 | 功能描述 | 涉及动态参数 | 优先级 |
|---------|---------|-------------|--------|
| /docs | 文档首页 | 文档分类 | P1 |
| /docs/help | 使用指南 | 帮助文档内容 | P2 |
| /docs/help-center | 帮助中心 | FAQ数据 | P2 |
| /docs/pricing | 定价方案 | 价格配置 | P1 |
| /docs/api | API文档 | API接口文档 | P2 |

### 1.5 关于页面（4个）

| 页面路径 | 功能描述 | 涉及动态参数 | 优先级 |
|---------|---------|-------------|--------|
| /about | 关于首页 | 公司信息 | P2 |
| /about/contact | 联系我们 | 联系表单 | P2 |
| /about/cooperation | 合作 | 合作方式 | P2 |
| /about/jobs | 招聘 | 职位列表 | P2 |

### 1.6 认证页面（2个）

| 页面路径 | 功能描述 | 涉及动态参数 | 优先级 |
|---------|---------|-------------|--------|
| /auth/login | 登录 | 用户认证、OAuth | P0 |
| /auth/register | 注册 | 用户注册、验证 | P0 |

### 1.7 Demo页面（10个）

| 页面路径 | 功能描述 | 涉及动态参数 | 优先级 |
|---------|---------|-------------|--------|
| /demo/demo1-5 | Demo展示 | 演示数据 | P3 |
| /demo/demo1-5/models/[id] | Demo详情 | 演示详情 | P3 |

### 1.8 其他页面（1个）

| 页面路径 | 功能描述 | 涉及动态参数 | 优先级 |
|---------|---------|-------------|--------|
| /test-image | 图片测试 | 测试数据 | P3 |

---

## 二、预设功能及动态参数统计

### 2.1 用户系统功能

| 功能模块 | 功能点 | 动态参数 | 数据库表 |
|---------|-------|---------|---------|
| 用户认证 | 注册/登录/登出 | email, password, oauth_token | sys_users |
| 用户管理 | 资料修改/头像上传 | nickname, avatar, phone | sys_users |
| 余额系统 | 充值/消费/查询 | balance, transaction_type, amount | fin_transactions, fin_recharge_orders |
| 订阅系统 | 月付/年付订阅 | subscription_type, expires_at | sys_users |
| 收藏系统 | 收藏/取消收藏 | target_type, target_id | sys_favorites |
| 安全设置 | MFA/密码修改 | mfa_enabled, mfa_secret | sys_users |

### 2.2 模型天梯图功能

| 功能模块 | 功能点 | 动态参数 | 数据库表 |
|---------|-------|---------|---------|
| 模型管理 | 模型CRUD | model_id, name, vendor_id | ai_models |
| 厂商管理 | 厂商信息管理 | vendor_name, series_name, tier_level | ai_vendors |
| 基准测试 | 测试数据录入 | benchmark_type, scores, source_type | ai_benchmarks |
| 价格管理 | 价格配置 | price_input, price_output, effective_from | ai_model_prices |
| 评分计算 | 四维评分计算 | official_score, actual_score, review_score, self_test_score | ai_model_scores |
| 天梯图配置 | 榜单定义 | chart_key, chart_type, default_filters | ai_ladder_charts |
| 排名管理 | 排名计算 | rank_position, sort_value, version_date | ai_ladder_rankings |

### 2.3 资源功能

| 功能模块 | 功能点 | 动态参数 | 数据库表 |
|---------|-------|---------|---------|
| AI快讯 | 资讯管理 | title, content, category, published_at | content_news |
| Skills | 技能管理 | skill_key, source_platform, github_stars | ai_skills |
| MCP工具 | MCP管理 | server_key, source_type, tool_count | ai_mcp_servers |
| Agent | 智能体管理 | name, framework, capabilities | ai_agents |
| 场景方案 | 方案管理 | scenario_name, category, difficulty | ai_scenarios |
| 数据同步 | 多源同步 | source_code, sync_status, last_synced_at | sync_sources, sync_logs |

### 2.4 系统功能

| 功能模块 | 功能点 | 动态参数 | 数据库表 |
|---------|-------|---------|---------|
| 功能开关 | 功能启用/禁用 | flag_key, is_enabled, enabled_roles | sys_feature_flags |
| 系统配置 | 网站配置 | config_key, config_value | sys_configs |
| 导航菜单 | 菜单管理 | menu_name, menu_url, sort_order, parent_id | sys_navigation_menus |
| 筛选配置 | 筛选项管理 | filter_type, filter_options | sys_filter_options |
| 审计日志 | 操作记录 | user_id, action, resource_type, ip_address | sys_audit_logs |
| 定时任务 | 脚本调度 | script_name, cron_expression, run_status | sys_scheduled_scripts |

---

## 三、两份数据库设计文档对比分析

### 3.1 文档_opencode.md 分析

#### 覆盖功能
- ✅ 用户系统（用户、交易、充值）
- ✅ 模型核心（模型、基准测试、测评）
- ✅ 资讯系统
- ✅ 定时脚本
- ✅ Skills/MCP/Agent/API站
- ✅ 收藏系统
- ✅ 功能开关

#### 优点
1. **通用字段模板全面**：包含30+个预留字段（审计、多租户、地理、搜索、安全、生命周期）
2. **字段预留充足**：attr_01~05, attr_int, attr_num, attr_bool, attr_json
3. **Skills多源同步字段完整**：source, source_id, stars, install_command
4. **索引策略完善**：包含GIN索引、复合索引、部分索引
5. **触发器设计**：自动更新updated_at和search_vector

#### 缺陷
1. ❌ 缺少Schema分区设计
2. ❌ 缺少厂商表(vendors)的层级设计
3. ❌ 缺少价格历史表设计
4. ❌ 缺少天梯图定义表
5. ❌ 缺少导航菜单表
6. ❌ 缺少字典表设计
7. ❌ 表名前缀不统一（sys_/ai_/fin_/content_）

### 3.2 文档_trae.md 分析

#### 覆盖功能
- ✅ 用户系统（含分区设计）
- ✅ 模型系统（厂商、模型、价格、基准测试、评分）
- ✅ 天梯图系统（定义、排名）
- ✅ Skills系统（含多源同步）
- ✅ 数据源配置
- ✅ Redis缓存架构

#### 优点
1. **Schema分区清晰**：7个Schema（core/models/tools/user/system/dict）
2. **分区表设计**：用户表16个HASH分区，模型表按月RANGE分区
3. **厂商层级设计**：tier_level, is_featured, featured_weight
4. **价格历史设计**：effective_from, effective_until, is_current
5. **天梯图完整设计**：ladder_charts + ladder_rankings
6. **Skills多源同步更详细**：4个平台预设配置
7. **ER关系图完整**：展示所有表关系
8. **Redis缓存设计**：Key模式、TTL、一致性策略

#### 缺陷
1. ❌ 缺少Agent表详细设计
2. ❌ 缺少MCP表详细设计
3. ❌ 缺少API站表设计
4. ❌ 缺少收藏表设计
5. ❌ 缺少功能开关表设计
6. ❌ 缺少导航菜单表设计
7. ❌ 缺少审计日志表设计
8. ❌ 通用字段比_opencode.md少（无地理、安全、生命周期字段）

### 3.3 对比总结

| 维度 | _opencode.md | _trae.md | 建议 |
|------|--------------|----------|------|
| Schema设计 | ❌ 无 | ✅ 7个Schema | 采用_trae.md方案 |
| 分区设计 | ❌ 无 | ✅ HASH+RANGE | 采用_trae.md方案 |
| 通用字段 | ✅ 30+字段 | ⚠️ 基础字段 | 整合两者 |
| 厂商层级 | ❌ 无 | ✅ 完整 | 采用_trae.md方案 |
| 价格历史 | ❌ 无 | ✅ 完整 | 采用_trae.md方案 |
| 天梯图 | ❌ 无 | ✅ 完整 | 采用_trae.md方案 |
| Skills同步 | ✅ 有 | ✅ 更详细 | 整合两者 |
| 工具生态 | ✅ 完整 | ❌ 缺失 | 采用_opencode.md方案 |
| 系统功能 | ✅ 完整 | ❌ 缺失 | 采用_opencode.md方案 |

---

## 四、数据库设计缺陷总结

### 4.1 共同缺陷

1. **缺少多级层级结构设计**
   - 类型/分类缺少父子层级
   - 导航菜单缺少父子层级
   - 地区/组织架构缺少层级

2. **缺少业务规则表**
   - 计费规则表
   - 折扣规则表
   - 积分规则表

3. **缺少统计分析表**
   - 用户行为统计
   - 模型访问统计
   - 工具使用统计

4. **缺少消息通知表**
   - 系统通知
   - 用户消息
   - 订阅推送

### 4.2 需要补充的表

| 表名 | 用途 | 优先级 |
|------|------|--------|
| sys_dict_types | 字典类型 | P1 |
| sys_dict_items | 字典项 | P1 |
| sys_navigation_menus | 导航菜单 | P1 |
| sys_categories | 分类管理（多级） | P1 |
| sys_regions | 地区管理（多级） | P2 |
| sys_notifications | 消息通知 | P2 |
| sys_user_behaviors | 用户行为 | P2 |
| ai_model_access_logs | 模型访问日志 | P2 |
| ai_tool_usage_logs | 工具使用日志 | P2 |
| ai_evaluation_details | 测评详情 | P1 |
| ai_evaluation_results | 测评结果 | P1 |
| ai_evaluation_costs | 测评费用 | P1 |
| fin_billing_rules | 计费规则 | P1 |
| fin_discount_rules | 折扣规则 | P2 |

---

## 五、数据库设计原则检查

### 5.1 已遵守原则

| 原则 | 状态 | 说明 |
|------|------|------|
| 主键使用BIGINT | ✅ | Snowflake ID，非自增 |
| 金额使用NUMERIC | ✅ | NUMERIC(19,4)，禁止FLOAT |
| 枚举使用SMALLINT | ✅ | CHECK约束+字典表 |
| 时间使用TIMESTAMPTZ | ✅ | UTC存储 |
| JSON使用JSONB | ✅ | 配GIN索引 |
| 软删除设计 | ✅ | deleted_at字段 |
| 乐观锁设计 | ✅ | version字段 |
| 多租户预留 | ✅ | tenant_id/org_id |
| 全文搜索预留 | ✅ | TSVECTOR |
| 字段注释完善 | ✅ | COMMENT ON |

### 5.2 需要加强的原则

| 原则 | 状态 | 改进建议 |
|------|------|---------|
| 表分区 | ⚠️ | 增加更多分区表 |
| 索引策略 | ⚠️ | 补充更多复合索引 |
| 数据加密 | ⚠️ | 增加加密字段使用 |
| 数据分级 | ⚠️ | 增加data_classification使用 |
| 归档策略 | ⚠️ | 增加归档表设计 |
| 审计日志 | ❌ | 补充审计日志表 |

---

## 六、综合评分

### 6.1 功能覆盖度

| 功能域 | _opencode.md | _trae.md | 综合 |
|--------|--------------|----------|------|
| 用户系统 | 85% | 90% | 90% |
| 模型系统 | 75% | 95% | 95% |
| 天梯图系统 | 60% | 95% | 95% |
| Skills系统 | 85% | 85% | 90% |
| MCP/Agent系统 | 80% | 40% | 85% |
| 资源系统 | 70% | 30% | 75% |
| 系统功能 | 80% | 50% | 85% |
| **总体覆盖度** | **76%** | **69%** | **88%**（整合后） |

### 6.2 设计完善度

| 维度 | _opencode.md | _trae.md | 综合 |
|------|--------------|----------|------|
| Schema设计 | 60% | 95% | 95% |
| 字段完整性 | 95% | 80% | 95% |
| 索引设计 | 85% | 75% | 90% |
| 分区设计 | 40% | 90% | 90% |
| 扩展预留 | 95% | 85% | 95% |
| 缓存设计 | 70% | 90% | 90% |
| **总体完善度** | **74%** | **86%** | **93%**（整合后） |

---

## 七、结论与建议

### 7.1 主要结论

1. **两份文档互补性强**：_opencode.md在字段完整性、工具生态、系统功能方面更优；_trae.md在Schema设计、分区策略、天梯图系统方面更优
2. **整合后覆盖度达88%**：整合两份文档优点，补充缺失表，可覆盖所有42个页面的功能需求
3. **需要补充15+张表**：主要为多级层级、业务规则、统计分析、消息通知类表

### 7.2 实施建议

1. **采用_trae.md的Schema分区方案**：7个Schema清晰合理
2. **整合_opencode.md的通用字段**：30+预留字段更完善
3. **优先实现P0/P1功能**：用户系统、模型系统、天梯图系统
4. **增加多级层级设计**：分类、菜单、地区都需要父子层级
5. **宁多不少的字段策略**：充分利用预留字段机制

