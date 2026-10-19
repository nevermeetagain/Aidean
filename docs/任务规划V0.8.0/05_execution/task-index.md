# 任务索引（task-index）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

总计 **92** 张原子任务卡｜Hark(主Agent) **31** 张｜外部Agent **61** 张｜档位：haiku 15 / opus 34 / sonnect 43｜fable 0（仅在推翻冻结契约时启用）

执行者口径：用户指令「核心任务+高难度任务（尤其 UI 设计与实现）由主 Agent 完成，中等及简单任务发布后由其他 Agent 完成」。本轮仅规划，实施需用户另行批准（见 15_前提与局限.md）。

| 任务 | 切片 | 名称 | 执行者 | 所有权 Agent | 档位 | 规模/工时 | 依赖 | 层级 | 条件 | V0.8.0 状态 |
|---|---|---|---|---|---|---|---|---|---|---|
| [TASK-085](tasks/TASK-085.md) | S0 | 叠加缺口回补与开发线裁决落地：把他线未进镜像的工件补齐，并书面确定后续开发线（B-0'） | 外部Agent | Agent-Guard | opus | 小/3h | — | L0 | — | 部分完成（事实方案B·增量叠加）·待裁决 B-0' |
| [TASK-086](tasks/TASK-086.md) | S0 | 他线 S0–S3 落地独立复核：30 张卡逐卡跑验证命令并裁决 PASS/FAIL/UNKNOWN（单测已由规划期先行实测） | Hark(主Agent) | Agent-Guard | opus | 中/6h | 089, 091 | L3 | — | 待 089、091 |
| [TASK-089](tasks/TASK-089.md) | S1 | 修复集成测试门控：persist-prices.int.spec.ts 改为显式开关 RUN_DB_TESTS=1，避免 CI 占位 DATABASE_URL 误触发 | Hark(主Agent) | Agent-Data | sonnect | 小/1h | 085 | L1 | — | 未开工（Hark 核心） |
| [TASK-090](tasks/TASK-090.md) | S7 | 文档层回灌：把他线 S0–S3 的文档同步内容（API 文档/数据库文档/功能设计/术语）合入镜像 docs/（排除规划目录） | 外部Agent | Agent-Docs | haiku | 中/4h | 085 | L1 | — | 未开工 |
| [TASK-091](tasks/TASK-091.md) | S1 | PG16 真库验证：空库迁移重放 + persistPrices 三次写价 + 收藏唯一约束（证据产出，不改代码） | 外部Agent | Agent-Guard | sonnect | 小/2h | 089 | L2 | — | 未开工 |
| [TASK-092](tasks/TASK-092.md) | S3 | UI 运行态验收：S2 功能开关页/入口隐藏/403 态 + S3 收藏按钮/控制台 Tab/筛选全选/价格档位（截图 + 五态核对） | Hark(主Agent) | Agent-Guard | opus | 中/4h | 086, 023, 078, 018 | L7 | — | 未开工（Hark 核心） |
| [TASK-087](tasks/TASK-087.md) | S7 | V0.5.0 规划树文件名 mojibake 修复（24 个双编码文件名 git mv 为正字 + 引用修正） | 外部Agent | Agent-Docs | haiku | 小/2h | 085 | L1 | — | 未开工 |
| [TASK-088](tasks/TASK-088.md) | S7 | 治理登记：目录结构文档登记 V0.8.0 树 + task-index 状态回写（依 EVD-086/091/092） + docs/执行过程.md 归档拆分 | 外部Agent | Agent-Docs | haiku | 小/2h | 086, 090 | L4 | — | 未开工 |
| [TASK-001](tasks/TASK-001.md) | S0 | 错误码唯一源迁入 shared + 删除冲突旧表 + 新增 3 码 + SystemReady 契约 | Hark(主Agent) | Agent-Contract | opus | 中/0h | 085 | L1 | — | 镜像已落地·单测 PASS |
| [TASK-002](tasks/TASK-002.md) | S0 | web 侧错误码改为从 shared 重导出（消除双源） | 外部Agent | Agent-API | sonnect | 小/0h | 001 | L2 | — | 镜像已落地·单测 PASS |
| [TASK-003](tasks/TASK-003.md) | S0 | 新增 GET /api/v1/system/ready（DB+Redis 就绪探针） | 外部Agent | Agent-API | sonnect | 小/0h | 002 | L3 | — | 镜像已落地·单测 PASS |
| [TASK-004](tasks/TASK-004.md) | S0 | 契约测试生成器（从 shared 契约自动生成契约测试） | 外部Agent | Agent-Guard | sonnect | 中/0h | 001 | L2 | — | 部分落地·生成器缺失 |
| [TASK-005](tasks/TASK-005.md) | S0 | 步行骨架 e2e：注册→登录→鉴权写→页面可见→错误信封 | 外部Agent | Agent-Guard | sonnect | 小/0h | 003 | L4 | — | 镜像已落地·e2e 未运行 |
| [TASK-006](tasks/TASK-006.md) | S0 | CI 新增 e2e-skeleton job（PG16+Redis7 服务容器、空库迁移重放、:3000 启动） | Hark(主Agent) | Agent-Guard | opus | 中/8h | 005, 004, 009 | L6 | — | 镜像未落地 |
| [TASK-007](tasks/TASK-007.md) | S0 | 守卫脚本：根目录污染 / 密钥扫描 / 模块边界 / 端口区间一致性（零新依赖） | 外部Agent | Agent-Guard | sonnect | 中/6h | 085 | L7 | — | 镜像未落地 |
| [TASK-050](tasks/TASK-050.md) | S0 | CI 门禁补齐：lint + @aidean/ui 单测进入 verify job | 外部Agent | Agent-Guard | sonnect | 小/2h | 007 | L8 | — | 镜像未落地 |
| [TASK-008](tasks/TASK-008.md) | S0 | OIDC 种子 wechat-rag 回调白名单按端口裁决对齐（保留 BotHot 3200；AideanBot 3333 按 P-2 补录） | 外部Agent | Agent-Data | haiku | 小/1h | 085 | L10 | P-2 | 条件·待裁决（非条件部分已满足） |
| [TASK-009](tasks/TASK-009.md) | S0 | S0 文档同步：API接口文档§4 全码表 + /system/ready 登记 + 双向锚 + 版本头 | 外部Agent | Agent-Docs | haiku | 小/3h | 003, 004, 005 | L5 | — | 镜像未落地（叠加排除 docs/） |
| [TASK-010](tasks/TASK-010.md) | S1 | 固化复现：PG16 集成测试证明二次写价违反唯一索引（规划期已在 PGlite PG16.4 复现 23505） | 外部Agent | Agent-Data | sonnect | 小/0h | 006 | L7 | — | 镜像已落地·门控缺陷 |
| [TASK-011](tasks/TASK-011.md) | S1 | ADR-P003 + 迁移 M-001：is_current 改为部分唯一索引（WHERE is_current） | Hark(主Agent) | Agent-Data | opus | 中/0h | 010 | L8 | — | 镜像已落地·真库未验 |
| [TASK-012](tasks/TASK-012.md) | S1 | persistPrices 修正：单模型仅一条 current、事务化 | 外部Agent | Agent-Data | sonnect | 小/0h | 011 | L9 | — | 镜像已落地·单测 PASS |
| [TASK-013](tasks/TASK-013.md) | S1 | S1 文档同步：数据库文档 model_prices 约束口径 + 台账登记缺陷闭环 | 外部Agent | Agent-Docs | haiku | 小/2h | 012 | L10 | — | 镜像未落地（叠加排除 docs/） |
| [TASK-014](tasks/TASK-014.md) | S2 | 功能开关契约落地（码枚举/公开 DTO/后台 DTO/受控面映射） | Hark(主Agent) | Agent-Contract | opus | 小/0h | 001 | L2 | — | 镜像已落地·单测 PASS |
| [TASK-015](tasks/TASK-015.md) | S2 | 开关服务 + 公开端点 + API 受控面接入（网关/测评/天梯站榜） | Hark(主Agent) | Agent-API | opus | 中/0h | 014, 002 | L3 | — | 镜像已落地·单测 PASS |
| [TASK-016](tasks/TASK-016.md) | S2 | 后台开关端点 GET/PATCH /api/v1/admin/feature-flags（审计+即时失效） | 外部Agent | Agent-API | sonnect | 小/0h | 014, 002 | L3 | — | 镜像已落地·单测 PASS |
| [TASK-017](tasks/TASK-017.md) | S2 | 后台菜单种子：新增「功能开关」入口（seed-navigation-menu + 默认树） | 外部Agent | Agent-Data | haiku | 小/0h | 016 | L4 | — | 镜像已落地·单测 PASS |
| [TASK-018](tasks/TASK-018.md) | S2 | UI：后台功能开关页 + 前台入口隐藏 + 功能关闭 403 态 | 外部Agent | Agent-App | opus | 大/0h | 015, 016, 017 | L5 | — | 镜像已落地·UI 待验收 |
| [TASK-019](tasks/TASK-019.md) | S2 | e2e：功能开关端到端（关→入口消失+API 50011→开→恢复） | 外部Agent | Agent-Guard | sonnect | 小/0h | 018, 006 | L7 | — | 镜像已落地·e2e 未运行 |
| [TASK-020](tasks/TASK-020.md) | S2 | S2 文档同步：API 文档登记 3 端点 + 功能设计 §3.9 实装口径 + 术语表 | 外部Agent | Agent-Docs | haiku | 小/2h | 019 | L11 | — | 镜像未落地（叠加排除 docs/） |
| [TASK-021](tasks/TASK-021.md) | S3 | 收藏契约落地（favorites.schema.ts） | 外部Agent | Agent-Contract | sonnect | 小/0h | 001 | L3 | — | 镜像已落地·单测 PASS |
| [TASK-022](tasks/TASK-022.md) | S3 | 收藏 API：GET/POST /api/v1/user/favorites + DELETE /[id] | 外部Agent | Agent-API | sonnect | 中/0h | 021, 015 | L4 | — | 镜像已落地·单测 PASS |
| [TASK-023](tasks/TASK-023.md) | S3 | UI：收藏按钮（详情页/天梯卡片）+ 控制台「我的收藏」Tab | 外部Agent | Agent-App | opus | 大/0h | 022 | L5 | — | 镜像已落地·UI 待验收 |
| [TASK-078](tasks/TASK-078.md) | S3 | UI 小修：天梯五维筛选「全部」全选/全不选 + 价格页充值档位改读 shared RECHARGE_TIERS | 外部Agent | Agent-App | sonnect | 小/0h | 023 | L6 | — | 镜像已落地·UI 待验收 |
| [TASK-079](tasks/TASK-079.md) | S3 | e2e：筛选「全部」全选/全不选 + 价格页档位一致 | 外部Agent | Agent-Guard | sonnect | 小/0h | 078, 006 | L7 | — | 镜像已落地·e2e 未运行 |
| [TASK-084](tasks/TASK-084.md) | S6 | 核验：天梯页无页脚 + 台账 #19 admin 配置治理收口状态 | 外部Agent | Agent-Guard | haiku | 小/2h | 006 | L7 | — | 未开工 |
| [TASK-024](tasks/TASK-024.md) | S3 | e2e：收藏端到端（收藏→控制台可见→取消→未登录引导） | 外部Agent | Agent-Guard | sonnect | 小/0h | 023, 006 | L7 | — | 镜像已落地·e2e 未运行 |
| [TASK-025](tasks/TASK-025.md) | S3 | S3 文档同步：API 文档登记收藏端点 + 数据库文档 favorites 由「零消费」改「已消费」 | 外部Agent | Agent-Docs | haiku | 小/2h | 024 | L12 | — | 镜像未落地（叠加排除 docs/） |
| [TASK-026](tasks/TASK-026.md) | S4 | 限时优惠契约落地（PromotionPrice*/EffectivePrice） | Hark(主Agent) | Agent-Contract | opus | 小/3h | 001 | L4 | — | 未开工 |
| [TASK-082](tasks/TASK-082.md) | S4 | 契约：PriceBatchUpsertSchema（rows≤500 + requestId） | Hark(主Agent) | Agent-Contract | opus | 小/2h | 001 | L5 | — | 未开工 |
| [TASK-055](tasks/TASK-055.md) | S4 | 种子：系统配置新增 pricing.fxUsdCny 默认行（值取 U-15 裁决） | 外部Agent | Agent-Data | haiku | 小/1h | 026, 047 | L11 | U-15 | 条件·待裁决 |
| [TASK-047](tasks/TASK-047.md) | S4 | 计价口径归一契约：币种 CNY + 每百万 Token + 汇率配置键（EffectivePrice 扩展） | Hark(主Agent) | Agent-Contract | opus | 中/4h | 026 | L7 | U-15 | 条件·待裁决 |
| [TASK-027](tasks/TASK-027.md) | S4 | 生效价解析服务 + 网关计费/前台展示接入 | Hark(主Agent) | Agent-API | opus | 大/12h | 026, 011 | L9 | — | 未开工 |
| [TASK-048](tasks/TASK-048.md) | S4 | 生效价解析器接入币种/单位归一（网关扣费与读侧同口径） | Hark(主Agent) | Agent-API | opus | 中/8h | 047, 027 | L10 | U-15 | 条件·待裁决 |
| [TASK-080](tasks/TASK-080.md) | S4 | 缓存命中 token 计价（priceCache / discountCache）接入网关扣费 | Hark(主Agent) | Agent-API | opus | 中/6h | 048 | L11 | U-15 | 条件·待裁决 |
| [TASK-028](tasks/TASK-028.md) | S4 | 后台限时优惠端点 /api/v1/admin/prices/promotions（CRUD+窗口不重叠校验） | 外部Agent | Agent-API | opus | 中/6h | 026, 011 | L9 | — | 未开工 |
| [TASK-081](tasks/TASK-081.md) | S4 | 后台价格批量写入 POST /api/v1/admin/prices/batch-upsert（requestId 幂等） | 外部Agent | Agent-API | sonnect | 中/5h | 082, 028 | L10 | — | 未开工 |
| [TASK-049](tasks/TASK-049.md) | S4 | 存量价格行口径盘点脚本（只读：币种×计价单位×来源） | 外部Agent | Agent-Guard | sonnect | 小/3h | 085 | L1 | — | 未开工 |
| [TASK-076](tasks/TASK-076.md) | S1 | 后端红线核验测试：字段所有权（sync 不覆盖人工字段）+ model_change_logs 全写入面 + 通用版等级固定序 | 外部Agent | Agent-API | sonnect | 中/0h | 085 | L1 | — | 镜像已落地·单测 PASS |
| [TASK-077](tasks/TASK-077.md) | S0 | OIDC 安全红线回归测试：PKCE 仅 S256 / refresh 重放撤整链 / host-only Cookie | 外部Agent | Agent-API | sonnect | 小/0h | 001 | L2 | — | 镜像已落地·单测 PASS |
| [TASK-029](tasks/TASK-029.md) | S4 | UI：后台优惠子表与创建对话框 + 前台优惠价徽标 | Hark(主Agent) | Agent-App | opus | 大/10h | 027, 028, 023 | L10 | — | 未开工 |
| [TASK-053](tasks/TASK-053.md) | S4 | UI：价格页/详情页统一 ¥/M 展示（附原币原价注记） | Hark(主Agent) | Agent-App | opus | 中/6h | 048, 029 | L14 | U-15 | 条件·待裁决 |
| [TASK-030](tasks/TASK-030.md) | S4 | 计费集成 e2e：优惠窗口内按优惠价扣费、窗外按原价 | 外部Agent | Agent-Guard | sonnect | 中/6h | 029, 006 | L11 | — | 未开工 |
| [TASK-031](tasks/TASK-031.md) | S4 | S4 文档同步：API 文档登记优惠端点 + 网关计费时序契约补生效价规则 | 外部Agent | Agent-Docs | haiku | 小/2h | 030 | L13 | — | 未开工 |
| [TASK-054](tasks/TASK-054.md) | S4 | S4b 文档同步：计价口径归一（网关计费时序契约 + API 文档 + 术语表） | 外部Agent | Agent-Docs | haiku | 小/2h | 053, 031 | L15 | U-15 | 条件·待裁决 |
| [TASK-032](tasks/TASK-032.md) | S5 | 搜索契约落地（search.schema.ts） | 外部Agent | Agent-Contract | sonnect | 小/2h | 001 | L8 | U-5 | 条件·待裁决 |
| [TASK-033](tasks/TASK-033.md) | S5 | 搜索 API GET /api/v1/search（模型/产品/资讯，仅已发布） | 外部Agent | Agent-API | sonnect | 中/5h | 032 | L9 | U-5 | 条件·待裁决 |
| [TASK-034](tasks/TASK-034.md) | S5 | UI：顶栏搜索（桌面框 + 移动端展开 + 键盘导航） | Hark(主Agent) | Agent-App | opus | 中/8h | 033, 018 | L10 | U-5 | 条件·待裁决 |
| [TASK-035](tasks/TASK-035.md) | S5 | e2e：搜索（命中/无结果/键盘跳转/移动端） | 外部Agent | Agent-Guard | sonnect | 小/3h | 034, 006 | L11 | U-5 | 条件·待裁决 |
| [TASK-036](tasks/TASK-036.md) | S5 | S5 文档同步：API 文档登记搜索端点 + UI/界面交互文档补搜索 | 外部Agent | Agent-Docs | haiku | 小/2h | 035 | L18 | U-5 | 条件·待裁决 |
| [TASK-037](tasks/TASK-037.md) | S6 | e2e 配置口径收敛：根 playwright.config.ts 唯一（138+64 例并表） | 外部Agent | Agent-Guard | sonnect | 中/5h | 006 | L9 | — | 未开工 |
| [TASK-038](tasks/TASK-038.md) | S6 | 单测覆盖率基线测量（web/shared，不设阈值） | 外部Agent | Agent-Guard | sonnect | 小/3h | 004 | L3 | — | 未开工 |
| [TASK-039](tasks/TASK-039.md) | S6 | 千级模型天梯量级基线（只测量，不优化） | 外部Agent | Agent-Guard | sonnect | 中/6h | 006 | L7 | — | 未开工 |
| [TASK-040](tasks/TASK-040.md) | S7 | 需求文档 v1.15 对齐代码事实与用户裁决 | Hark(主Agent) | Agent-Docs | opus | 中/4h | 009 | L14 | — | 未开工 |
| [TASK-041](tasks/TASK-041.md) | S7 | 台账拆分 + 勾选滞后补录 + CHANGELOG 补录 finalize 里程碑 | 外部Agent | Agent-Docs | sonnect | 中/5h | 040 | L15 | — | 未开工 |
| [TASK-051](tasks/TASK-051.md) | S7 | 统一需求追溯矩阵入库 + 台账内部状态矛盾消解（#17/#36） | Hark(主Agent) | Agent-Docs | opus | 中/3h | 041 | L16 | — | 未开工 |
| [TASK-042](tasks/TASK-042.md) | S8 | 备份/恢复演练脚本（pg_dump→restore→逐表行数比对） | 外部Agent | Agent-Guard | sonnect | 中/5h | 006 | L10 | U-3 | 条件·待裁决 |
| [TASK-083](tasks/TASK-083.md) | S8 | 上线前 seed 演示数据人工审核门禁（清单生成 + 审核记录校验） | 外部Agent | Agent-Guard | sonnect | 小/3h | 042 | L11 | U-3 | 条件·待裁决 |
| [TASK-052](tasks/TASK-052.md) | S8 | RC-02 遗留文档闭环：发布环境契约 + 发布回滚与恢复验收 | 外部Agent | Agent-Docs | sonnect | 小/4h | 042 | L19 | U-3 | 条件·待裁决 |
| [TASK-043](tasks/TASK-043.md) | S8 | 生产部署实弹（条件方案 A：自有服务器 docker compose prod） | Hark(主Agent) | Agent-Guard | opus | 大/16h | 042, 007, 003 | L11 | U-3 | 条件·待裁决 |
| [TASK-044](tasks/TASK-044.md) | S9 | Product.intro 契约扩展：screenshots（≤6，url/alt/caption） | 外部Agent | Agent-Contract | sonnect | 小/2h | 001 | L2 | U-4 | 条件·待裁决 |
| [TASK-045](tasks/TASK-045.md) | S9 | UI：介绍页截图画廊区块 + 后台 intro 编辑器截图条目 | Hark(主Agent) | Agent-App | opus | 中/8h | 044 | L3 | U-4 | 条件·待裁决 |
| [TASK-046](tasks/TASK-046.md) | S9 | S9 文档同步：合作产品内容配置 / 子平台介绍页 intro 字段登记 | 外部Agent | Agent-Docs | haiku | 小/1h | 045 | L20 | U-4 | 条件·待裁决 |
| [TASK-056](tasks/TASK-056.md) | S10 | 监控契约落地：monitoring.schema.ts（源/快照/观测/变更事件/管理端 DTO）+ 2 个新错误码 | Hark(主Agent) | Agent-Contract | opus | 中/4h | 001 | L6 | — | 未开工 |
| [TASK-057](tasks/TASK-057.md) | S10 | 文档：模型源监控设计入库 + 需求文档新增 §3.4.2「模型源监控」+ 文档索引登记 | Hark(主Agent) | Agent-Docs | opus | 中/4h | 056 | L17 | — | 未开工 |
| [TASK-058](tasks/TASK-058.md) | S10 | 迁移 M-002：monitoring_sources / catalog_snapshots / provider_model_observations / catalog_change_events + 种子注册公开源 + 后台导航节点 | Hark(主Agent) | Agent-Data | opus | 大/8h | 011, 056 | L9 | — | 未开工 |
| [TASK-059](tasks/TASK-059.md) | S10 | 仓储：目录快照与观测写入器（幂等、原始响应哈希、首次/末次出现） | 外部Agent | Agent-Data | sonnect | 中/5h | 058 | L10 | — | 未开工 |
| [TASK-060](tasks/TASK-060.md) | S10 | 目录采集器框架 + 3 个公开源（OpenRouter /api/v1/models、AIHubMix /api/v1/models、Quanzil /api/pricing） | Hark(主Agent) | Agent-API | opus | 大/10h | 056 | L7 | — | 未开工 |
| [TASK-061](tasks/TASK-061.md) | S10 | 变更检测：快照 diff → catalog_change_events（新上架/下架/价格变动/新模型首次出现）+ 证据链 | 外部Agent | Agent-API | sonnect | 中/6h | 059, 060 | L11 | — | 未开工 |
| [TASK-062](tasks/TASK-062.md) | S10 | 调度脚本 monitor_catalogs.ts（按源 cron 运行 collector→writer→diff，单源失败不影响他源） | 外部Agent | Agent-Guard | sonnect | 小/3h | 061 | L12 | — | 未开工 |
| [TASK-063](tasks/TASK-063.md) | S10 | 管理端 API：/api/v1/admin/monitoring/{sources, sources/:key, sources/:key/run, changes} | 外部Agent | Agent-API | sonnect | 中/6h | 058, 061 | L12 | — | 未开工 |
| [TASK-064](tasks/TASK-064.md) | S10 | 后台 UI：「模型源监控」页（源分级卡片 + 健康/最后运行 + 变更流 + 手动运行，五态齐全） | Hark(主Agent) | Agent-App | opus | 大/10h | 063 | L13 | — | 未开工 |
| [TASK-065](tasks/TASK-065.md) | S10 | E2E：后台监控页五态 + 手动运行后变更流出现新事件（fixture 源） | 外部Agent | Agent-Guard | sonnect | 中/4h | 062, 064, 037, 006 | L14 | — | 未开工 |
| [TASK-066](tasks/TASK-066.md) | S11 | 扩展既有 GET /api/v1/models/[id]/stations：追加各监控源上架状态与原币价格（向后兼容，不新建 offerings 端点） | Hark(主Agent) | Agent-API | opus | 中/4h | 059, 056 | L11 | — | 未开工 |
| [TASK-067](tasks/TASK-067.md) | S11 | 前台 UI：模型详情页「在哪里可调用」区块（多源上架/价格对比/中转风险提示/来源署名） | Hark(主Agent) | Agent-App | opus | 大/8h | 066 | L12 | — | 未开工 |
| [TASK-074](tasks/TASK-074.md) | S11 | UI：模型详情页基准测试弹窗 + 历史测评示例（多模型回答并排）替换「即将上线」占位 | Hark(主Agent) | Agent-App | opus | 大/10h | 067 | L13 | — | 未开工 |
| [TASK-075](tasks/TASK-075.md) | S11 | e2e：模型详情页基准弹窗与测评示例 | 外部Agent | Agent-Guard | sonnect | 小/3h | 074, 006 | L14 | — | 未开工 |
| [TASK-068](tasks/TASK-068.md) | S11 | 上架同步：观测 → ProviderModelOffering（源↔平台实体映射，listedAt=firstSeenAt，isActive=isListed） | Hark(主Agent) | Agent-Data | opus | 大/8h | 059 | L11 | U-M5 | 条件·待裁决 |
| [TASK-069](tasks/TASK-069.md) | S11 | 发现引擎汇率统一：pricing-extraction.ts 硬编码 7.2 → 读 system_configs pricing.fxUsdCny | 外部Agent | Agent-API | sonnect | 小/3h | 055 | L12 | U-15 | 条件·待裁决 |
| [TASK-070](tasks/TASK-070.md) | S12 | 密钥源目录采集：SiliconFlow /v1/models、DeepSeek /models 等官方/托管目录（缺凭证时健康=credential_missing） | 外部Agent | Agent-API | sonnect | 大/8h | 060 | L8 | U-M1 | 条件·待裁决 |
| [TASK-071](tasks/TASK-071.md) | S12 | 可用性与中转真实性探针：最小请求探测 → ReliabilityObservation + 身份信号（含 Claude thinking signature 检查） | Hark(主Agent) | Agent-API | opus | 大/10h | 070 | L9 | U-M3 | 条件·待裁决 |
| [TASK-072](tasks/TASK-072.md) | S12 | Artificial Analysis Data API v2 适配器重写（/api/v2/language/models/free，x-api-key，署名字段） | 外部Agent | Agent-API | sonnect | 中/4h | 056 | L7 | U-M2 | 条件·待裁决 |
| [TASK-073](tasks/TASK-073.md) | S11 | llmtest 观测入时序：composite 分数/存活/通过计数写 ReliabilityObservation（不再只塞 description） | 外部Agent | Agent-API | sonnect | 中/4h | 058 | L10 | — | 未开工 |
