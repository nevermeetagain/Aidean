# 子平台介绍页内容重构（三层介绍模型）Spec

> change-id: `enrich-subplatform-intro-pages` | 语言: 中文 | 版本: v1 | 创建: 2026-09-28 | 更新: 2026-09-28

---

## 为什么（Why）

管理者在 2026-09-26 对 `/products/[slug]` 介绍页给出反馈「非常、非常、非常的不完整」，登记为 [docs/plans/未完成事项目录.md](../../plans/未完成事项目录.md) **#70**；核心痛点：读者无法理解子平台是干嘛的。现状实证（本 spec 立项前逐行核验）：

- `apps/web/prisma/seed.ts` 中 wechatrag / aideanfleet / aideanthesis 三产品 `intro.facts` 各含一个 `{ group: '技术' }` 分组，内容为后端框架 / 异步任务 / 前端构建工具清单（FastAPI、Celery、Vue3 等）——这是**开发者视角信息**，对读者理解"产品做什么"零贡献，且恰是管理者点名的堆砌；
- 统一模板 `app/(site)/products/[slug]/page.tsx` 仅有 简介 / 能力条目 / 信息表 / 链接 四类区块，**没有"给谁用、解决什么问题、怎么用、数据与承诺"的叙事区块**；
- `aideanwiki` 的 `intro` 为 null（#65 备忘等域名），介绍页降级为纯 tagline+description，同样单薄。

上一轮（2026-09-27/28 会话）已完成底层真实资产摸底（三大子平台仓库）与「**[介绍内容三层模型](../../governance/术语表.md#介绍内容三层模型)**：身份层（这是什么/给谁）→ 价值层（解决什么问题/怎么运转）→ 决策层（生态互通/安全承诺/入口）」方案设计；管理者本轮指令「开始执行」即 APPROVE。

内容事实源：[docs/product/modules/子平台规范说明.md](../../product/modules/子平台规范说明.md) v1.1 §2–§4（各子平台能力实测台账）与现行 seed 公开口径。SkillsCloud 处规划期、无真实素材，本轮**不注入**（可证伪的零虚构纪律）。

---

## 变更清单（What Changes）

1. 扩展：`ProductIntroSchema` 升至 **v2 结构化介绍块**——新增可选字段 `audience`（身份层·给谁用）、`problems[]`（价值层·痛点→解法对）、`workflow`（价值层·使用步骤）、`promises[]`（决策层·安全与承诺）、`ecosystem[]`（决策层·生态互通）；`version` 允许 1|2，**v1 存量数据解析与渲染行为完全不变**（平滑兼容，无迁移）。
2. 数据：`seed.ts` 与 `scripts/seed-products.mjs` 三产品 intro **删除全部技术栈分组**，注入三层真实业务内容；aideanwiki 补 audience/problems 两块；链接维持 #65/管理者默认规则现状（组织页/Fleet 仓库直链）。
3. 表现层：介绍页区块序扩展为 页头（含 audience 行）→ 简介+CTA → 解决什么问题 → 如何使用（步骤）→ 核心能力 → 生态互通与安全承诺（双列）→ 平台信息表 → 相关链接 → 返回矩阵；任一块缺省**零渲染**（沿用无空壳区块惯例）。
4. Admin：`ProductsManager` intro 编辑面增补 v2 字段（`问题::解法` 每行一条、步骤/承诺/生态 per-line 多行文本，与 facts 同一校验-前拦-服务端兜底惯例）。
5. 校验：`packages/shared` ProductIntro 单测扩充 v2 边界与 v1 兼容回归。
6. 治理：本三件套立项与收口；[docs/governance/术语表.md](../../governance/术语表.md) 登记「介绍内容三层模型」[docs/plans/未完成事项目录.md](../../plans/未完成事项目录.md) #70 收口（版本 banner 同步）；[docs/文档索引.md](../../文档索引.md) banner 同步。无新增源码目录/路由文件（route/page 计数不变）。

---

## 影响面（Impact)

- Affected specs: `add-subplatform-showcase-pages`（其「统一模板介绍页」区块序与「链接后台可配置且服务端强校验」两条 Requirement 在本 spec 中标注 MODIFIED 延伸；schema 归属源不变）。
- Affected code:
  - 修改：`packages/shared/src/schemas/admin.schema.ts`（ProductIntro v2 段）、`packages/shared/src/__tests__/product-intro.spec.ts`、`apps/web/prisma/seed.ts`（productsSeed 数组区，避开 #71 并行批次已改行的语义）、`apps/web/scripts/seed-products.mjs`、`apps/web/app/(site)/products/[slug]/page.tsx`、`apps/web/components/admin/ProductsManager.tsx`
  - 新建：`docs/specs/enrich-subplatform-intro-pages/`（本三件套）
  - 移动：无
- Affected docs：`docs/governance/术语表.md`（新词条）、`docs/plans/未完成事项目录.md`（#70 收口）、`docs/文档索引.md`（banner）。
- 与并行批次的共存说明：本变更集与工作树在途 **#71（displayName/category）** 交叠于 seed/schema/page 同文件不同区域；`[slug]/page.tsx` 复用 #71 引入的 `productLabel()` 展示名回退，互不覆盖。

---

## ADDED Requirements

### Requirement: 介绍内容三层模型（读者可理解性）

所有已发布子平台介绍 SHALL 令首次到访的读者在无需外部知识的情况下理解：这是什么、给谁用、解决什么问题、怎么运转、数据与承诺何在；**SHALL NOT** 以开发者技术栈清单（后端框架 / 异步任务 / 构建工具等）作为面向读者的功能展示。

#### Scenario: 决策信息替代技术堆砌

- **WHEN** 访问 `/products/aideanfleet`
- **THEN** 页面出现「解决什么问题」对照卡（痛点→解法）、「如何使用」步骤、「生态互通」与「安全与承诺」区块
- **AND** 面向读者的功能区不出现 FastAPI / Celery / Vue3 / Vite 等实现细节（facts 仅保留用户语言的基础信息，如交付形态/账号体系）

#### Scenario: 素材缺失不虚构

- **WHEN** 某产品（如规划期的 SkillsCloud）无真实素材
- **THEN** 其介绍保持既有降级形态（tagline/description/benefits），三层区块 SHALL NOT 出现占位或编造内容

### Requirement: Product Intro 块 v2 向后兼容

`ProductIntroSchema` v2 SHALL 仅以**可选字段**扩展（`audience` ≤80 字、`problems` ≤4 条且 `problem` ≤80 字 / `solution` ≤200 字、`workflow.steps` 1–8 条且单步 ≤120 字、`promises` ≤4 条、`ecosystem` ≤4 条，单条 ≤120 字）；`version` SHALL 接受 1 与 2，缺省 1；v1 存量 JSON SHALL 在新契约下解析通过且前台渲染结果与改造前一致。**AND** 写侧超界/畸形 SHALL 被 zod 拒绝（不落库），读侧脏数据 SHALL 静默降级 null（沿用现行安全边界）。

#### Scenario: v1 数据零迁移读取

- **WHEN** 数据库存量行 `intro = { version: 1, links: [...], facts: [...] }`
- **THEN** `ProductIntroSchema.safeParse` 成功，页面按旧四区块渲染，不出现 v2 空块

#### Scenario: v2 新字段服务端强校验

- **WHEN** Admin PATCH `intro.problems` 传 5 条或 `solution` 超 200 字
- **THEN** 请求被 `ProductIntroSchema` 拒绝返回 4xx，且不落库

### Requirement: 公开文案安全过滤延续

seed 注入内容 SHALL 延续现行纪律：不含端口、内网 IP、环境变量键、模型池明细、风险台账；能力表述唯一事实源为 [docs/product/modules/子平台规范说明.md](../../product/modules/子平台规范说明.md) v1.1 §2–§4 与既有产品口径，重写而非摘抄。

#### Scenario: 承诺条目可溯源

- **WHEN** 抽查任一 `promises`/`ecosystem` 条目（如「凭据加密落库（AES-256-GCM）」「项目根白名单沙箱」）
- **THEN** 能在规范说明对应小节找到事实依据（§2.3 / §3.6 等），无凭空表述

### Requirement: Admin 可维护 v2 字段

`ProductsManager` 表单 SHALL 提供 audience、problems（`问题::解法` 每行一条）、workflow（标题+步骤每行一条）、promises、ecosystem 的编辑与回填；行格式错误 SHALL 提交前拦截；保存 SHALL 在任一 v2 字段有值时输出 `version: 2`，全部为空且仅旧字段时保持 `version: 1`。

#### Scenario: 编辑回填往返

- **WHEN** 打开一个 intro 含 v2 字段的编辑弹层并原样保存
- **THEN** 库内 intro 语义不变（无字段丢失、无空块膨胀），前台即时生效（revalidatePath）

---

## MODIFIED Requirements

### Requirement: 统一模板介绍页（源：`add-subplatform-showcase-pages`）

原文：所有 ACTIVE 产品的介绍页 SHALL 由同一路由模板渲染；模板 SHALL 仅使用 `@aidean/ui`、`lucide-react` 与 CSS 令牌，三主题不破版；动效 SHALL 遵循 `prefers-reduced-motion`。

其 Scenario「有 intro 的子平台产品」原文：「THEN 页面按 页头（PagePlaceholder+badge）→ 简介+CTA → 核心能力卡 → 平台信息表 → 相关链接 → 返回矩阵 的固定区块序渲染，外链带 `target="_blank" rel="noopener noreferrer"`」。

**修改**（差异标注）：固定区块序改为 页头（badge，audience 行 **[v2 新增]**）→ 简介+CTA → **解决什么问题 [v2 新增]** → **如何使用 [v2 新增]** → 核心能力卡 → **生态互通与承诺 [v2 新增，双列]** → 平台信息表 → 相关链接 → 返回矩阵；新增区块 SHALL 全部按「缺省零渲染」处理；样式与主题契约不变。**AND** 标题展示沿用并行批次 #71 的中文显示名回退（`productLabel()`），本 spec 不重复定义。

### Requirement: 链接后台可配置且服务端强校验（源：`add-subplatform-showcase-pages`）

原文：产品链接 SHALL 存于 `Product.intro.links`，由管理后台增删改；写侧 SHALL 经 `ProductIntroSchema` 校验：url 仅 http/https、label ≤20 字、links ≤6、facts 分组 ≤6、每组条目 ≤12。校验失败 SHALL 返回 4xx 且不落库。

**修改**：校验面覆盖范围由 links/facts 两类扩展为 links/facts/**audience/problems/workflow/promises/ecosystem** 五类（上限见「Product Intro 块 v2 向后兼容」）；links 与 facts 的既有限制逐字不变。

---

## REMOVED Requirements

（无。facts 能力保留——「技术」分组仅从 seed 数据移除，契约与后台编辑面不删。）
