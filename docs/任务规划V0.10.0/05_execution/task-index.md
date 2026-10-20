# 任务索引（task-index）

> 版本: v0.10 | 更新: 2026-10-20 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts）；TASK-087/037 收尾）

总计 **50** 张原子任务卡｜Hark(主Agent) **18** 张｜外部Agent **32** 张｜档位：haiku 9 / opus 18 / sonnect 23｜fable 0（仅在推翻冻结契约时启用）

执行者口径：用户指令「核心任务+高难度任务（尤其 UI 设计与实现）由主 Agent 完成，中等及简单任务发布后由其他 Agent 完成」。本轮仅规划，实施需用户另行批准（见 15_前提与局限.md）。

| 任务 | 切片 | 名称 | 执行者 | 所有权 Agent | 档位 | 规模/工时 | 依赖 | 层级 | 条件 | V0.10.0 状态 |
|---|---|---|---|---|---|---|---|---|---|---|
| [TASK-086](tasks/TASK-086.md) | S0 | 已移出卡独立复核：V0.8.0 判镜像落地的 22 张卡逐卡跑原验证命令并裁决 PASS/FAIL/UNKNOWN（补 e2e/真库/运行态证据） | Hark(主Agent) | Agent-Guard | opus | 中/6h | — | L0 | — | 未开工（Hark 核心） |
| [TASK-092](tasks/TASK-092.md) | S3 | UI 运行态验收：S2 功能开关页/入口隐藏/403 态 + S3 收藏按钮/控制台 Tab/筛选全选/价格档位（截图 + 五态核对） | Hark(主Agent) | Agent-Guard | opus | 中/4h | 086 | L1 | — | 未开工（Hark 核心） |
| [TASK-088](tasks/TASK-088.md) | S7 | 治理登记：目录结构文档登记 V0.8.0 树 + task-index 状态回写（依 EVD-086/091/092） + docs/执行过程.md 归档拆分 | 外部Agent | Agent-Docs | haiku | 小/2h | 086 | L1 | — | 未开工 |
| [TASK-006](tasks/TASK-006.md) | S0 | e2e-skeleton 实跑：本地复现 ci.yml e2e-skeleton 全步骤（PG16+Redis7、迁移重放、seed、build、:3000、smoke+walking-skeleton）+ Actions 首轮绿 run（U-25） | Hark(主Agent) | Agent-Guard | opus | 中/5h | — | L0 | — | 未开工（Hark 核心） |
| [TASK-098](tasks/TASK-098.md) | S10 | 快照写入器加固：空 items 不下架、分批 upsert 与事务超时、同 hash 并发返回既有快照 | 外部Agent | Agent-Data | sonnect | 小/2h | — | L0 | — | 未开工 |
| [TASK-099](tasks/TASK-099.md) | S12 | llmtest 观测落库前置：reliability_observations 幂等键口径 + entityId/窗口口径裁定（文档与单测，不建迁移） | 外部Agent | Agent-API | sonnect | 小/2h | — | L0 | — | 未开工 |
| [TASK-050](tasks/TASK-050.md) | S0 | CI verify 收尾：本地按 ci.yml 顺序复现 verify job 全部步骤 + coverage 目录入 .gitignore | 外部Agent | Agent-Guard | sonnect | 小/1h | — | L0 | — | 已完成（助手C e0e35c6，见 EVD-050） |
| [TASK-008](tasks/TASK-008.md) | S0 | OIDC 种子 wechat-rag 回调白名单按端口裁决对齐（保留 BotHot 3200；AideanBot 3333 按 P-2 补录） | 外部Agent | Agent-Data | haiku | 小/1h | — | L0 | P-2 | 条件·待裁决 |
| [TASK-084](tasks/TASK-084.md) | S6 | 核验：天梯页无页脚 + 台账 #19 admin 配置治理收口状态 | 外部Agent | Agent-Guard | haiku | 小/2h | 006 | L1 | — | 已完成·e2e 待复跑（助手B；需 C 改根配置收录 e2e 根 spec，见 EVD-084/deviation.md） |
| [TASK-055](tasks/TASK-055.md) | S4 | 种子：系统配置新增 pricing.fxUsdCny 默认行（值取 U-15 裁决） | 外部Agent | Agent-Data | haiku | 小/1h | 047 | L1 | U-15 | 条件·待裁决 |
| [TASK-047](tasks/TASK-047.md) | S4 | 计价口径归一契约：币种 CNY + 每百万 Token + 汇率配置键（EffectivePrice 扩展） | Hark(主Agent) | Agent-Contract | opus | 中/4h | — | L0 | U-15 | 条件·待裁决 |
| [TASK-048](tasks/TASK-048.md) | S4 | 生效价解析器接入币种/单位归一（网关扣费与读侧同口径） | Hark(主Agent) | Agent-API | opus | 中/8h | 047 | L1 | U-15 | 已完成（EVD-048） |
| [TASK-080](tasks/TASK-080.md) | S4 | 缓存命中 token 计价（priceCache / discountCache）接入网关扣费 | Hark(主Agent) | Agent-API | opus | 中/6h | 048 | L2 | U-15 | 已完成（EVD-080） |
| [TASK-081](tasks/TASK-081.md) | S4 | 后台价格批量写入 POST /api/v1/admin/prices/batch-upsert（requestId 幂等） | 外部Agent | Agent-API | sonnect | 中/5h | — | L0 | — | 未开工 |
| [TASK-049](tasks/TASK-049.md) | S4 | 存量价格行口径盘点脚本（只读：币种×计价单位×来源） | 外部Agent | Agent-Guard | sonnect | 小/3h | — | L0 | — | 已完成（助手C；PG16 实测 USD/CNY×per_1k_tokens×OFFICIAL 两组=1000 行；发现 F-049-01 seed USD 行单位标签与数值差 1000×，已由 TASK-048 迁移订正，复跑见 EVD-049/census-post-048.md） |
| [TASK-053](tasks/TASK-053.md) | S4 | UI：价格页/详情页统一 ¥/M 展示（附原币原价注记） | Hark(主Agent) | Agent-App | opus | 中/6h | 048 | L3 | U-15 | 条件·待裁决 |
| [TASK-030](tasks/TASK-030.md) | S4 | 计费集成 e2e：优惠窗口内按优惠价扣费、窗外按原价 | 外部Agent | Agent-Guard | sonnect | 中/6h | 006 | L1 | — | 未开工 |
| [TASK-031](tasks/TASK-031.md) | S4 | S4 文档同步：API 文档登记优惠端点 + 网关计费时序契约补生效价规则 | 外部Agent | Agent-Docs | haiku | 小/2h | 030 | L2 | — | 未开工 |
| [TASK-054](tasks/TASK-054.md) | S4 | S4b 文档同步：计价口径归一（网关计费时序契约 + API 文档 + 术语表） | 外部Agent | Agent-Docs | haiku | 小/2h | 053, 031 | L4 | U-15 | 条件·待裁决 |
| [TASK-032](tasks/TASK-032.md) | S5 | 搜索契约落地（search.schema.ts） | 外部Agent | Agent-Contract | sonnect | 小/2h | — | L1 | U-5 | 已完成（助手B 7bf9764d） |
| [TASK-033](tasks/TASK-033.md) | S5 | 搜索 API GET /api/v1/search（模型/产品/资讯，仅已发布） | 外部Agent | Agent-API | sonnect | 中/5h | 032 | L2 | U-5 | 已完成（助手B 993571c） |
| [TASK-034](tasks/TASK-034.md) | S5 | UI：顶栏搜索（桌面框 + 移动端展开 + 键盘导航） | Hark(主Agent) | Agent-App | opus | 中/8h | 033 | L3 | U-5 | 已完成（助手B c2adbf3） |
| [TASK-035](tasks/TASK-035.md) | S5 | e2e：搜索（命中/无结果/键盘跳转/移动端） | 外部Agent | Agent-Guard | sonnect | 小/3h | 034, 006 | L4 | U-5 | 已完成（助手B 99bf378） |
| [TASK-036](tasks/TASK-036.md) | S5 | S5 文档同步：API 文档登记搜索端点 + UI/界面交互文档补搜索 | 外部Agent | Agent-Docs | haiku | 小/2h | 035 | L6 | U-5 | 已完成（助手B） |
| [TASK-039](tasks/TASK-039.md) | S6 | 千级模型天梯量级基线（只测量，不优化） | 外部Agent | Agent-Guard | sonnect | 中/6h | 006 | L1 | — | 已完成·基线待复跑（助手B，无 PG/Redis 环境，见 EVD-039/deviation.md） |
| [TASK-040](tasks/TASK-040.md) | S7 | 需求文档 v1.15 对齐代码事实与用户裁决 | Hark(主Agent) | Agent-Docs | opus | 中/4h | — | L3 | — | 未开工（Hark 核心） |
| [TASK-041](tasks/TASK-041.md) | S7 | 台账拆分 + 勾选滞后补录 + CHANGELOG 补录 finalize 里程碑 | 外部Agent | Agent-Docs | sonnect | 中/5h | 040 | L4 | — | 已完成（助手C；未完成事项目录 v2.37 主表 + 回执分册 00–04，finalize tasks.md 补勾 15/17，CHANGELOG 补 finalize，见 EVD-041） |
| [TASK-051](tasks/TASK-051.md) | S7 | 统一需求追溯矩阵入库 + 台账内部状态矛盾消解（#17/#36） | Hark(主Agent) | Agent-Docs | opus | 中/3h | 041 | L5 | — | 未开工（Hark 核心） |
| [TASK-042](tasks/TASK-042.md) | S8 | 备份/恢复演练脚本（pg_dump→restore→逐表行数比对） | 外部Agent | Agent-Guard | sonnect | 中/5h | 006 | L2 | U-3 | 条件·待裁决 |
| [TASK-083](tasks/TASK-083.md) | S8 | 上线前 seed 演示数据人工审核门禁（清单生成 + 审核记录校验） | 外部Agent | Agent-Guard | sonnect | 小/3h | 042 | L3 | U-3 | 条件·待裁决 |
| [TASK-052](tasks/TASK-052.md) | S8 | RC-02 遗留文档闭环：发布环境契约 + 发布回滚与恢复验收 | 外部Agent | Agent-Docs | sonnect | 小/4h | 042 | L7 | U-3 | 条件·待裁决 |
| [TASK-043](tasks/TASK-043.md) | S8 | 生产部署实弹（条件方案 A：自有服务器 docker compose prod） | Hark(主Agent) | Agent-Guard | opus | 大/16h | 042 | L3 | U-3 | 条件·待裁决 |
| [TASK-044](tasks/TASK-044.md) | S9 | Product.intro 契约扩展：screenshots（≤6，url/alt/caption） | 外部Agent | Agent-Contract | sonnect | 小/2h | — | L0 | U-4 | 条件·待裁决 |
| [TASK-045](tasks/TASK-045.md) | S9 | UI：介绍页截图画廊区块 + 后台 intro 编辑器截图条目 | Hark(主Agent) | Agent-App | opus | 中/8h | 044 | L1 | U-4 | 条件·待裁决 |
| [TASK-046](tasks/TASK-046.md) | S9 | S9 文档同步：合作产品内容配置 / 子平台介绍页 intro 字段登记 | 外部Agent | Agent-Docs | haiku | 小/1h | 045 | L8 | U-4 | 条件·待裁决 |
| [TASK-061](tasks/TASK-061.md) | S10 | 变更检测：快照 diff → catalog_change_events（新上架/下架/价格变动/新模型首次出现）+ 证据链 | 外部Agent | Agent-API | sonnect | 中/6h | — | L0 | — | 未开工 |
| [TASK-062](tasks/TASK-062.md) | S10 | 调度脚本 monitor_catalogs.ts（按源 cron 运行 collector→writer→diff，单源失败不影响他源） | 外部Agent | Agent-Guard | sonnect | 小/3h | 061 | L1 | — | 未开工 |
| [TASK-063](tasks/TASK-063.md) | S10 | 管理端 API：/api/v1/admin/monitoring/{sources, sources/:key, sources/:key/run, changes} | 外部Agent | Agent-API | sonnect | 中/6h | 061 | L1 | — | 未开工 |
| [TASK-064](tasks/TASK-064.md) | S10 | 后台 UI：「模型源监控」页（源分级卡片 + 健康/最后运行 + 变更流 + 手动运行，五态齐全） | Hark(主Agent) | Agent-App | opus | 大/10h | 063 | L2 | — | 未开工（Hark 核心） |
| [TASK-094](tasks/TASK-094.md) | S10 | 后台导航登记「模型源监控」：admin-nav 新增 /admin/monitoring 叶（权限 admin.sync.read） | 外部Agent | Agent-Data | haiku | 小/1h | 064 | L3 | — | 未开工 |
| [TASK-065](tasks/TASK-065.md) | S10 | E2E：后台监控页五态 + 手动运行后变更流出现新事件（fixture 源） | 外部Agent | Agent-Guard | sonnect | 中/4h | 062, 064, 037, 006 | L3 | — | 未开工 |
| [TASK-066](tasks/TASK-066.md) | S11 | 扩展既有 GET /api/v1/models/[id]/stations：追加各监控源上架状态与原币价格（向后兼容，不新建 offerings 端点） | Hark(主Agent) | Agent-API | opus | 中/4h | — | L0 | — | 未开工（Hark 核心） |
| [TASK-067](tasks/TASK-067.md) | S11 | 前台 UI：模型详情页「在哪里可调用」区块（多源上架/价格对比/中转风险提示/来源署名） | Hark(主Agent) | Agent-App | opus | 大/8h | 066 | L1 | — | 未开工（Hark 核心） |
| [TASK-074](tasks/TASK-074.md) | S11 | UI：模型详情页基准测试弹窗 + 历史测评示例（多模型回答并排）替换「即将上线」占位 | Hark(主Agent) | Agent-App | opus | 大/10h | 067 | L2 | — | 未开工（Hark 核心） |
| [TASK-075](tasks/TASK-075.md) | S11 | e2e：模型详情页基准弹窗与测评示例 | 外部Agent | Agent-Guard | sonnect | 小/3h | 074, 006 | L3 | — | 未开工 |
| [TASK-068](tasks/TASK-068.md) | S11 | 上架同步：观测 → ProviderModelOffering（源↔平台实体映射，listedAt=firstSeenAt，isActive=isListed） | Hark(主Agent) | Agent-Data | opus | 大/8h | — | L0 | U-M5 | 已完成（EVD-068） |
| [TASK-069](tasks/TASK-069.md) | S11 | 发现引擎汇率统一：pricing-extraction.ts 硬编码汇率 → 读当日汇率快照 getDailyFx（缺汇率 fail-closed） | 外部Agent | Agent-API | sonnect | 小/3h | 055 | L2 | U-15 | 已完成（助手B） |
| [TASK-070](tasks/TASK-070.md) | S12 | 密钥源目录采集：SiliconFlow /v1/models、DeepSeek /models 等官方/托管目录（缺凭证时健康=credential_missing） | 外部Agent | Agent-API | sonnect | 大/8h | — | L0 | U-M1 | 条件·待裁决 |
| [TASK-071](tasks/TASK-071.md) | S12 | 可用性与中转真实性探针：最小请求探测 → ReliabilityObservation + 身份信号（含 Claude thinking signature 检查） | Hark(主Agent) | Agent-API | opus | 大/10h | 070 | L1 | U-M3 | 条件·待裁决 |
| [TASK-072](tasks/TASK-072.md) | S12 | Artificial Analysis Data API v2 适配器重写（/api/v2/language/models/free，x-api-key，署名字段） | 外部Agent | Agent-API | sonnect | 中/4h | — | L0 | U-M2 | 条件·待裁决 |
| [TASK-101](tasks/TASK-101.md) | S4 | 每日汇率采集（Frankfurter 公开免费源 → fx_daily_rates 日快照，幂等） | 助手B | Agent-API | sonnect | 小/3h | 047 | L2 | U-15 | 已完成（助手B，真 PG16 实跑见 EVD-101） |
