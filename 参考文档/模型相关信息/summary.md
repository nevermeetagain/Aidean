# 大模型相关信息综合分析与采集方案

生成日期: 2026-09-30
数据来源: from_glm.md + from_claude.md + from_chatgpt.md + 实时API探测

## 一、需求定义

每天定时采集一次大模型的最新信息，核心关注：1) 今天上新了哪些大模型 2) 有哪些新的服务提供商/中转站(含价格)。
设计目标：多模型/多站点集成，后端可配置更新频率，Ubuntu可运行，API优先。

## 二、采集渠道总览（模型发现）

| 优先级 | 渠道 | API端点 | 鉴权 | 关键能力 | 覆盖范围 | 实测状态 |
|:---:|------|------|:---:|------|------|------|
| 1 | OpenRouter | GET /api/v1/models | 免Key | created时间戳+价格+上下文+架构；460模型 | 商业+开源API模型 | OK 460模型 24h新增2个 |
| 2 | HuggingFace | GET hf-mirror.com/api/models | 免Key(限速) | 分钟级新模型流；权重发布层 | 开源权重(含未上API) | OK 可拉当天最新 |
| 3 | Replicate | GET /v1/models | 需Key | 图片/视频/音频/多模态 | 多模态模型 | 需认证 HTTP401 |
| 4 | ModelScope | Python SDK | 免Key | 国产/中文开源模型 | 中国生态 | SDK可用 |
| 5 | LiteLLM | GitHub raw JSON | 免Key | 全网模型注册表~6000条；价格交叉验证 | 几乎所有API提供商 | OK 可下载 |
| 6 | Models.dev | GET /api.json | 免Key | 225家提供商 8285个含价格模型 | 提供商+模型+价格一体 | OK 225提供商 |
| 7 | ArtificialAnalysis | GET /api/v2/data/llms/models | 需Key | 性能/价格/benchmark对比 | 主流模型 | 需认证 Free100次/24h |
| 8 | LLMGateway | /timeline | 免Key(HTML) | 模型发布时间线 54提供商414模型 | 主流商业模型 | OK HTTP200 |
| 9 | LLMStats | /llm-updates | 免Key(HTML/RSS) | 实时版本发布追踪 399+记录 | 主流LLM | OK HTTP200 |
| 10 | arXiv/HFPapers | arxiv.org/api/query | 免Key | 新模型发布前置信号 | 学术/开源 | 未实测 |
| 补充 | 官方changelog | 各厂商博客+RSSHub | 免Key | 官方公告一手口径 | 各厂商 | 需逐厂配置 |

### 模型发现层级划分

| 层级 | 渠道 | 职责 | 采集频率 |
|:---:|------|------|------|
| 第一层(每日必须) | OpenRouter+HuggingFace+Replicate+ModelScope | 机器发现层 | 每日1次 |
| 第二层(补充) | ArtificialAnalysis+Models.dev+LiteLLM | 标准化/价格/性能交叉验证 | 每日或每周 |
| 第三层(最终证据) | 各厂商官方定价页/发布页 | 官方真实性验证 | 触发式 |

## 三、采集渠道总览（提供商/中转站/价格）

| 优先级 | 渠道 | API端点 | 鉴权 | 关键能力 | 类型 | 实测状态 |
|:---:|------|------|:---:|------|------|------|
| 1 | OpenRouter Providers | GET /api/v1/providers | 免Key | 111个provider；含总部/数据中心/状态页 | 聚合网关 | OK 111提供商 |
| 2 | OpenRouter Endpoints | GET /models/{a}/{s}/endpoints | 免Key | 某模型被哪些provider提供+各自价格/性能 | 聚合网关 | 需模型ID |
| 3 | Models.dev | 同上 | 免Key | 225家提供商 含官网/文档/全模型价格表 | 标准化数据库 | OK |
| 4 | ArtificialAnalysis | GET /api/v2/language/providers | 需Key | provider数据库：国家/模型/价格/性能 | 性能对比 | 需认证 |
| 5 | LiteLLM | 同上JSON+providers/目录 | 免Key | litellm_provider字段聚合全部提供商 | 技术接入视角 | OK |
| 6 | 官方云厂商API | AWS Bedrock/Azure/VertexAI | 需Key | 企业级渠道模型上新 | 企业采购 | 需各云Key |
| 7 | GitHub Search | GET /search/repositories | 免Key(限速) | 发现新中转站/网关项目 | 中转站发现 | 未实测 |
| 8 | 302.AI | GET /v1/models+/dashboard/prices | 需Key | 中转站模型列表+价格 | 中转站 | 连接超时 |
| 9 | AnyRouter | GET /api/v1/models?all=1 | 需Key | Gateway模型目录+路由 | 中转站 | 连接超时 |
| 10 | 比价站 | benchlm.ai/costgoat.com | 免Key(HTML) | 聚合官方价格对比 | 辅助核价 | OK HTTP200 |

## 四、Provider与Gateway/中转站分类

关键区分：模型厂商(Provider) != 推理托管商 != 聚合网关(Gateway) != 中转站(Relay)

| 类型 | 定义 | 典型代表 | 数据获取 |
|------|------|------|------|
| 模型厂商 | 研发并拥有模型权重 | OpenAI Anthropic Google DeepSeek Meta Mistral xAI | 官方定价页/API |
| 推理托管商 | 提供模型推理服务(自建GPU) | Groq Together Fireworks DeepInfra Novita Cerebras SiliconFlow | 官方API /v1/models |
| 聚合网关 | 统一API聚合多家模型 | OpenRouter Models.dev ArtificialAnalysis | 公开API |
| 中转站/Relay | API转售/代理(可能改模型/降智) | 302.AI AnyRouter AiHubMix one-api/new-api生态 | 各站API(非标准) |
| 企业云渠道 | 云市场转售模型 | AWS Bedrock Azure OpenAI Vertex AI | 云SDK/API |

### 中转站风险提示

| 风险 | 说明 |
|------|------|
| 跑路 | 中转站无SLA保障 随时可能停运 |
| 降智 | 偷换小模型替代标称模型 |
| 密钥泄露 | 中转站持有用户API Key |
| 虚标价格 | 标称价格与实际计费不符 |

建议：中转站价格仅作行情参考 不作生产数据源。自建合规聚合层可用new-api/one-api开源自部署。

## 五、模型生命周期三事件模型

建议将"新模型"定义为三个独立事件 而非单一时间戳：

| 事件 | 定义 | 数据源 | 时间关系 |
|------|------|------|------|
| MODEL_RELEASED | 官方宣布新模型 | 官方博客/changelog | 最早 |
| MODEL_PUBLISHED | 权重出现在HF/ModelScope/Replicate | HuggingFace等 | 通常同日或次日 |
| MODEL_API_AVAILABLE | OpenRouter/Provider开始可调用 | OpenRouter等 | 可能晚1-30天 |

示例：9/28 Anthropic官方发布 -> 9/28 HF出现 -> 9/29 OpenRouter收录

## 六、数据库Schema设计建议

| 表名 | 核心字段 | 用途 |
|------|------|------|
| models | model_id canonical_name creator release_date discovered_at modalities context_window open_source | 模型主表 |
| providers | provider_id name type(厂商/托管/网关/中转) country website api_base discovered_at | 提供商主表 |
| model_provider | model_id provider_id input_price output_price cache_price context_window availability observed_at | 模型-提供商关联 |
| gateways | gateway_id name website api_base compatibility discovered_at source | 网关/中转站表 |
| price_history | model_id provider_id price_type old_price new_price effective_at source | 价格变动历史 |

## 七、API访问测试结果

2026-09-30实时探测：

| 渠道 | 端点 | HTTP状态 | 结果摘要 | 需要Key |
|------|------|:---:|------|:---:|
| OpenRouter Models | /api/v1/models | 200 | 460模型 24h新增2个(claude-sonnet-5.5) | 否 |
| OpenRouter Providers | /api/v1/providers | 200 | 111个provider | 否 |
| Models.dev | /api.json | 200 | 225提供商 8285模型 | 否 |
| LiteLLM | GitHub raw JSON | 200 | 文件可下载~6000条(偶发截断需重试) | 否 |
| HuggingFace(镜像) | hf-mirror.com/api/models | 200 | 可拉当天最新模型 | 否 |
| LLM Gateway | /timeline | 200 | HTML页面可用 | 否 |
| LLM Stats | /llm-updates | 200 | HTML页面可用 | 否 |
| benchlm.ai | /llm-pricing | 200 | HTML比价页可用 | 否 |
| Artificial Analysis | /api/v2/data/llms/models | 401 | 需API Key(Free 100次/24h) | 是 |
| Replicate | /v1/models | 401 | 需API Key | 是 |
| Groq | /openai/v1/models | 403 | 需API Key | 是 |
| 302.AI | /v1/models | 超时 | 连接超时 | 是 |
| AnyRouter | /api/v1/models | 超时 | 连接超时 | 是 |

### 测试结论

- 免Key可用：OpenRouter(模型+提供商) Models.dev HuggingFace镜像 LLM Gateway LLM Stats benchlm.ai LiteLLM — 已覆盖核心需求
- 需Key：ArtificialAnalysis Replicate Groq 302.AI AnyRouter — 需注册获取Key后接入
- OpenRouter是最佳单一来源：免Key 含created时间戳 含价格 含提供商前缀 支持diff

## 八、每日采集落地方案

### 采集架构

```
                  每日定时(cron/后端可配频率)
                     |
          +----------+----------+
          |                     |
     (1) 模型发现           (2) Provider发现
          |                     |
   OpenRouter API          OpenRouter Providers
   HuggingFace             OpenRouter Endpoints
   Replicate(需Key)        Models.dev
   ModelScope              GitHub Search
          |                 官方定价页
          |                 302.AI/AnyRouter
          +----------+----------+
                     |
              Normalizer(标准化)
                     |
                PostgreSQL
                     |
          +----------+----------+
          |          |          |
       新模型    新Provider   价格变化
          +----------+----------+
                     |
              每日报告+通知推送
```

### 采集频率配置（后端可配）

| 采集项 | 默认频率 | 可配范围 | 说明 |
|------|:---:|------|------|
| OpenRouter模型+提供商 | 每日08:00 | 每小时~每日 | 核心数据源 |
| HuggingFace新模型 | 每日08:00 | 每小时~每日 | 开源权重发现 |
| Models.dev全量 | 每日08:00 | 每日~每周 | 标准化数据层 |
| LiteLLM价格 | 每日08:00 | 每日~每周 | 价格交叉验证 |
| 官方厂商验证 | 触发式 | - | 最终证据 |
| GitHub新项目搜索 | 每周 | 每日~每月 | 中转站发现 |

### Diff逻辑

1. 保存昨天快照 2. 今天API拉取 3. 按model_id/provider_slug做diff 4. 新增模型=today-yesterday 5. 新增提供商同理 6. 价格变动=对比pricing字段哈希 7. 入库+报告+通知

## 九、众测分析（用户场景与管理）

### 9.1 核心用户场景

| 用户角色 | 典型场景 | 对模型信息的需求 | 优先关注 |
|------|------|------|------|
| AI应用开发者 | 选模型接入产品 | 模型能力对比 价格 上下文长度 API兼容性 | 性价比 稳定性 |
| 研究者/学术 | 追踪前沿模型 | 新模型发布 benchmark 论文关联 | 发布时间 性能 |
| 企业采购 | 评估模型采购方案 | 多提供商比价 SLA 合规 数据主权 | 价格 合规 |
| 中转站运营者 | 监控竞品价格 | 各中转站价格变动 新站上线 | 价格战 新站 |
| 模型评测者 | 维护模型数据库 | 全量模型元数据 版本变更 能力标签 | 数据完整性 |

### 9.2 管理场景

| 管理功能 | 说明 | 优先级 |
|------|------|:---:|
| 采集源管理 | 后台增删采集渠道 配置API Key 设置频率 | P0 |
| 数据看板 | 新模型日历 价格趋势图 提供商地图 | P1 |
| 告警规则 | 新模型上线通知 价格降幅超阈值告警 新提供商通知 | P1 |
| 数据导出 | 导出模型/价格数据为JSON/CSV | P2 |
| 采集监控 | 各渠道采集成功率 延迟 错误日志 | P1 |
| 手动触发 | 管理员手动触发某渠道采集 | P2 |
| 数据校验 | 多源交叉校验同一模型价格一致性 | P2 |

### 9.3 众测验证矩阵

| 验证项 | 验证方法 | 预期结果 | 状态 |
|------|------|------|:---:|
| OpenRouter每日diff发现新模型 | 连续2天采集对比model_id | 新增模型被识别 | OK已验证 |
| 价格变动检测 | 对比同一模型2天价格字段 | 价格变化被记录 | OK逻辑已验证 |
| 新提供商发现 | 对比provider slug集合 | 新provider被识别 | OK已验证 |
| 多源价格交叉一致 | OpenRouter vs Models.dev vs LiteLLM | 允许小差异 大差异标记 | 待验证 |
| HuggingFace镜像稳定 | 连续多日拉取 | 不超时 数据完整 | OK已验证 |
| LiteLLM JSON完整性 | 下载后json.loads校验 | 偶发截断需重试 | 需重试机制 |
| Models.dev大文件传输 | 5MB+下载 | 需超时+重试 | OK已验证 |

## 十、最终推荐采集组合

| 采集池 | 推荐渠道 | 说明 |
|------|------|------|
| 模型发现 | OpenRouter+HuggingFace+Replicate+ModelScope | 覆盖商业+开源+多模态+国产 |
| 供应商/中转 | OpenRouter Providers+Endpoints+ArtificialAnalysis+302.AI+GitHub | 覆盖正规+中转+新项目 |
| 价格校验 | 官方Pricing+Models.dev+LiteLLM | 三源交叉验证 |

### 免Key最小可用方案（立即可跑）

仅需 OpenRouter(模型+提供商) + Models.dev + HuggingFace镜像 + LiteLLM 四个免Key渠道 即可覆盖：今日新模型发现、今日新提供商发现、价格变动检测、模型元数据标准化。

## 十一、所需资源/输入清单

| 资源 | 用途 | 是否必须 | 获取方式 |
|------|------|:---:|------|
| Ubuntu服务器 | 运行定时采集脚本 | 是 | 已有 |
| Python3+httpx | 采集脚本运行环境 | 是 | 已有 |
| PostgreSQL | 数据存储 | 是 | 需部署 |
| OpenRouter API Key | 提高速率额度 | 否 | 注册openrouter.ai |
| HuggingFace Token | 提高速率额度 | 否 | 注册huggingface.co |
| ArtificialAnalysis Key | 性能/benchmark数据 | 否 | 申请artificialanalysis.ai |
| Replicate API Token | 多模态模型发现 | 否 | 注册replicate.com |
| 通知渠道webhook | 采集结果推送 | 否 | Telegram/企业微信/邮件 |

## 十二、参考来源

| 来源 | 贡献要点 |
|------|------|
| from_glm.md | OpenRouter首选 HF镜像必须 LiteLLM diff models.dev 225提供商 |
| from_claude.md | LLMGateway Timeline LLMStats实时 官方定价页分级 比价站(benchlm/costgoat/morphllm) |
| from_chatgpt.md | 双采集池设计 三事件模型 数据库schema Provider/Gateway分类 GitHub中转站发现 |
| 实时API探测 | 验证各渠道可用性 确认免Key渠道覆盖核心需求 |
