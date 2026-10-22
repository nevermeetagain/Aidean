# API 架构设计方案（主平台）

> 版本: v1.19 | 更新: 2026-10-22 | 变更: **B11-03a 新建 §7.14 协议/能力矩阵运营化边界**（anchor `matrix-architecture`）——维度唯一真源、分层（路由零业务→service）、错误码复用、审计口径、回填写入路径与不覆盖人工行；与《API接口文档》v1.62 §5.8.11 双向互引（铁律 2）。
> 前次（v1.18） | 更新: 2026-10-20 | 变更: **TASK-031 新建 §7.13 生效价与优惠价边界**（anchor `effective-price-architecture`）——优惠价写侧四约束（billing 三元组派生/窗口必填半开/禁重叠/Serializable）、生效价唯一解析与消费方同源；与《API接口文档》v1.59 §5.8.10 双向互引（铁律 2）。
> 前次（v1.17 | 更新: 2026-10-20）变更: **TASK-036 S5 顶栏全局搜索架构边界 §7.12（V0.10.0 / REQ-C-002 / SOL-S5）**——新建 §7.12（anchor `search-architecture`）登记 `GET /api/v1/search`（API-012）的架构强制约束：契约唯一源 `packages/shared/src/schemas/search.schema.ts`、路由零业务（解析→限流→`SearchQuerySchema`→`searchAll`→`withApi` 信封）、三路 `Promise.all` 并发 + `contains/insensitive` 不建扩展不加索引、可见性口径与公开列表同源、IP 级固定窗口限流 fail-open、前端唯一入口（SiteHeader 桌面 / MobileNav 抽屉）；与《API接口文档》v1.58 §5 search 行建立铁律 2 双向互引锚。前次（v1.16 | 更新: 2026-10-19 | 变更: **TASK-025 S3 收藏架构边界 §7.11（V0.9.0 / REQ-F-052 / SOL-S3）**——新建 §7.11（anchor `favorites-architecture`，090 §5.4.2 预留本锚由本卡补登）登记收藏（favorites）数据模型与架构强制约束：`Favorite` 表结构（id uuidv7 / userId / refType `FavoriteType`∈{MODEL,API_STATION} / refId / note? / createdAt，onDelete Cascade）、`@@unique[userId,refType,refId]` 幂等键、分层职责（路由零业务→service 校验/20003/防枚举→repository `prisma.favorite`→契约 DTO）、反 N+1 target 投影（每 refType 恰一次 IN）、目标存在性口径（未软删）、受控面 `requireFeature("favorites.enabled")` 先于鉴权；与《API接口文档》v1.54 §5.4.2 建立铁律 2 双向互引锚。前次（v1.15 | 更新: 2026-10-19 | 变更: **TASK-020 功能开关运行时边界 §7.10（V0.9.0 / REQ-F-041 / DESIGN-001）**——新建 §7.10（anchor `feature-flag-runtime-architecture`，090 §5.8.9 预留本锚由本卡补登）登记功能开关运行时架构约束：7 码唯一真源（seed + `feature-flags.spec` 漂移守卫）、public(API-002 仅布尔)/admin(API-003/004 全投影)双读面分工（DESIGN-001 隐私边界：公开面不泄露 rollout/config/时间窗）、关闭态三重生效（入口隐藏+页 403+API `50011`）、`unstable_cache` tag `feature-flags` 与 PATCH 先 `revalidateTag` 后 `writeAudit` 的即时失效顺序、编辑白名单与幂等；§四 功能开关条由「返回 403」精炼为「返回 `50011 FEATURE_DISABLED`→HTTP 403，守卫先于鉴权」并指向 §7.10；与《API接口文档》v1.53 §5.7（API-002）/§5.8.9（API-003/004）建立双向互引锚（铁律 2）。前次（v1.14 | 更新: 2026-10-19 | 变更: **TASK-009 §三 建错误码统一治理双向互引锚（V0.9.0）**——§三 错误码段位 加 `<a id="error-code-unified-architecture">` 锚点，并把原「权威见《API接口文档》§4」纯文本升级为显式回链（铁律 2）：全码表 27 码 + 唯一源 `packages/shared/src/errors.ts` + `gen-contract-tests.mjs` 解析生成契约 + CI 漂移门（文档↔代码一致）口径归档于本节。与《API接口文档》v1.52 §4 建立双向互引锚。前次（v1.13 | 更新: 2026-10-13 | 变更: **§7.9 补 reports 域金额分级与 RSC 页级守卫（finalize-admin-ia-and-ops-gaps S9·B2）**——报表含充值收入金额，为 `reports` 建独立权限域（`ADMIN_DOMAINS` 29→30 域×{read,write}=60 原子）；`reports/overview` 端点由无参 `requireAdminApi()` 总闸改为强制 `admin.reports.read`；MODERATOR 系统角色权限集显式排除 `admin.reports.*`（`permissions.ts` `MODERATOR_READ` filter）；端点 403 + `/admin` 概览紧凑看板/`/admin/reports` 专属页服务端 session 隐藏 + 侧栏 `filterNavByPerms` 剪枝三处同口径（越权不泄金额）；`/admin/reports`·`/admin/menus`·`/admin/logs` 补页级 `hasPermission` redirect 守卫。新增域后 `seed-rbac` 需重跑落 Permission 表。与《API接口文档》v1.50 §5.8.6 保持双向互引锚（铁律 2）。前次（v1.12 | 更新: 2026-10-12 | 变更: **新增 §7.9 管理端信息架构重构域边界（restructure-admin-nav-rbac-cms S2-S8·已实施）**——登记 /admin 一次性重构的架构强制约束：权限模型 A2（接口级 RBAC，`requireAdminApi(permission)` 后端逐接口强制，前端隐藏入口非授权依据）+ B2（独立 Role 实体 + 用户-角色多对多，SUPER_ADMIN 通配 `*`，跨域概览走无参 isStaff 入场总闸）、菜单库驱动 `NavigationMenu(scope='ADMIN')` 唯一真源（禁硬编码，幂等 seed-navigation-menu）、CMS 可见即可改（S4 SystemConfig 白名单键 + site-config 读服务 + 兜底）、日志中心只读聚合（S5，账本不可删改，分页 `Math.min(100)` 封顶）、财务账本仅处置不可改写（S6 REVERSAL 反向分录 + CAS 冲正，禁直接 UPDATE 历史）、报表只读 `usage_daily_stats` 日汇总（S8.1，禁扫 usage_logs 明细，`fenToYuan` 分→元，图表 option 纯函数 builder）、批量并发 `Promise.all`（S8.4）、移动端抽屉 `AdminMobileNav`（S8.2）、死表保留裁决（S8.5）。与《API接口文档》v1.46 §5.8.6 建立双向互引锚（铁律 2）。前次（v1.11 | 更新: 2026-10-10 | 变更: **新增 §7.8 上游协议四值扩展与中枢扇出（M3·已实现）**——登记 `GATEWAY_FORMATS`（上游/渠道协议）由 openai/anthropic 两值扩为 **openai/anthropic/openai-responses/gemini** 四值后的适配层约束：`adapters.ts` 以 OpenAI 为中枢（hub-and-spoke）的双向转换矩阵、同格式零拷贝透传、跨格式强制聚合回转（`isPassthroughSafe`）、与「接入体裁」`GATEWAY_ACCESS_FORMATS`（恒 4）的正交关系、wire↔enum 边界映射、跨格式禁透传守护。与《API接口文档》v1.44 §5.4 `custom-channels`/`gateway/chat` 行建立专向互引锚（铁律 2）。前次（v1.10 | 2026-10-10）：**§7.7 面板名口径同步**——UI 面板「API 渠道」更名「外部渠道」（纯文案，端点/`kind` 字段不变），§7.7 措辞对齐。前次（v1.9 | 2026-10-08）：**新增 §7.7 API 渠道聚合边界（乙 · 后端统一 · 已实现）**——登记 `GET /api/v1/user/channels` 的单一事实源（禁前端拼装）、不合成 `catalog:<code>` 伪行、kind 归一、排序契约与格式推导、数据隔离与脱敏；与《API接口文档》§5.4 `channels` 行建立专向互引锚（铁律 2）。前次（v1.8 | 2026-10-08）：**新增 §7.6 官方平台目录与渠道调度边界（N3 丁 / N4 丙 · 已实现）**——登记 `catalog:<code>` 命名空间解析为 `api_stations` 真实 UUID 的幂等语义（baseUrl 命中复用/未命中兜底建站+UPSTREAM 计费/未知 code 拒造站），以及 `CustomChannel` 的 `models/priority/groupName/weight` 四键契约与 FREE_PROXY 分发顺序（先模型过滤→优先级升序→同组加权→级联降级）；与《API接口文档》§5.4 两行建立专向互引锚（铁律 2）。前次（v1.7 | 2026-10-04）：**新增 §7.5 用量统计聚合读侧边界（WF-21 · 已实现）**——补登 `GET /api/v1/user/usage/stats` 的架构约束（只读 `usage_daily_stats`/禁扫 `usage_logs`/range 硬上限/维度边界），与《API接口文档》§5.4 建立专向互引锚（铁律 2 收口；审计轮发现 v1.39 登记 stats 端点时本节缺失，本轮补齐并配 facts 断言 `usage-stats-anchor-pair` 防复发）。前次（v1.6 | 2026-09-22）：新增 §7.4 采集/评测域 admin 边界（**规划登记 · 未实现**）——界定 `sync/*` 与 `benchmarks/*` 两组的职责、表归属与「用户侧 evaluations 已实现 vs 平台侧 benchmarks 未实现」的边界，防止混用）
> 前一版（v1.5 | 2026-09-18）：新增 §7.3 资讯 Markdown 存储与渲染边界（news-admin-cms）
> 配套：功能设计文档、目录结构文档。

> 前次（v1.2）：路由分层新增 gateway/ packages/ redemption/；网关接口纳入 MVP 契约测试范围

## 一、路由分层

统一前缀 **`/api/v1/`**，按业务域划分子路由：

```
/api/v1/
├── auth/        登录 注册 刷新 登出 me
├── models/      列表 排名 详情 基准
├── ladder/      天梯图数据（models / stations）
├── favorites/   收藏（增删查）
├── evaluations/ 测评（历史/运行）
├── finance/     余额 交易 充值
├── stations/    模型站（大模型云服务天梯图）：列表 详情 评价 价格
├── gateway/     统一计费网关（chat 协议中转 优先级降级 控制台配置 自定义渠道 用量）
├── packages/    套餐（列表 余额兑换）
├── redemption/  兑换码（余额码 定向套餐码核销）
├── support/     工单 咨询
├── system/      健康检查 统计 配置 公告
└── admin/       管理后台（withAdmin 鉴权）
```

页面内 AJAX / 桌面端 / 移动端统一调用同一套 API。

## 二、统一响应结构

> 信封与错误码口径以《API接口文档》§4 为权威，本文档保持一致，不另立标准。

```jsonc
{
  "code": 0,              // 0 表示成功；非 0 为「模块编码+序号」业务错误码
  "message": "ok",        // 成功为 "ok"，失败为可读信息
  "data": { },            // 业务数据；失败时通常为 null
  "requestId": "uuid"
}
```

- 成功：`code=0`，`data` 承载结果。
- 失败：`code` 为业务错误码（如 `10001` 用户不存在、`30002` 模型站不可用），`message` 描述，`data=null`。
- 所有响应经统一封装（`successResponse` / `errorResponse` / `badRequest`）。
- 分页信息放在 `data.pagination`（详见 §五）；`requestId` 贯穿日志便于串联。

<a id="error-code-unified-architecture"></a>
## 三、错误码段位（全码表权威见《API接口文档》§4）

本平台**不使用 HTTP 状态码作为业务错误码**，统一采用「模块编码 + 序号」：

| 段位 | 域 | 示例 |
|---|---|---|
| 1xxxx | 用户 / 认证 | `10001` 用户不存在 |
| 2xxxx | 模型 / 天梯 | `200xx` 模型/榜单相关 |
| 3xxxx | 模型站 / 统一 API | `30002` 模型站不可用 |
| 4xxxx | 财务 | `400xx` 余额/交易相关 |
| 5xxxx | 系统 | `500xx` 服务内部错误 |

> 完整端点清单与**全量错误码表（27 码 · 码位/标识/HTTP/语义/前端展示）**以《API接口文档》为权威：[§4 统一响应](API接口文档.md#4统一响应)。错误码唯一源为 `packages/shared/src/errors.ts`（`ERROR_CODES`/`DEFAULT_STATUS_BY_CODE`/`ERROR_PRESENTATION`）；《API接口文档》§4 登记表由 `scripts/contract/gen-contract-tests.mjs` 解析生成 `packages/shared/src/__tests__/contract/errors.generated.spec.ts`，CI 以「重生成 + `git diff --exit-code`」漂移门守文档↔代码一致（先登记后实现，改 §4 必同步重生成）。本文档聚焦 API 架构分层、鉴权中间件、分页/限流/缓存策略与契约测试（铁律 2 双向互引）。

## 四、鉴权与权限

- **用户态**：`Authorization: Bearer <JWT>`；`withAuth` 解析并注入 `userId`。
- **管理员**：`withAdmin` 校验角色，失败返回 403。
- **公开接口**：榜单/模型/模型站等无需登录；登录态接口（余额/交易/收藏）未登录返回 403 且不泄漏他人数据。
- **功能开关**：关闭的受控模块 API 返回 `50011 FEATURE_DISABLED`（HTTP 403），路由守卫先于鉴权；运行时边界（7 码真源 / public·admin 双读面 / 缓存即时性 / 幂等）见 [§7.10 功能开关运行时边界](#feature-flag-runtime-architecture)。

## 五、分页 / 限流 / 缓存

- **分页**：`page` + `pageSize`（默认 20），响应 `meta.pagination`。
- **限流**：Redis 滑动窗口（`lib/api/middleware/rate-limit.ts`），按路由/用户维度。
- **缓存**：列表/排名走 Redis（`models:v1:list:{hash}` 等，1h）；写操作后按 Key 规范失效。

## 六、契约测试

- `e2e/web/api-auth-contract.spec.ts`：覆盖"伪造 Token 被拒""未登录不返回他人交易"等契约断言。
- 网关契约（MVP）：计费公式正确性、降级链触发、free 模型兜底、加价率与 Token 倍率不出现在任何公开响应。
- 接口变更需同步更新本文档与契约测试。

<a id="partner-content-architecture"></a>
## 七、合作内容隔离与读取

[合作产品](../governance/术语表.md#合作产品)复用 [SystemConfig](../governance/术语表.md#systemconfig) 三个白名单键，不改 Product 模型、不插入合作 Product、不引入迁移，防止 `/products` 全 ACTIVE 查询混入合作项。共享契约先行：`site-content.schema.ts` 定义内容、默认值与媒体校验，`admin.schema.ts` 注册键，注册表分派 normalizeConfigValue；路由仅复用管理员守卫、upsert、审计和失效机制。

`/partners` 为 force-dynamic 服务端页，选择性读三键并逐项严格解析；缺失/异常回退待完善资料，合法 enabled=false 保持隐藏。[SafeImage](../governance/术语表.md#safeimage) 与原生 video 在浏览器加载媒体，不提供任意 URL 服务端代理/优化。URL 后缀校验不是 MIME、体积或第三方可用性保证。

不更改响应信封或既有键值规则。部署无需 seed 或迁移；2026-09-17 真实后台保存→公开页回读→数据还原闭环已取证（见《[导航与内容页面验收](../archive/导航与内容页面验收.md)》）；媒体宽窄屏溢出检查 375px/1440px 均通过，素材视觉审美仍待用户确认。

本节端点、字段及错误码互引：[合作内容配置契约](API接口文档.md#partner-content-api)。

<a id="about-contact-architecture"></a>
### 7.2 关于页联系方式键与占位边界

`about.contactEmail`（`kind:email`：trim 后必填 + 邮箱格式 + ≤200）与 `about.wechatQrUrl`（`kind:qrImage`：允许空串且空串语义为「前台显示待上传占位」；非空须过 `isSafeMediaUrl` 图片白名单，拒绝 SVG 以杜绝嵌入式脚本）注册于同一 ADMIN_CONFIG_REGISTRY，共享 PUT 归一化、审计与 revalidate 路径，不新增端点、不新增表。

`/about` 为 force-dynamic 服务端页：DB 不可用时回退默认邮箱与「二维码待上传」占位 UI，页面保持可出、不 500、不引用占位图片文件。展示尺寸由 [SafeImage](../governance/术语表.md#safeimage) 固定为 200px 方形（服务端复核 URL + 客户端 onError 兜底），用户素材任意大小不影响版式——把「用户传多大显示多大」的可能性从渲染层排除。

接口、字段及错误码互引：[关于页联系方式配置契约](API接口文档.md#about-contact-api)。

<a id="news-architecture"></a>
### 7.3 资讯 Markdown 存储与渲染边界（news-admin-cms）

[NewsItem](../governance/术语表.md#newsitem) 为独立 Prisma 模型（`news_items` 表），不扩 SystemConfig、不与 Product 混用。数据库**只存 Markdown 源文**（`contentMarkdown`），不落 HTML：编辑回读即库内原文，重编辑无损；HTML 仅在前台 SSR 渲染时按次生成。

渲染管线为三段固定顺序，任一环节失败不得静默降级为 `dangerouslySetInnerHTML` 原文：① `normalizeMarkdown`——把全角括号链接 `（url）` 归一为半角、保留半角括号内的 `()` `[]` 成对链接写法（如 `[a](https://x/a(b)c)`、维基百科 `A_(B)`），这是用户第 3 点的兼容硬需求；② `marked`（gfm + breaks）转 HTML；③ `sanitize-html` 白名单清洗（`a` 允许 `href`/`target`/`rel` 并补 `noopener`，`img` 仅 `isSafeMediaUrl` 白名单域，script/style/事件属性一律剥离）。XSS 防线在渲染层而非编辑层：管理员可写 `<script>`，前台不可能执行。

排序与过滤契约：列表恒为 `pinned DESC → publishedAt DESC → createdAt DESC`，置顶恒前（用户第 1 点）；分类经 [资讯分类](../governance/术语表.md#资讯分类) 白名单校验，`?cat=` 非法值按未过滤处理、不报错。前台 SSR（force-dynamic）读到 DB 为空时回退 `static-articles.ts` 静态兜底——与 seed 共享同一数据源，避免两套真源；DRAFT 或未知 slug → `notFound()` 走资讯段 scoped `not-found.tsx`。已知偏差：`app/(site)/loading.tsx` 的 Suspense 壳使全部 `(site)` 路由流式响应码锁 200（与 `/models/[slug]` 站点既有行为一致），HTTP 状态码不恢复 404，但视口内容确为 404 视图。

写路径：管理端 CRUD 全部 `requireAdminApi` + AuditLog（action 1/2/3），成功即 `revalidatePath("/news")`。构建约束：`next.config.mjs` 的 `experimental.serverComponentsExternalPackages` 必须含 `sanitize-html`——其依赖 htmlparser2@12 为纯 ESM，webpack 无法打进服务端 bundle；运行侧 Node ≥22.12 的 `require(esm)` 保证 external 后可加载。

接口、字段及错误码互引：[资讯管理契约](API接口文档.md#news-admin-api)。

<a id="sync-eval-admin-architecture"></a>
### 7.4 采集/评测域 admin 边界（**规划登记 · 未实现**）

> ⚠️ 本节与 §7.1–7.3 性质不同：**后三者均已实现并取证，本节为规划边界登记，代码零实现**。登记目的是在实施前钉死表归属与职责边界，避免日后与已实施能力混淆。

**边界一：表归属隔离（不共用表）**

| 组 | 落表 | 归属 | 当前状态 |
|---|---|---|---|
| `sync/*`（采集批次） | `sync_batches` + `model_change_logs` | 平台侧采集审计 | ⬜ 表已建模，`prisma.syncBatch`/`modelChangeLog` 全仓 **0 引用** |
| `benchmarks/*`（平台评测数据） | `model_benchmarks` | 平台侧运营数据 | 🟡 表已建模；**读侧已接线**（ladder take 3 / `models/[id]` API / 模型详情页），**写侧仅 `seed.ts`** |
| `POST /api/v1/evaluations`（用户对比测评，**已实现**） | `evaluations` + `evaluation_models` | 用户自助能力（¥2/模型/次） | ✅ 已实现并计费收口（RW-3） |

**边界二：职责分离**——用户侧 `evaluations` 解决「用户拿自己的提示词跑多个模型并排看结果」（消费型、按次计费、随用户量增长）；平台侧 `benchmarks/*` 解决「运营方汇聚多源评测数据、审核后作为天梯评分依据」（生产型、不直接计费、面向模型排行）。**前者不写 `model_benchmarks`，后者不写 `evaluations`**。

**边界三：采集与评测的衔接**——`sync/*` 负责「采集上游模型/价格等事实数据」（`ModelChangeLog` 留痕 + `checksum` 判重 + `isReverted` 可回滚）；`benchmarks/*` 负责「汇入评测分数」；二者最终共同供给 `ModelScore`/`LadderRanking` 的评分计算。**当前该链路完全断裂**：评分数据仅由 `seed.ts` 一次性写入。

**边界四：多源交叉验证的架构位置**——`enum BenchmarkSource`（`OFFICIAL|ACTUAL|REVIEW|SELF|THIRD_PARTY`）为**数据来源分类**，`weight`/`isWeighted`/`confidenceLevel`/`sampleCount`/`scorePercentile` 为**融合参数**，融合计算应归属 `lib/features/ranking`（既有 `formula-parser.ts`/`service.ts`），**不在采集层做加权**——采集层只负责「如实落库 + 判重 + 留痕」，保证原始数据可追溯、可重算。

**边界五：架构约束沿用**——两组端点均复用 `requireAdminApi`（含 role/status/deletedAt 回库复核）、统一信封、`audit_logs` 审计、分页 `page≥1/pageSize≤50`、Zod schema 入 `packages/shared`。**不新增鉴权机制、不新增响应格式**。

接口、字段及错误码互引：[采集与评测管理契约（规划登记）](API接口文档.md#sync-eval-admin-api)。

<a id="usage-stats-architecture"></a>

### 7.5 用量统计聚合读侧边界（WF-21 / P5 · **已实现**）

> 性质：本节为**已实现**能力的架构边界登记（与 §7.4 的规划登记不同），对应《API接口文档》§5.4 `GET /api/v1/user/usage/stats` 行。登记目的：钉死报表链路「走哪张表、禁什么」，防止后续把聚合查询漂移回明细大表拖垮网关。

- **数据源唯一**：stats 端点**只读 `usage_daily_stats` 日表**（`@@unique([day,userId,model])` + `@@index([userId,day])`），**禁止回扫 `usage_logs` 明细大表**——明细仅供 §5.4 `/user/usage` 分页下钻。锚点：`lib/features/gateway/service.ts` `getUsageStats`、`repository.ts` `listDailyStats`（注释即含禁令）。
- **维度边界**：契约字段集 = 日表字段集（`requestCount/quotaMinor/promptTokens/completionTokens`）。日表**无** latency/cached/reasoning/billingPath 列，故报表**不提供**延迟、缓存命中、错误率、计费路径分布维度；如需开放，先做日表扩列 + 历史回填（决策 D1=B，独立立项，见《未完成事项目录》§7.23 延后分支）。
- **聚合口径**：按天**零填充**日期序列（新用户返回全零点列，前端无判空分支）；模型排行 TopN=10 服务端截断；`quotaMinor`（BigInt）→ 元字符串**服务端统一换算**，与 `listUsagePage`/UsageLedger 同口径，前端禁止二次换算。
- **上限与权限**：`range` ∈ {7d,30d,90d} 服务端硬上限（缺省 30d，非法/超界 → 40000）；`requireUserApi` 仅本人数据。
- **性能边界**：图表经 `@aidean/ui/charts` `EChartWrapper` + `next/dynamic` 懒加载（echarts 不入公共 bundle）；前端 range 切换经 useSWR key 变更天然取消在途请求；面板本体由 `ConsoleWorkspace` state 门控懒挂载。

端点清单与错误码互引：[§5.4 统一计费网关 gateway](API接口文档.md)（stats 行 + 本节回锚）。

<a id="catalog-channel-scheduling-architecture"></a>

### 7.6 官方平台目录与渠道调度边界（N3 丁 / N4 丙 · **已实现**）

> 性质：本节为**已实现**能力的架构边界登记，对应《API接口文档》§5.4 `GET /api/v1/user/station-keys/stations` 与 `GET/POST/PUT/DELETE /api/v1/user/custom-channels` 两行。登记目的：钉死「目录项如何落地成真实站点」与「FREE_PROXY 分发顺序」，防止后续误把 `catalog:*` 直接落库或误改分发逻辑破坏唯一约束。

#### 7.6.1 官方平台目录：`catalog:<code>` 命名空间（N3 丁）

- **命名空间隔离**：目录项 id 一律 `catalog:<code>`（如 `catalog:openai`），**绝不与 `api_stations` 真实 UUID 冲突**；仅用于前端下拉展示与 POST 请求，**永不落库**。
- **录入解析**（`resolveCatalogStationId`，锚点 `lib/features/apikey/station-user-key.ts`）：POST `/user/station-keys` 收到 `catalog:<code>` 时——
  - 目录存在 → 按 `baseUrl` 幂等命中 `api_stations`（`findFirst({ where: { baseUrl, deletedAt: null } })`）：**命中复用真实 UUID**（不新建、不重复 upsert 计费规则）；**未命中**按目录 baseUrl 兜底建站并写 `StationBillingRule billingMode=UPSTREAM`；
  - 目录**不存在** → 抛 `40000`（**不静默造站**），不写任何行；
  - 非 `catalog:` 前缀 → 直通（兼容历史前端传真实 UUID）。
- **列表去重**（`/station-keys/stations`）：库内 UPSTREAM 站点 ∪ 目录项，按 `displayName`（trim+lower）去重，**DB 行优先**——保留真实 UUID 供录入落库，目录项仅作开箱兜底。
- **图标资产**：目录 `icon` 指向 `apps/web/public/brands/<code>.svg`（六家占位 SVG，品牌色+首字母）；缺失时前端按 `brandColor` 色块兜底，**不允许空 src 破图**。
- **Seed**：`apps/web/prisma/seed-official-platforms.ts` 幂等 upsert 六家 + UPSTREAM 计费规则（`billingMode` 与目录 `format` 对齐，UPSTREAM 站命中后直调上游不扣平台余额）。

#### 7.6.2 自定义渠道调度：`models/priority/groupName/weight`（N4 丙）

- **契约字段**（`CustomChannel`，真源 `apps/web/prisma/schema.prisma`）：`models String[] @default([])`（空数组=不限模型）、`priority Int @default(100)`（**数值越小越优先**）、`groupName String? @default(null)`（可选分组，仅展示不参与排序）、`weight Int @default(1)`（同优先级组内加权分摊系数）。**DB 迁移为纯 ADD COLUMN**，向下兼容历史行。
- **分发顺序**（FREE_PROXY 分支，锚点 `lib/features/gateway/service.ts`、`repository.ts`、`lib/features/gateway/channel-pick.ts`）：
  1. `listCustomChannels` 按 `[priority asc, createdAt asc]` 排序（修复原 `createdAt asc` 无优先级的 bug）；
  2. `channelServesModel(model, ch.models)` **先按模型过滤**——`models` 为空数组视为全模型；否则请求模型须在 `models` 内；
  3. 同优先级组内 `weightedPickIndex(weights)` 加权随机挑选（权重高者被选中概率高，**非必中**）；
  4. `failedChannelIds` 触发同组剔除 → **级联降级到下一优先级组**，直至可用渠道耗尽才 fallback。
- **并发口径（决策 A · 加权分摊）**：**显式排除** fan-out 竞速与多模型并答（并发答案会破坏 `usage_logs.requestId` 唯一约束）；单次请求始终恰好命中一个渠道，`requestId` 唯一性由 `@@unique` 保证。
- **SSRF 保护**：catalog 兜底建站与自定义渠道的 `base_url` 入库前均复用 SSRF 守卫（S1–S5，见《网关计费时序契约》），出站仅经 `lib/features/discovery/url-policy`；新目录项 baseUrl 属白名单内静态值，但仍走同一守卫。

端点清单与错误码互引：[§5.4 统一计费网关 gateway](API接口文档.md)（`station-keys/stations`、`custom-channels` 两行 + 本节回锚）。

<a id="api-channels-aggregate-architecture"></a>

### 7.7 API 渠道聚合边界（乙 · 后端统一 · **已实现**）

> 性质：本节为**已实现**能力的架构边界登记，对应《API接口文档》§5.4 `GET /api/v1/user/channels` 行。登记目的：钉死「外部渠道」面板（原「API 渠道」）的数据来源与合并规则，防止前端本地拼装再次引入字段口径/权限边界不一致。

- **单一事实源**：读侧仅经 `GET /api/v1/user/channels`（锚点 `lib/features/apikey/channel-aggregate.ts` `listApiChannels`），内部一次读 `station_user_keys`（join `api_stations`）∪ `custom_channels` 两表后归一。**禁止**前端本地拼装 `/user/station-keys` + `/user/custom-channels` 两路请求。
- **不合成伪行**：聚合结果**不含** `catalog:<code>` 伪行——未落库的平台在渠道列表**不出现**；用户在选择目录项后经 POST `/user/station-keys` 落库，列表自然出现。`catalog:*` 仅存在于 `/user/station-keys/stations`（录入下拉）与 POST 请求，**永不进入聚合结果**。
- **kind 归一**：`station`（`station_user_keys` join `api_stations`）与 `custom`（`custom_channels`）统一为 `ApiChannelView` 形状；kind 专属字段仅在对应 kind 返回（station→`stationId`；custom→`priority/groupName/weight`）。
- **排序契约**：custom 按 `[priority asc, createdAt asc]` 在前（与 FREE_PROXY 分发口径一致）；station 按 `createdAt desc` 在后。前端不得重排（保证面板顺序与服务端调度顺序一致）。
- **格式推导**：station 格式从 `api_stations.protocols` 推导（含 `anthropic` → `anthropic`，否则 `openai`，与网关 `upstreamFormatOfStation` 同口径）；custom 格式从 `ChannelFormat` enum 收敛。
- **数据隔离**：`requireUserApi` + `where: { userId }` 双保险，仅本人可见；station 行仅当用户已录入 Key 才出现（不返回平台侧可用但未录入的站点）。
- **脱敏**：`apiKeyMasked` 为 `key_mask` 冗余列；明文/密文（`key_cipher`）永不出 service 层。
- **写侧不变**：增删改仍走既有端点（`/user/station-keys`、`/user/custom-channels`），聚合端点**只读**；`ApiChannelsPanel` 前端按 `kind` 分派写请求。

端点清单与错误码互引：[§5.4 统一计费网关 gateway](API接口文档.md)（`channels` 行 + 本节回锚）。

<a id="upstream-protocol-quad-architecture"></a>

### 7.8 上游协议四值扩展与中枢扇出（M3 · **已实现**）

> 性质：本节登记 2026-10-10 上游/渠道协议枚举从两值扩为四值的适配层架构约束，对应《API接口文档》v1.44 §5.4 `custom-channels`（`format` 四选一）与 `gateway/chat`（真实上游中转）。

- **两概念正交（不得混淆）**：`GATEWAY_FORMATS`（**上游协议**——网关→供给渠道的出向格式，M3 由 2 扩为 4）与 `GATEWAY_ACCESS_FORMATS`（**接入体裁**——客户端→网关的入向格式，恒 4 值）为两套独立枚举。接入侧 `normalizeAccessRequest`/`serializeAccessResponse` 处理入向归一；本节的 `toUpstreamBody`/`toClientResponse` 处理出向（内部 OpenAI 中枢 ↔ 四协议上游）。
- **中枢扇出（hub-and-spoke）**：内部统一形态为 OpenAI Chat（`GatewayChat`）。出向时同格式零拷贝；否则先由客户端体裁归一为中枢（anthropic→`anthropicToOpenai`），再由中枢扇出到目标上游（`openaiToAnthropic`/`openaiToGemini`/`openaiToResponses`）；入向反向扇入（`geminiResponseToOpenai`/`responsesResponseToOpenai`/`anthropicResponseToOpenai`）。避免 N×N 转换器爆炸。
- **上游端点形态**：openai `/chat/completions` Bearer；anthropic `/v1/messages` `x-api-key`；gemini `/v1beta/models/{model}:generateContent`（流式 `:streamGenerateContent?alt=sse`）`x-goog-api-key`、model 在路径；responses `/responses` Bearer、model 在 body、SSE 事件 `response.output_text.delta`/`response.completed`。
- **透传与聚合边界**：`isPassthroughSafe(clientFormat, upstreamFormat)` = `clientFormat===upstreamFormat && (openai|anthropic)`。仅此情形 SSE 字节透传；其余跨格式流式**强制**走 `callUpstreamAggregated`（聚合 SSE → 上游原生 JSON 形状 `buildAggregatedNative`）后回转，`callUpstreamStream` 对 gemini/responses 直接 throw 拦截。`PASSTHROUGH_ENABLED=false` 时维持原 `callUpstream` 行为，仅新增跨格式聚合分支，避免回归。
- **wire↔enum 边界映射**：DB 以 `@map("1"/"2"/"3"/"4")` 数字串存 `ChannelFormat`，但 Prisma 运行时返回枚举成员名（`OPENAI_RESPONSES`/`GEMINI` 等）。shared 提供 `gatewayFormatToChannelEnum`（连字符→下划线大写）与 `channelEnumToGatewayFormat`（未知回落 `openai`）作为唯一映射真源；repository 落库、service 读取、channel-aggregate 展示均经此对函数，**禁止**手写 `toUpperCase()`。
- **使用量提取**：`parseUpstreamUsage` 新增 gemini `usageMetadata`（promptTokenCount/candidatesTokenCount）与 responses `obj.usage`（input_tokens/output_tokens）结构识别，保计费捕获跨协议一致。
- **范围声明**：站点（`api_stations`）与官方平台目录上游仍限 openai/anthropic（`upstreamFormatOfStation` 未变）；四值上游仅适用于 `custom_channels`。

端点清单与错误码互引：[§5.4 统一计费网关 gateway](API接口文档.md)（`custom-channels`/`gateway/chat` 行 + 本节回锚，v1.44）。

<a id="restructure-admin-architecture"></a>

### 7.9 管理端信息架构重构域边界（restructure-admin-nav-rbac-cms S2-S8 · **已实施**）

> 性质：本节登记 `/admin` 信息架构一次性重构（S2-S8）的架构约束，对应《API接口文档》v1.46 §5.8.6 逐端点登记。登记目的：钉死「接口级 RBAC + 独立角色 + 菜单库驱动 + CMS 可见即可改 + 记录只读 + 账本仅处置 + 报表只读聚合 + 分页封顶」这套边界的强制口径，防止后续切片或新增端点回退到「前端软控 / 硬编码菜单 / 明细直扫 / 硬删账本」。

- **权限模型 A2 + B2（后端逐接口强制）**：采用 **A2 接口级 RBAC**——每个 `/api/v1/admin/*` 读/写端点在路由内 `requireAdminApi(permission)` 强制校验权限原子（`ADMIN_DOMAINS` 30 域 ×{read,write}=60 原子，S9 新增 `reports` 域），**前端隐藏入口仅为体验层，绝不作为授权依据**；未命中 → 10008/403。**B2 独立 Role 实体** + 用户-角色多对多（`roles` / `user_roles`），SUPER_ADMIN 持通配 `*`。跨域概览端点可走无参 `requireAdminApi()`（仅 isStaff 入场总闸）；但**含收入的报表例外**——S9（B2）为 `reports` 建独立域并令 `reports/overview` 强制 `admin.reports.read`，MODERATOR 系统角色权限集排除 `admin.reports.*`（`permissions.ts` `MODERATOR_READ` filter），端点 403 + `/admin` 概览紧凑看板/`/admin/reports` 专属页服务端 session 隐藏 + 侧栏 `filterNavByPerms` 剪枝三处同口径，越权不泄金额；`/admin/reports` 直访重定向。`/admin/menus`、`/admin/logs` 亦补 RSC 页级 `hasPermission` 守卫（无读码直访 → redirect 概览）。
- **菜单库驱动可配置（S2）**：后台导航以 `NavigationMenu(scope='ADMIN')` 为唯一真源，`lib/navigation.ts` 读取渲染；**禁止**在前端硬编码菜单树。新增入口经幂等 `seed-navigation-menu.ts`，**禁止**跑破坏性 `db:seed`（`seed.ts` 会 `deleteMany` navigationMenu/systemConfig）。
- **CMS 可见即可改（S4）**：站点品牌/首页/文档等展示内容一律经 `SystemConfig` 白名单键（`ADMIN_CONFIG_KEYS`）读写，`lib/site-config.ts` 为读服务，DB 空/异常回退 `product-fallback`/静态兜底；前端区块不得各自硬编码文案。**单一事实源**：契约真源在 `@aidean/shared` schema，前后端复用。
- **记录/日志中心只读（S5）**：`logs/usage`·`security`·`scripts` 及 audit/sync 均为**只读聚合**，账本类数据（审计/用量/同步）**不可增删改**，管理端仅可查询/筛选。分页 `pageSize` 经 `Math.min(100, …)` 封顶，**禁超大 take 扫全表**。
- **财务账本仅处置不可改写（S6）**：`package-orders`/`recharge-orders` 只读呈现，处置动作限于**冲正（REVERSAL 反向分录 + CAS 幂等）/ 关单 / 标异常**；**禁止**直接 UPDATE 金额/状态改写历史。冲正经 `billingService.reverseRechargeOrder` 写反向分录而非改原账，保全账本不可变审计链。
- **报表只读聚合（S8.1）**：`GET /api/v1/admin/reports/overview` **只读 `usage_daily_stats` 预聚合日表**（`@@map`），**禁扫 `usage_logs` 明细**（与 §7.5 用户侧 stats 同口径）；`days` 7-90 封顶，`groupBy` 平台级日/模型/用户聚合，充值按 PAID 单 JS 归并；`fenToYuan(bigint)` 统一分→元字符串口径；图表 option 由纯函数 builder 生成（可单测），`EChartWrapper` dynamic ssr:false 懒加载。
- **批量与并发（S8.4）**：批量处置以 `updateMany`/`$transaction` 单查询为主，逐条审计写入改 `Promise.all` 并发（不改变业务结果，仅降时延）；**禁止**串行 `for-await` 逐条 DB 往返。
- **响应式（S8.2）**：桌面侧栏 `hidden md:block`，移动端经 `AdminMobileNav`（`md:hidden` 抽屉内嵌 `AdminSidebar forceExpanded`）；不重构 RSC 布局，桌面视口零回归。
- **死表裁决（S8.5）**：见《数据库文档》——零运行时消费的表保留 schema 不迁移不批量删；`NavigationMenu` 已于 S2 激活。

端点清单与错误码互引：[§5.8.6 管理端重构端点](API接口文档.md#restructure-admin-api)。

<a id="feature-flag-runtime-architecture"></a>

### 7.10 功能开关运行时边界（S2 · **已实现** · REQ-F-041 / DESIGN-001）

> 性质：本节登记功能开关运行时的架构强制约束，对应《API接口文档》§5.7（API-002 公开快照）与 §5.8.9（API-003/004 后台读写）。运行时由 TASK-015（public 读侧）+ TASK-016（admin 列表/编辑）交付；本轮 TASK-020 补登受控面与边界口径（TASK-090 §5.8.9 预留本锚）。契约唯一源 `packages/shared/src/schemas/feature-flags.schema.ts`。

- **7 码唯一真源**：`flagCode` 恒属 `FEATURE_FLAG_CODES` 七码枚举（`ladder.model`/`ladder.station`/`gateway.chat`/`favorites.enabled`/`comparison.enabled`/`evaluation.enabled`/`chat.support`），由 seed 落库 + `feature-flags.spec` 漂移守卫锁定，**禁止**散落字符串新增开关码绕过枚举。
- **public / admin 双读面分工（隐私边界 DESIGN-001）**：`GET /api/v1/system/features`（API-002，PUBLIC 无鉴权）经 `PublicFeaturesSchema` 出口校验，**仅暴露 7 码开/关布尔**，绝不泄露 rollout/config/时间窗/描述等运营字段；`GET /api/v1/admin/feature-flags`（API-003，`admin.configs.read`）才返回含优先级/类目/描述/时间戳的**管理全投影**。同一数据面按受众分级——公开面窄、管理面全。
- **关闭态三重生效**：开关关闭 → ① 前台入口隐藏 + ② 受控页面 403 态 + ③ 受控 API 返回 `50011 FEATURE_DISABLED`（HTTP 403）。API 侧守卫（如收藏三端点首行 `requireFeature("favorites.enabled")`）**先于**鉴权执行，关闭即 50011→403（未登录则 10004→401）。
- **缓存与即时性**：读经 `getFeatureFlags()`（`unstable_cache` tag `feature-flags`），public/admin 端点均 `force-dynamic` 禁构建期固化快照；后台 PATCH 成功后**先** `revalidateTag("feature-flags")` 失效缓存（使新态即时对 public 端点与受控路由守卫可见）、**再** `writeAudit`（action=2, tableName=feature_flags），失效不被审计写入牵连。
- **编辑白名单与幂等**：`PATCH /api/v1/admin/feature-flags/[id]`（API-004，`admin.configs.write`）经 `AdminFeatureFlagPatchSchema`（strict + 至少一字段），仅可改 `isEnabled`/`description`；同值 PATCH 幂等（仍执行 update+失效+审计并返回当前投影）；记录不存在/非法体（未知键/空对象）→ 40000。

端点清单互引：[§5.7 系统 system](API接口文档.md)（API-002 公开快照）、[§5.8.9 功能开关 admin](API接口文档.md)（API-003/004 后台读写）——本节为架构约束侧，与《API接口文档》端点清单互为铁律 2 双向锚。

<a id="favorites-architecture"></a>

### 7.11 收藏（favorites）架构边界（S3 · **已实现** · REQ-F-052 / SOL-S3）

> 性质：本节登记收藏（favorites）的数据模型与架构强制约束，对应《API接口文档》§5.4.2（API-005/006/007 端点清单）。数据表由 S0 迁移已建（`favorites` + 唯一索引）、零新迁移；运行时由 TASK-022 交付（service + repository + 三路由）；本轮 TASK-025 补登架构边界（TASK-090 §5.4.2 预留本锚）。契约唯一源 `packages/shared/src/schemas/favorites.schema.ts`。

- **数据模型**：`Favorite`（`@@map("favorites")`）——`id String @id @default(uuid(7))`（UUIDv7 应用层生成）、`userId`（`@map("user_id")`，关系 `user` `onDelete: Cascade`，删用户级联清收藏）、`refType FavoriteType`（enum `MODEL`/`API_STATION`）、`refId`（`@map("ref_id")`）、`note String?`、`createdAt`；索引 `@@unique([userId, refType, refId])`（幂等键）+ `@@index([userId])`（分页读）+ `@@index([refType, refId])`（目标反查）。
- **分层职责（路由零业务）**：`app/api/v1/user/favorites{,/[id]}` 只做「解析→守卫→调 service→`withApi` 信封」；业务口径集中在 `lib/features/favorites/service.ts`（入参校验、目标存在性、错误码）与 `repository.ts`（`prisma.favorite` 读写 + 目标投影）。分页/入参统一由 `@aidean/shared` schema 收口，不在 web 侧二次硬编码；出口以 `FavoriteListResponseSchema.parse` 结构收口（脏形状即抛）。
- **幂等与删除语义**：POST 依赖 `@@unique[userId,refType,refId]` 做 upsert（重复收藏返回既有记录；仅显式传 `note` 才覆盖）；DELETE 为**物理删** `deleteMany({ id, userId })`，0 行（不存在/非本人）→ `40000`（防枚举，不区分「无此id」与「非本人」）。
- **目标存在性与反 N+1**：POST 前置 `findTarget`校验 ref 存且未软删（MODEL→`ai_models`(slug)，API_STATION→`api_stations`(displayName，无独立详情页→href 指 `/providers`)），不存在/已软删 → `20003 FAVORITE_TARGET_NOT_FOUND`（HTTP 400）；列表投影 `findTargets` 按 refType 各一次 IN 查询（绝不逐行查）。
- **受控面**：三端点路由首行 `requireFeature("favorites.enabled")` **先于** `requireUserApi()`（开关关闭 → `50011`→HTTP 403；未登录 → `10004`→HTTP 401），口径同 §7.10 功能开关关闭态三重生效。

端点清单与错误码互引：[§5.4.2 收藏 favorites](API接口文档.md)（API-005/006/007）与《数据库文档》[§九](数据库文档.md)（`favorites` 行·✅ 已激活）——本节为架构约束侧，与《API接口文档》端点清单互为铁律 2 双向锚。

<a id="search-architecture"></a>

### 7.12 顶栏全局搜索架构边界（S5 · **已实现** · REQ-C-002 / SOL-S5）

> 性质：本节登记顶栏全局搜索（`GET /api/v1/search`，契约 API-012）的架构强制约束，对应《API接口文档》§5 search 行（端点清单）。运行时由 TASK-032（契约）/033（API）/034（UI）/035（e2e）交付；**零 schema 迁移**、零新索引；本轮 TASK-036 补登架构边界。

- **契约唯一源**：`packages/shared/src/schemas/search.schema.ts`（`SearchQuerySchema` / `SearchHitSchema` / `SearchResponseSchema`）；web 侧不二次硬编码 `q` 长度（trim 后 1..50）、`types`（CSV ⊆ model/product/news，缺省全类型）、`limit`（每类 1..10，默认 5）。
- **分层职责（路由零业务）**：`app/api/v1/search/route.ts` 只做「IP 限流 → 解析 query → `SearchQuerySchema.safeParse`（非法 → `40000`）→ 调 `lib/features/search/service.ts` `searchAll` → `withApi` 信封 `{q,hits,tookMs}`」；查询口径集中在 service。`export const dynamic = "force-dynamic"`，不进 ISR。
- **查询策略**：模型 / 产品 / 资讯三路独立查询 `Promise.all` 并发、互不阻塞，各路 `take=limit`；模糊匹配 `contains` + `mode: "insensitive"`，**不建 pg_trgm 等扩展、不加索引**（无性能基线前禁止优化）。
- **可见性口径（与公开列表同源）**：AiModel 未软删 + `isActive` + `status=ACTIVE`（同 ladder listModels）；Product `status=ACTIVE` 且未软删；NewsItem `status=PUBLISHED`（草稿不进公开搜索）。命中 `href` 均为站内绝对路径。
- **限流**：复用 `lib/rate-limit.ts` 固定窗口，键 `rl:search:{ip}`，每 IP 30 次 / 60s，超限 `10006` → HTTP 429；Redis 故障 **fail-open**（纵深防御层，不影响可用性）。
- **前端唯一入口**：`components/site/GlobalSearch.tsx` 仅挂在 `SiteHeader`（≥md 桌面）与 `MobileNav` 抽屉顶部（<md）；全站其余位置（含筛选栏）不得出现第二个搜索框（《界面交互文档》§一「搜索框唯一位置」）。防抖 250ms + `AbortController` 取消旧请求，五态 testid（idle / `search-loading` / `search-results` / `search-no-hit` / `search-error`），交互细则见《界面交互文档》§十三。

端点清单互引：[§5 search 行](API接口文档.md)（API-012）——本节为架构约束侧，与《API接口文档》端点清单互为铁律 2 双向锚。

<a id="effective-price-architecture"></a>

### 7.13 生效价与优惠价边界（V0.10.0 · **已实现** · TASK-028/031）

> 对应《API接口文档》[§5.8.10 限时优惠价 admin](API接口文档.md#promotion-prices-api)（API-008..011）；时序口径见《网关计费时序契约》[§11](网关计费时序契约.md#effective-price-resolution)。

- **契约唯一源**：`packages/shared/src/schemas/promotion.schema.ts`（`PromotionPriceCreateSchema` / `PromotionPricePatchSchema` / `EffectivePriceSchema`）。
- **写侧四约束**：① billing 三元组（`billingCurrency`/`billingUnit`/计价模式）由该模型当前价派生，不接受客户端传入；② `effectiveUntil` 必填且晚于 `effectiveFrom`（半开窗）；③ 同模型优惠窗口禁重叠；④ 写入走 Serializable 事务（P2034 有限重试）+ `writeAudit`。
- **读侧唯一解析**：`lib/features/pricing/effective-price.ts`；网关、模型详情 API、`/pricing` 同源消费，禁止旁路直查 `model_prices`。
- **路由零业务**：路由只做鉴权（`requireAdminApi("admin.models.read|write")`）→ 契约校验 → 调用 → `withApi` 信封。

<a id="matrix-architecture"></a>

### 7.14 协议/能力矩阵运营化边界（V0.11.0 · **已实现** · B11-03a · Q-11-01=A）

> 对应《API接口文档》[§5.8.11 协议兼容矩阵 / 能力矩阵 admin](API接口文档.md#matrix-admin-api)；术语见[「协议兼容矩阵」](../governance/术语表.md#term-protocol-matrix)。

- **维度唯一真源**：协议维度 = Prisma `enum ModelProtocol`（`ai_models.protocol` 同源，常量 `MATRIX_PROTOCOLS` 以 `satisfies $Enums.ModelProtocol[]` 编译期约束 + 单测反向比对 schema 文本）；废弃组件内小写蛇形硬编码。能力维度 8 值常量 `MATRIX_CAPABILITIES`。
- **分层**：路由只做 `requireAdminApi(权限码)` → 参数搬运 → `revalidatePath`；校验、引用完整性、写库、P2002/P2025 映射与审计统一在 `lib/features/admin/matrix/service.ts`。列表 POST 同走 service（upsert 语义不变）。
- **错误码复用（零新增）**：校验/不存在/唯一冲突 → `40000`（与 vendors/feature-flags 等兄弟资源同口径）；模型引用不存在 → `20001`。语义化 404/409 待 Q-11-03 统一裁决。
- **审计**：`tableName` = `protocol_compatibilities` / `capability_matrices`；action 1/2/3；PATCH 记 `changedFields`+前后快照，DELETE 记 oldData 全量。
- **写入路径**：`lib/features/admin/matrix/backfill.ts` 纯函数派生（只写有证据行，不臆造 `supported=false`）+ `prisma/seed-matrix-backfill.ts` 落库；`createMany skipDuplicates` 分块 500，幂等且永不覆盖后台人工编辑。回填行以 `probeMethod="backfill"` / `detail.derivedFrom` 标识来源。
- **前端状态**：矩阵面板经 `PanelState` 五态外壳（loading/empty/error+retry/forbidden/ready）渲染，失败永不落空态（判定唯一口径 `lib/admin/panel-resource.ts`）。

端点清单互引：[§5.8.11](API接口文档.md#matrix-admin-api)——本节为架构约束侧，与《API接口文档》端点清单互为铁律 2 双向锚。
