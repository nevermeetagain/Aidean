# 术语表（规划增量）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0 术语补充（contracts/ 路径映射、叠加、镜像已落地）

> V0.9.0 承接说明（2026-10-19）：本文件正文为 **V0.8.0 原文**（基线 c2da219），其中「待裁决 B-0'/APPROVE/U-22」「未开工」等表述均指当时；**当前事实以 `25_执行记录.md`、`17g_V0.8.0到V0.9.0差异.md`、`05_execution/task-index.md` 为准**（B-0' 已裁决 A'；089/026/082/027/056/058/060/057 已完成）。契约唯一源仍为 `docs/任务规划V0.5.0/contracts/`。

| 术语（唯一名） | 英文/代码名 | 定义 | 禁用别名 |
|---|---|---|---|
| 契约唯一源 | packages/shared | 前后端共享的 zod schema 与常量所在位置；冻结稿落地后以此为准 | 「双源对齐」 |
| 冻结稿 | contracts/*.contract.ts | 本规划给出的待落地契约精确内容，实施期只读 | — |
| 错误码 | ERROR_CODES | 5 位业务码（段位 1–5xxxx），与 HTTP 状态分离 | 「错误号」 |
| 就绪探针 | /api/v1/system/ready | 探测 DB 与 Redis 可用性的端点；区别于只表示进程存活的 health | 「健康检查」（指 health） |
| 功能开关 | FeatureFlag / flagCode | 以码（如 ladder.station）控制模块开/关：关闭则入口隐藏、页面 403 态、API 50011 | 「特性开关」「feature toggle」 |
| 功能关闭态 | FeatureDisabled | 页面在开关关闭时呈现的 403 状态 | — |
| 收藏 | Favorite | 登录用户对模型（MODEL）或模型站（API_STATION）的标记 | 「关注」「收藏夹」 |
| 限时优惠 | PROMOTION 价格行 | `source_type=PROMOTION` 且有 [from, until) 窗口的价格行，窗口内替代官方价 | 「折扣活动」 |
| 生效价 | EffectivePrice | 某时刻用于展示与计费的单价（优惠优先，否则当前官方价） | 「实时价」 |
| 步行骨架 | Walking Skeleton（S0） | 最小端到端闭环：ready + 鉴权写 + 表 + 迁移重放 + 真实页面 + 统一错误 | — |
| 切片 | Slice（S0–S9） | 端到端可演示的增量 | 「模块」「阶段」（指技术层时） |
| 资源锁串行边 | lock edge | 两任务允许修改路径重叠时强制的先后顺序 | — |
| 独立验证者 | Verifier | 只看 diff + 运行结果输出 PASS/FAIL/UNKNOWN 的角色 | — |
| 主 Agent / 外部 Agent | Hark / External | 前者执行核心与 UI 卡，后者执行中/简单卡 | — |

## V0.2.0 复核增补

| 术语（唯一名） | 英文/代码名 | 定义 | 禁用别名 |
|---|---|---|---|
| 计价口径归一 | PRICE_NORMALIZATION | 把任意价格行（原币 × 原单位）换算为 CNY / 每百万 Token 的唯一规则；计费与展示共用 | 「汇率换算」（单指币种时）、「折算」 |
| 原币原价 | sourcePrice | 价格行入库时的官方币种与单位下的价格，前台注记展示 | 「美元价」 |
| 条件卡 | cond task | 依赖用户 BLOCKING 裁决（U-3/U-4/U-5/U-15/P-2）才下发的任务卡 | 「待定任务」 |
| 统一需求追溯矩阵 | RTM | 需求→分级→实现状态→证据→任务 的唯一追溯表（本规划 03a；入库后为 docs/product/requirements/需求追溯矩阵.md） | 「需求清单」「台账」（台账另指未完成事项目录） |
| 端口区间 | port range | 各项目宿主对外端口的百段区间（Aidean 3000–3100 等），以用户裁决为准 | 「端口段」 |

## V0.4.0 新增术语（全项目唯一命名）
| 术语 | 定义 | 代码名 |
|---|---|---|
| 监控源 | 注册表中的一个可采集目录/榜单来源 | `monitoring_sources` / `MonitoringSource` |
| 源分级 | 结构性风险分层 S1 原厂 / S2 云厂商 / A 托管推理 / B 聚合路由 / C 中转（不是 SLA） | `SOURCE_TIERS` |
| 目录快照 | 某源某次采集的元数据（sha256/条目数/采样） | `catalog_snapshots` |
| 上架观测 | 某源中某外部模型的当前状态（在列/原币价/首末次出现） | `provider_model_observations` |
| 规范化模型 ID | 跨源关联用的 ID，只用于展示关联，不自动合并 | `normalizedModelId` |
| 变更事件 | listed / delisted / price_changed / model_first_seen | `catalog_change_events` |
| 条款状态 | allowed / attribution_required / pending / forbidden | `tos_status` |
| 身份信号 | 中转站模型真实性的弱证据（如 thinking signature 存在性） | `identitySignal` |


## V0.7.0 追加
| 术语 | 唯一含义 | 不得混用 |
|---|---|---|
| 镜像线 / 镜像 main | nevermeetagain/Aidean 的 main 分支，用户指定的规划落点 | 「主仓」「上游」 |
| 工作线 / 他线 | aideanew/Aidean 的 huaweicloud 分支（私有），V0.6.0 所称实现所在 | 「真实代码」（未核验前不得如此称呼） |
| 主线归一 | 使执行目标仓与规划推送仓为同一业务树（TASK-085） | 「同步」（泛指） |
| 快照同步 | 以一个普通提交把工作线树写入镜像 main，并快进推送（77c7952 惯例） | 强推、rebase |
| 他线复核 | 独立验证者按卡内验证命令判定他线成果（TASK-086），只输出 PASS/FAIL/UNKNOWN | 「验收」（泛指） |
| 契约稿唯一源 | docs/任务规划V0.5.0/contracts/（实施后以 packages/shared 为运行时唯一源） | 其他版本目录下的 contracts |

## V0.8.0 补充（2026-10-19）
| 术语 | 唯一含义 | 备注 |
|---|---|---|
| contracts/（代码注释中的路径） | = `docs/任务规划V0.5.0/contracts/`（契约唯一源，7 份 *.contract.ts） | 根目录 contracts/ 不存在；物理迁移待 U-20（D8-07） |
| 叠加（overlay） | 他线把 huaweicloud 某区间的文件快照以快进提交写入镜像 main，不保留原提交粒度 | 规则见 ADR-P009 |
| 镜像已落地 | 代码文件已在镜像 main 且类型/单测已由规划期复现；**不等于 Done** | Done 仍按 current-plan 七项 |
