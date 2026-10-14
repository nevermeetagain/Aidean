# 任务索引（task-index）

> 版本: v0.4 | 更新: 2026-10-14 | 变更: 任务规划V0.4.0（基于 main@bfb3aef 复核，业务树 = 77c7952；未实现需求核查 + 模型源监控体系纳入统一规划）

总计 **73** 张原子任务卡｜Hark(主Agent) **24** 张｜外部Agent **49** 张｜档位：haiku 12 / opus 24 / sonnect 37｜fable 0（仅在推翻冻结契约时启用）

执行者口径：用户指令「核心任务+高难度任务（尤其 UI 设计与实现）由主 Agent 完成，中等及简单任务发布后由其他 Agent 完成」。本轮仅规划，实施需用户另行批准（见 15_前提与局限.md）。

| 任务 | 切片 | 名称 | 执行者 | 所有权 Agent | 档位 | 规模/工时 | 依赖 | 层级 | 条件 | V0.4.0 变更 |
|---|---|---|---|---|---|---|---|---|---|---|
| [TASK-001](tasks/TASK-001.md) | S0 | 错误码唯一源迁入 shared + 删除冲突旧表 + 新增 3 码 + SystemReady 契约 | Hark(主Agent) | Agent-Contract | opus | 中/6h | — | L0 | — | 沿用 |
| [TASK-002](tasks/TASK-002.md) | S0 | web 侧错误码改为从 shared 重导出（消除双源） | 外部Agent | Agent-API | sonnect | 小/3h | 001 | L1 | — | 沿用 |
| [TASK-003](tasks/TASK-003.md) | S0 | 新增 GET /api/v1/system/ready（DB+Redis 就绪探针） | 外部Agent | Agent-API | sonnect | 小/4h | 002 | L2 | — | 沿用 |
| [TASK-004](tasks/TASK-004.md) | S0 | 契约测试生成器（从 shared 契约自动生成契约测试） | 外部Agent | Agent-Guard | sonnect | 中/8h | 001 | L1 | — | 沿用 |
| [TASK-005](tasks/TASK-005.md) | S0 | 步行骨架 e2e：注册→登录→鉴权写→页面可见→错误信封 | 外部Agent | Agent-Guard | sonnect | 小/4h | 003 | L3 | — | 沿用 |
| [TASK-006](tasks/TASK-006.md) | S0 | CI 新增 e2e-skeleton job（PG16+Redis7 服务容器、空库迁移重放、:3000 启动） | 外部Agent | Agent-Guard | sonnect | 中/8h | 005, 004, 009 | L5 | — | 沿用 |
| [TASK-007](tasks/TASK-007.md) | S0 | 守卫脚本：根目录污染 / 密钥扫描 / 模块边界 / 端口区间一致性（零新依赖） | 外部Agent | Agent-Guard | sonnect | 中/6h | — | L6 | — | 沿用 |
| [TASK-050](tasks/TASK-050.md) | S0 | CI 门禁补齐：lint + @aidean/ui 单测进入 verify job | 外部Agent | Agent-Guard | sonnect | 小/2h | 007 | L7 | — | 沿用 |
| [TASK-008](tasks/TASK-008.md) | S0 | OIDC 种子 wechat-rag 回调白名单按端口裁决对齐（保留 BotHot 3200；AideanBot 3333 按 P-2 补录） | 外部Agent | Agent-Data | haiku | 小/1h | — | L9 | P-2 | 沿用 |
| [TASK-009](tasks/TASK-009.md) | S0 | S0 文档同步：API接口文档§4 全码表 + /system/ready 登记 + 双向锚 + 版本头 | 外部Agent | Agent-Docs | haiku | 小/3h | 003, 004, 005 | L4 | — | 沿用 |
| [TASK-010](tasks/TASK-010.md) | S1 | 固化复现：PG16 集成测试证明二次写价违反唯一索引（规划期已在 PGlite PG16.4 复现 23505） | 外部Agent | Agent-Data | sonnect | 小/4h | 006 | L6 | — | 沿用 |
| [TASK-011](tasks/TASK-011.md) | S1 | ADR-P003 + 迁移 M-001：is_current 改为部分唯一索引（WHERE is_current） | Hark(主Agent) | Agent-Data | opus | 中/6h | 010 | L7 | — | 沿用 |
| [TASK-012](tasks/TASK-012.md) | S1 | persistPrices 修正：单模型仅一条 current、事务化 | 外部Agent | Agent-Data | sonnect | 小/4h | 011 | L8 | — | 沿用 |
| [TASK-013](tasks/TASK-013.md) | S1 | S1 文档同步：数据库文档 model_prices 约束口径 + 台账登记缺陷闭环 | 外部Agent | Agent-Docs | haiku | 小/2h | 012 | L9 | — | 沿用 |
| [TASK-014](tasks/TASK-014.md) | S2 | 功能开关契约落地（码枚举/公开 DTO/后台 DTO/受控面映射） | Hark(主Agent) | Agent-Contract | opus | 小/3h | 001 | L1 | — | 沿用 |
| [TASK-015](tasks/TASK-015.md) | S2 | 开关服务 + 公开端点 + API 受控面接入（网关/测评/天梯站榜） | Hark(主Agent) | Agent-API | opus | 中/10h | 014, 002 | L2 | — | 沿用 |
| [TASK-016](tasks/TASK-016.md) | S2 | 后台开关端点 GET/PATCH /api/v1/admin/feature-flags（审计+即时失效） | 外部Agent | Agent-API | sonnect | 小/4h | 014, 002 | L2 | — | 沿用 |
| [TASK-017](tasks/TASK-017.md) | S2 | 后台菜单种子：新增「功能开关」入口（seed-navigation-menu + 默认树） | 外部Agent | Agent-Data | haiku | 小/2h | 016 | L3 | — | 沿用 |
| [TASK-018](tasks/TASK-018.md) | S2 | UI：后台功能开关页 + 前台入口隐藏 + 功能关闭 403 态 | Hark(主Agent) | Agent-App | opus | 大/14h | 015, 016, 017 | L4 | — | 沿用 |
| [TASK-019](tasks/TASK-019.md) | S2 | e2e：功能开关端到端（关→入口消失+API 50011→开→恢复） | 外部Agent | Agent-Guard | sonnect | 小/4h | 018, 006 | L6 | — | 沿用 |
| [TASK-020](tasks/TASK-020.md) | S2 | S2 文档同步：API 文档登记 3 端点 + 功能设计 §3.9 实装口径 + 术语表 | 外部Agent | Agent-Docs | haiku | 小/2h | 019 | L10 | — | 沿用 |
| [TASK-021](tasks/TASK-021.md) | S3 | 收藏契约落地（favorites.schema.ts） | 外部Agent | Agent-Contract | sonnect | 小/2h | 001 | L2 | — | 沿用 |
| [TASK-022](tasks/TASK-022.md) | S3 | 收藏 API：GET/POST /api/v1/user/favorites + DELETE /[id] | 外部Agent | Agent-API | sonnect | 中/6h | 021, 015 | L3 | — | 沿用 |
| [TASK-023](tasks/TASK-023.md) | S3 | UI：收藏按钮（详情页/天梯卡片）+ 控制台「我的收藏」Tab | Hark(主Agent) | Agent-App | opus | 大/12h | 022 | L4 | — | 沿用 |
| [TASK-024](tasks/TASK-024.md) | S3 | e2e：收藏端到端（收藏→控制台可见→取消→未登录引导） | 外部Agent | Agent-Guard | sonnect | 小/4h | 023, 006 | L6 | — | 沿用 |
| [TASK-025](tasks/TASK-025.md) | S3 | S3 文档同步：API 文档登记收藏端点 + 数据库文档 favorites 由「零消费」改「已消费」 | 外部Agent | Agent-Docs | haiku | 小/2h | 024 | L11 | — | 沿用 |
| [TASK-026](tasks/TASK-026.md) | S4 | 限时优惠契约落地（PromotionPrice*/EffectivePrice） | Hark(主Agent) | Agent-Contract | opus | 小/3h | 001 | L3 | — | 沿用 |
| [TASK-055](tasks/TASK-055.md) | S4 | 种子：系统配置新增 pricing.fxUsdCny 默认行（值取 U-15 裁决） | 外部Agent | Agent-Data | haiku | 小/1h | 026 | L10 | U-15 | 沿用 |
| [TASK-047](tasks/TASK-047.md) | S4 | 计价口径归一契约：币种 CNY + 每百万 Token + 汇率配置键（EffectivePrice 扩展） | Hark(主Agent) | Agent-Contract | opus | 中/4h | 026, 055 | L11 | U-15 | 沿用 |
| [TASK-027](tasks/TASK-027.md) | S4 | 生效价解析服务 + 网关计费/前台展示接入 | Hark(主Agent) | Agent-API | opus | 大/12h | 026, 011 | L8 | — | 沿用 |
| [TASK-048](tasks/TASK-048.md) | S4 | 生效价解析器接入币种/单位归一（网关扣费与读侧同口径） | Hark(主Agent) | Agent-API | opus | 中/8h | 047, 027 | L12 | U-15 | 沿用 |
| [TASK-028](tasks/TASK-028.md) | S4 | 后台限时优惠端点 /api/v1/admin/prices/promotions（CRUD+窗口不重叠校验） | 外部Agent | Agent-API | sonnect | 中/6h | 026, 011 | L8 | — | 沿用 |
| [TASK-049](tasks/TASK-049.md) | S4 | 存量价格行口径盘点脚本（只读：币种×计价单位×来源） | 外部Agent | Agent-Guard | sonnect | 小/3h | 006 | L6 | — | 沿用 |
| [TASK-029](tasks/TASK-029.md) | S4 | UI：后台优惠子表与创建对话框 + 前台优惠价徽标 | Hark(主Agent) | Agent-App | opus | 大/10h | 027, 028, 023 | L9 | — | 沿用 |
| [TASK-053](tasks/TASK-053.md) | S4 | UI：价格页/详情页统一 ¥/M 展示（附原币原价注记） | Hark(主Agent) | Agent-App | opus | 中/6h | 048, 029 | L13 | U-15 | 沿用 |
| [TASK-030](tasks/TASK-030.md) | S4 | 计费集成 e2e：优惠窗口内按优惠价扣费、窗外按原价 | 外部Agent | Agent-Guard | sonnect | 中/6h | 029, 006 | L10 | — | 沿用 |
| [TASK-031](tasks/TASK-031.md) | S4 | S4 文档同步：API 文档登记优惠端点 + 网关计费时序契约补生效价规则 | 外部Agent | Agent-Docs | haiku | 小/2h | 030 | L12 | — | 沿用 |
| [TASK-054](tasks/TASK-054.md) | S4 | S4b 文档同步：计价口径归一（网关计费时序契约 + API 文档 + 术语表） | 外部Agent | Agent-Docs | haiku | 小/2h | 053, 031 | L14 | U-15 | 沿用 |
| [TASK-032](tasks/TASK-032.md) | S5 | 搜索契约落地（search.schema.ts） | 外部Agent | Agent-Contract | sonnect | 小/2h | 001 | L12 | U-5 | 沿用 |
| [TASK-033](tasks/TASK-033.md) | S5 | 搜索 API GET /api/v1/search（模型/产品/资讯，仅已发布） | 外部Agent | Agent-API | sonnect | 中/5h | 032 | L13 | U-5 | 沿用 |
| [TASK-034](tasks/TASK-034.md) | S5 | UI：顶栏搜索（桌面框 + 移动端展开 + 键盘导航） | Hark(主Agent) | Agent-App | opus | 中/8h | 033, 018 | L14 | U-5 | 沿用 |
| [TASK-035](tasks/TASK-035.md) | S5 | e2e：搜索（命中/无结果/键盘跳转/移动端） | 外部Agent | Agent-Guard | sonnect | 小/3h | 034, 006 | L15 | U-5 | 沿用 |
| [TASK-036](tasks/TASK-036.md) | S5 | S5 文档同步：API 文档登记搜索端点 + UI/界面交互文档补搜索 | 外部Agent | Agent-Docs | haiku | 小/2h | 035 | L17 | U-5 | 沿用 |
| [TASK-037](tasks/TASK-037.md) | S6 | e2e 配置口径收敛：根 playwright.config.ts 唯一（138+64 例并表） | 外部Agent | Agent-Guard | sonnect | 中/5h | 006 | L8 | — | 沿用 |
| [TASK-038](tasks/TASK-038.md) | S6 | 单测覆盖率基线测量（web/shared，不设阈值） | 外部Agent | Agent-Guard | sonnect | 小/3h | 004 | L2 | — | 沿用 |
| [TASK-039](tasks/TASK-039.md) | S6 | 千级模型天梯量级基线（只测量，不优化） | 外部Agent | Agent-Guard | sonnect | 中/6h | 006 | L6 | — | 沿用 |
| [TASK-040](tasks/TASK-040.md) | S7 | 需求文档 v1.15 对齐代码事实与用户裁决 | Hark(主Agent) | Agent-Docs | opus | 中/4h | 009 | L13 | — | 沿用 |
| [TASK-041](tasks/TASK-041.md) | S7 | 台账拆分 + 勾选滞后补录 + CHANGELOG 补录 finalize 里程碑 | 外部Agent | Agent-Docs | haiku | 中/5h | 040 | L14 | — | 沿用 |
| [TASK-051](tasks/TASK-051.md) | S7 | 统一需求追溯矩阵入库 + 台账内部状态矛盾消解（#17/#36） | 外部Agent | Agent-Docs | sonnect | 中/3h | 041 | L15 | — | 沿用 |
| [TASK-042](tasks/TASK-042.md) | S8 | 备份/恢复演练脚本（pg_dump→restore→逐表行数比对） | 外部Agent | Agent-Guard | sonnect | 中/5h | 006 | L9 | U-3 | 沿用 |
| [TASK-052](tasks/TASK-052.md) | S8 | RC-02 遗留文档闭环：发布环境契约 + 发布回滚与恢复验收 | 外部Agent | Agent-Docs | sonnect | 小/4h | 042 | L18 | U-3 | 沿用 |
| [TASK-043](tasks/TASK-043.md) | S8 | 生产部署实弹（条件方案 A：自有服务器 docker compose prod） | Hark(主Agent) | Agent-Guard | opus | 大/16h | 042, 007, 003 | L10 | U-3 | 沿用 |
| [TASK-044](tasks/TASK-044.md) | S9 | Product.intro 契约扩展：screenshots（≤6，url/alt/caption） | 外部Agent | Agent-Contract | sonnect | 小/2h | 001 | L1 | U-4 | 沿用 |
| [TASK-045](tasks/TASK-045.md) | S9 | UI：介绍页截图画廊区块 + 后台 intro 编辑器截图条目 | Hark(主Agent) | Agent-App | opus | 中/8h | 044 | L2 | U-4 | 沿用 |
| [TASK-046](tasks/TASK-046.md) | S9 | S9 文档同步：合作产品内容配置 / 子平台介绍页 intro 字段登记 | 外部Agent | Agent-Docs | haiku | 小/1h | 045 | L19 | U-4 | 沿用 |
| [TASK-056](tasks/TASK-056.md) | S10 | 监控契约落地：monitoring.schema.ts（源/快照/观测/变更事件/管理端 DTO）+ 2 个新错误码 | Hark(主Agent) | Agent-Contract | opus | 中/4h | 001 | L4 | — | 新增 |
| [TASK-057](tasks/TASK-057.md) | S10 | 文档：模型源监控设计入库 + 需求文档新增 §3.4.2「模型源监控」+ 文档索引登记 | 外部Agent | Agent-Docs | sonnect | 中/4h | 056 | L16 | — | 新增 |
| [TASK-058](tasks/TASK-058.md) | S10 | 迁移 M-002：monitoring_sources / catalog_snapshots / provider_model_observations / catalog_change_events + 种子注册公开源 + 后台导航节点 | Hark(主Agent) | Agent-Data | opus | 大/8h | 011, 056 | L8 | — | 新增 |
| [TASK-059](tasks/TASK-059.md) | S10 | 仓储：目录快照与观测写入器（幂等、原始响应哈希、首次/末次出现） | 外部Agent | Agent-Data | sonnect | 中/5h | 058 | L9 | — | 新增 |
| [TASK-060](tasks/TASK-060.md) | S10 | 目录采集器框架 + 3 个公开源（OpenRouter /api/v1/models、AIHubMix /api/v1/models、Quanzil /api/pricing） | Hark(主Agent) | Agent-API | opus | 大/10h | 056 | L5 | — | 新增 |
| [TASK-061](tasks/TASK-061.md) | S10 | 变更检测：快照 diff → catalog_change_events（新上架/下架/价格变动/新模型首次出现）+ 证据链 | 外部Agent | Agent-API | sonnect | 中/6h | 059, 060 | L10 | — | 新增 |
| [TASK-062](tasks/TASK-062.md) | S10 | 调度脚本 monitor_catalogs.ts（按源 cron 运行 collector→writer→diff，单源失败不影响他源） | 外部Agent | Agent-Guard | sonnect | 小/3h | 061 | L11 | — | 新增 |
| [TASK-063](tasks/TASK-063.md) | S10 | 管理端 API：/api/v1/admin/monitoring/{sources, sources/:key, sources/:key/run, changes} | 外部Agent | Agent-API | sonnect | 中/6h | 058, 061 | L11 | — | 新增 |
| [TASK-064](tasks/TASK-064.md) | S10 | 后台 UI：「模型源监控」页（源分级卡片 + 健康/最后运行 + 变更流 + 手动运行，五态齐全） | Hark(主Agent) | Agent-App | opus | 大/10h | 063 | L12 | — | 新增 |
| [TASK-065](tasks/TASK-065.md) | S10 | E2E：后台监控页五态 + 手动运行后变更流出现新事件（fixture 源） | 外部Agent | Agent-Guard | sonnect | 中/4h | 062, 064, 037, 006 | L13 | — | 新增 |
| [TASK-066](tasks/TASK-066.md) | S11 | 公开 API：GET /api/v1/models/{id}/offerings（该模型在各监控源的上架与原币价格，含来源与采集时间） | 外部Agent | Agent-API | sonnect | 中/4h | 059, 056 | L10 | — | 新增 |
| [TASK-067](tasks/TASK-067.md) | S11 | 前台 UI：模型详情页「在哪里可调用」区块（多源上架/价格对比/中转风险提示/来源署名） | Hark(主Agent) | Agent-App | opus | 大/8h | 066 | L11 | — | 新增 |
| [TASK-068](tasks/TASK-068.md) | S11 | 上架同步：观测 → ProviderModelOffering（源↔平台实体映射，listedAt=firstSeenAt，isActive=isListed） | Hark(主Agent) | Agent-Data | opus | 大/8h | 059 | L10 | U-M5 | 新增 |
| [TASK-069](tasks/TASK-069.md) | S11 | 发现引擎汇率统一：pricing-extraction.ts 硬编码 7.2 → 读 system_configs pricing.fxUsdCny | 外部Agent | Agent-API | sonnect | 小/3h | 055 | L11 | U-15 | 新增 |
| [TASK-070](tasks/TASK-070.md) | S12 | 密钥源目录采集：SiliconFlow /v1/models、DeepSeek /models 等官方/托管目录（缺凭证时健康=credential_missing） | Hark(主Agent) | Agent-API | opus | 大/8h | 060 | L6 | U-M1 | 新增 |
| [TASK-071](tasks/TASK-071.md) | S12 | 可用性与中转真实性探针：最小请求探测 → ReliabilityObservation + 身份信号（含 Claude thinking signature 检查） | Hark(主Agent) | Agent-API | opus | 大/10h | 070 | L7 | U-M3 | 新增 |
| [TASK-072](tasks/TASK-072.md) | S12 | Artificial Analysis Data API v2 适配器重写（/api/v2/language/models/free，x-api-key，署名字段） | 外部Agent | Agent-API | sonnect | 中/4h | 056 | L5 | U-M2 | 新增 |
| [TASK-073](tasks/TASK-073.md) | S11 | llmtest 观测入时序：composite 分数/存活/通过计数写 ReliabilityObservation（不再只塞 description） | 外部Agent | Agent-API | sonnect | 中/4h | 058 | L9 | — | 新增 |
