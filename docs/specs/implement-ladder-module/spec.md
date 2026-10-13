# 天梯图模块 Spec（先设计后开发）

> change-id: `implement-ladder-module` | 语言: 中文 | 创建: 2026-08-27
> 所属阶段: Phase 3 模块 1/4（继承 establish-dev-workflow 四层级/六字段规范）
> 设计准则: 需求文档 §3.1（两类榜单/两版本/两视图/六筛选/五排序）、界面交互文档 §三、功能设计文档 §3.1/3.2、目录结构文档 v2.0、UI设计文档 §3-5

## 为什么（Why）

天梯图是 Aidean 的核心产品形态与获客入口（需求文档：「用可视化排行榜 + 多维排序，扫一眼完成选型」）。Phase 0-2 已备齐全部前置：schema v2.0 的 vendors/ai_models/model_prices/model_scores/ranking_weights/ladder_charts/ladder_rankings 七表、@aidean/shared 的 models/ladder Zod 契约与常量、apps/web 的 features/ladder+ranking 脚手架、`/models` 占位路由。本模块按「设计先行→实现跟进」交付：**模型对比天梯图 + 大模型云服务天梯图两类榜单的前端渲染、后端数据服务、交互规范、数据缓存策略**。

## What Changes

**后端（数据层）**
- seed 扩展：演示厂商 22 家 / AI 模型 ≥60 个（含四维评分/价格/基准）/ ranking_weights 四维 / ladder_charts 两类榜单定义——对齐既有 seed.ts 数据资产迁移至新 schema 字段口径
- `features/ladder`：LadderService.getMatrix(type, filters, sort)——矩阵构建（行=评分档位 0.5 步长、列=厂商、单元格=模型）+ Redis 缓存读写（Key `ladder:matrix:{hash}` TTL 1h）
- `features/ranking`：RankingService.recapScores()——四维加权 composite_score 重算 + formula-parser 自定义公式求值（安全白名单运算符）
- API Routes：`GET /api/v1/models`（筛选列表分页）、`GET /api/v1/models/[id]`（详情 Tab1：参数表+价格+基准）、`GET /api/v1/models/[id]/stations`（Tab2 可用站点及资费）、`GET /api/v1/ladder?type=models|stations&...`（矩阵，全参进 filterHash）

**前端（视图层）**
- `/models` 页：模型对比天梯图真实渲染（替换占位）
- `/ladder` 新建：大模型云服务天梯图页（模型站榜）
- 组件：LadderFilterBar（六筛选即生效互斥展开）、LadderSortBar（五排序+自定义公式输入）、LadderMatrixTable（默认矩阵表：行档位色阶/列品牌色/hover 高亮行列）、LadderBarChart（EChartWrapper 动态加载柱状图）、VersionSwitcher（专业版/应用版）

**交互**
- 六筛选项：类型/协议/开源/测评集/标签/时间；多选项首项「全部」循环（全选→全不选→全选）；单次仅一个面板展开；即时生效无确认按钮
- 排序变更保留筛选状态；自定义公式解析错误以行内提示呈现且不阻断其他排序
- 表格/柱状图切换共用同一 matrixData 不重复请求；点击单元格跳模型详情

**数据(含缓存)**
- 读路径：请求 → filterHash → Redis GET → 命中返回 / 未命中 Prisma 聚合 → 写 Redis(TTL 3600s)
- 失效：ranking_weights 更新、seed 重跑、模型增改时按前缀 `ladder:matrix:*` 删除
- 降级：Redis 不可用时直查 DB（带 300ms slow-log 标记），不阻断页面

**BREAKING**: 无公开契约破坏（models/ladder.schema.ts 已在 Phase 1 定稿并被本模块首次消费）。

## Impact

- Affected specs: establish-dev-workflow（Phase 3 检查点 3-1~3-4 逐步核销）
- Affected code:
  - 后端: `apps/web/lib/features/{ladder,ranking}/**`（占位转实装）、`apps/web/app/api/v1/{ladder,models}/**`
  - 前端: `apps/web/app/(web)/{models,ladder}/**`、`apps/web/components/ladder/**`、`app/page.tsx` ModelSection 链接校正
  - 数据: `apps/web/prisma/seed.ts`（扩容演示数据）
  - 缓存: 复用 `lib/db/redis.ts`（若缺则新建 ioredis 单例）
- e2e 追加 `e2e/tests/ladder-matrix.spec.ts`

## ADDED Requirements

### Requirement: 双类榜单矩阵接口
系统 SHALL 提供 `GET /api/v1/ladder?type=models|stations` 返回 LadderMatrixResponse：rows[ consist of {tierLabel, scoreFrom, vendors:[{vendorId, vendorName, vendorColor, cells:[{modelId,modelName,compositeScore}]}]}]，全查询参数参与 hash 进缓存键。

#### Scenario: models 榜矩阵
- **WHEN** GET /api/v1/ladder?type=models（默认专业版/综合评分排序）
- **THEN** 200 信封响应，rows 按 tierLabel 降序，首行含最高分段模型

#### Scenario: stations 榜
- **WHEN** type=stations
- **THEN** 以 api_stations 维度出矩阵（端点维度/可用率/好评率/价格）

#### Scenario: 非法类型
- **WHEN** type=skills（已收敛弃用值）
- **THEN** 400 信封 code=20002「榜单类型非法」（Zod 校验拒绝）

### Requirement: 六维筛选与五排序
前端筛选栏 SHALL 支持 类型/协议/开源/测评集/标签/时间 即时过滤（change 即触发请求去重后的重取），排序栏支持 综合评分(默认)/上下文长度/响应速度/价格/自定义公式。

#### Scenario: 筛选即时生效
- **WHEN** 用户勾选 protocol=ANTHROPIC
- **THEN** 矩阵在 ≤600ms 内更新（去重并发），URL query 同步可分享回放

#### Scenario: 自定义公式容错
- **WHEN** 输入 `${综合评分}*0.6+${价格}/100]`（含非法括号）
- **THEN** 行内红字提示「公式语法错误」且表格维持上一次有效排序不闪空

### Requirement: 矩阵/柱状双视图同源
两个视图 SHALL 共享一次请求的 matrixData；柱状图经 EChartWrapper 动态 import 渲染（横轴厂商/纵轴分数）；切换零网络请求。

#### Scenario: 视图切换
- **WHEN** 表格态点击「柱状图」
- **THEN** 无 network 新请求（Playwright route 断言），柱状容器出现动画渲染

### Requirement: 读穿缓存与失效
ladder 服务 SHALL 实现读穿缓存：命中直接返回；未命中聚合后写 TTL 3600s；提供 invalidateLadderCache() 按 `ladder:matrix:*` 前缀批量删除。

#### Scenario: 二次命中走缓存
- **WHEN** 同参数连续两次请求
- **THEN** 第二次服务端日志含 cache:HIT 且 DB 层零查询（现有取证口径沿用）

#### Scenario: 权重变更失效
- **WHEN** 调用 recapScores() 且权重差异触发重算
- **THEN** 自动调用失效函数，后续请求 cache:MISS 回源新分数

### Requirement: 模型详情双 Tab
模型详情页 SHALL 提供左锚点目录（基本介绍/参数信息/基准测试/测评示例）平滑滚动高亮，Tab2「可用站点及资费」按价格升序列出该模型在各站的输入/输出单价。

#### Scenario: 详情访问
- **WHEN** GET /models/[slug]
- **THEN** 参数表含上下文长度/最大输出/开源/协议，价格三行小字（缓存/输入/输出 ¥/M Tokens）

## MODIFIED Requirements

### Requirement: /models 与首页入口链接
establish-dev-workflow 中 `/models` 为占位页——本模块升级为真实天梯图主页（保留原 H1），首页 ModelSection 链接由「→/models 占位链」校正为各真实子路径（模型对比→/compare 占位不变，云服务榜→/ladder 直达）。

## REMOVED Requirements

（无）

---

## 设计先行交付物（本 spec APPROVE 后、IMPLEMENT 前，作为首个 SubTask 产出并回贴于模块 README）

1. **数据流图**：浏览器 → RSC(`/models`) → LadderService → (Redis→DB) 矩阵 → SSR HTML；客户端筛选 → API(Hash) → 同 service —— 服务端与客户端共用同一 Service 与缓存层
2. **表关系引用**：ladder_charts(chartCode) ↔ LadderQuery.type 映射表（models→llm-professional，stations→station-overview）；ranking_weights.dimension ∈ {official,actual,review,selfTest}
3. **缓存键规范**：`ladder:matrix:v1:{type}:{version}:{hash12}`（hash12=murmur3(queryJSON) 截断）；版本号写死入常量，schema 口径变更时手动 bump 全量失效
4. **公式解析器白名单**：变量 `{score}` `{priceInput}` `{contextLength}`、运算符 `+ - * / ( )` 数字的 AST 求值，禁 Function/eval
