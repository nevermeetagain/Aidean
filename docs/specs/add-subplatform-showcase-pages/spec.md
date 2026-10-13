# 子平台介绍页（统一模板 + 后台可配置链接）Spec

> change-id: `add-subplatform-showcase-pages` | 语言: 中文 | 版本: v1 | 创建: 2026-09-25 | 更新: 2026-09-25

---

## 为什么（Why）

子平台范围已在 [docs/product/modules/子平台规范说明.md](../../product/modules/子平台规范说明.md) v1.1 §1 收敛为 **AideanBot / AideanFleet / AideanThesis** 三个（独立仓库、独立部署，主平台仅做入口展示，见 [docs/product/requirements/需求文档.md](../../product/requirements/需求文档.md) §3.4）。现状缺口：

- `Product` 模型（`apps/web/prisma/schema.prisma`）只有 name/tagline/description/badge/benefits，**没有官网/仓库链接与结构化信息字段**，无法承接"链接后台可配置"的诉求；
- 产品矩阵只有 `/products` 单页锚点区块，**没有统一模板的介绍页路由**；
- 首页 `components/home/ProductSection.tsx` 硬编码三卡与库内数据**双源并存**；
- `docs/governance/术语表.md`「子平台」行仍载旧口径（synapse/twin），与规范说明 v1.1 冲突，需对齐。

---

## 变更清单（What Changes）

1. 扩展：`Product` 模型新增 `intro Json?` 结构化介绍块（v1：`links[] + facts[]`），一次 migration。
2. 新增：`@aidean/shared` 增加 `ProductIntroSchema`（url 协议白名单 http/https、条数与长度上限），并入 Admin 产品 Create/Update schema。
3. 扩展：`/api/v1/admin/products` GET/POST/PATCH 透传 `intro`；`ProductsManager` 表单新增链接（动态行）与信息条目（`分组::标签::值` 每行一条）编辑。
4. 新增：统一模板介绍页 `app/(site)/products/[slug]/page.tsx`（Server Component + ISR 300 + notFound + `intro=null` 降级 + generateMetadata）。
5. 变更：seed 产品 `wechatrag` 显示名改 **AideanBot**（slug 不变，映射登记于本 spec 与数据库文档）；新增 `aideanfleet`、`aideanthesis` 两产品与公开安全文案。
6. 变更：首页 `ProductSection` 改读库并链接 `/products/[slug]`（消灭双源）；`lib/navigation.ts` 产品下拉新增三子平台条目、AideanWiki 由 `#锚点` 改指详情页；导航顺序契约测试同步。
7. 文档：术语表「子平台」行更新为规范说明 v1.1 口径并互链（[铁律 2]）；数据库文档、目录结构文档、文档索引、需求文档 §3.4 同步（[铁律 3][铁律 6]）。

---

## 影响面（Impact）

- Affected specs: `rebuild-admin-console-and-harden-auth`（Product 模型来源 spec，不改动其内容，仅在其表上新增字段）、`redesign-nav-content-pages`（产品下拉导航条目延伸）。
- Affected code:
  - 新建：`apps/web/app/(site)/products/[slug]/page.tsx`、`packages/shared` intro schema 与测试、`prisma/migrations/*_add_product_intro/`
  - 修改：`apps/web/prisma/schema.prisma`、`apps/web/prisma/seed.ts`、`packages/shared/src/**`（产品 schema）、`apps/web/app/api/v1/admin/products/**`、`apps/web/components/admin/ProductsManager.tsx`、`apps/web/components/home/ProductSection.tsx`、`apps/web/lib/navigation.ts`、相关测试
  - 移动：无

---

## ADDED Requirements

### Requirement: 统一模板介绍页

所有 ACTIVE 产品的介绍页 SHALL 由同一个路由模板 `app/(site)/products/[slug]/page.tsx` 渲染；模板 SHALL 仅使用 `@aidean/ui`、`lucide-react` 与 CSS 令牌（`var(--primary)` 系），保证 indigo/teal/orange 三主题下不破版；动效 SHALL 遵循 `prefers-reduced-motion`。

#### Scenario: 有 intro 的子平台产品

- **WHEN** 访问 `/products/aideanfleet` 且该产品 `intro` 含 links/facts
- **THEN** 页面按 页头（PagePlaceholder+badge）→ 简介+CTA → 核心能力卡 → 平台信息表 → 相关链接 → 返回矩阵 的固定区块序渲染，外链带 `target="_blank" rel="noopener noreferrer"`

#### Scenario: 无 intro 的存量产品

- **WHEN** 访问 `/products/aideanwiki`（intro 为 null）
- **THEN** 页面降级渲染 tagline/description/benefits，不出现空壳区块；slug 不存在或产品 DISABLED 时返回 `notFound()`

### Requirement: 链接后台可配置且服务端强校验

产品链接 SHALL 存于 `Product.intro.links`，由管理后台增删改；写侧 SHALL 经 `ProductIntroSchema` 校验：url 仅 http/https 协议、label ≤ 20 字、links ≤ 6 条、facts 分组 ≤ 6、每组条目 ≤ 12。校验失败 SHALL 返回 4xx 且不落库。

#### Scenario: 拒绝危险协议

- **WHEN** PATCH 产品 intro.links 含 `javascript:alert(1)`
- **THEN** 请求以 400 失败，AuditLog 不写入该产品变更

#### Scenario: 后台改链即时生效

- **WHEN** 管理员保存某产品的链接修改
- **THEN** 服务端 `revalidatePath` 后前台 `/products/<slug>` 即呈现新链接（复用 `/products` 既有 ISR + revalidatePath 链路）

### Requirement: 公开内容安全过滤

子平台介绍页文案 SHALL 为面向用户的重写文案，仅含定位/能力/技术栈框架层级/状态/仓库链接；端口矩阵、`.env` 键、内网地址/IP、模型池清单、架构漂移风险等台账内容（[规范说明] §4.3/§5/§6/§7.2）MUST NOT 出现在公开页面与 seed 文案中。

#### Scenario: seed 文案审查

- **WHEN** 审查 seed 中三个子平台产品的 description/benefits/facts
- **THEN** 无任何端口号、内网 IP、环境变量键名、供应商密钥体系描述

### Requirement: 数据单一来源

首页产品卡 SHALL 读库（与 `/products` 同查询）；`ProductSection.tsx` MUST NOT 保留硬编码产品数组。

#### Scenario: 首页卡与库一致

- **WHEN** 管理端下架某产品
- **THEN** 首页卡与 `/products` 同步消失（ISR 窗口内）

---

## MODIFIED Requirements

### Requirement: 产品导航下拉

「产品」二级下拉 SHALL 含：模型天梯图、模型服务提供商、AideanWiki、AideanBot、AideanFleet、AideanThesis；AideanWiki 条目 SHALL 由 `/products#aideanwiki` 锚点改为 `/products/aideanwiki` 详情页；`/api/v1/system/navigation` 透传 `NAV_ITEMS` 的契约与顺序测试 SHALL 同步。

#### Scenario: 导航直达详情页

- **WHEN** 用户点击导航「产品 → AideanBot」
- **THEN** 落地 `/products/wechatrag`（AideanBot 的 slug），与 API 响应 children 一致

---

## 数据口径备注

- `wechatrag` slug ↔ 显示名 **AideanBot** 的映射为有意决策（slug 为历史锚点与 seed 幂等键，不改名；生态旧名 WeChatRag 见规范说明 §2.1/§6-2）。
- 三子平台暂无公开入口，seed 仅配 GitHub 仓库链接；产品入口 URL 由运营在后台配置——这正是"链接后台可配置"的设计动机。
