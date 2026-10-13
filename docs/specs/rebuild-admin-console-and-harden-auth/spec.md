# 重建管理后台与认证加固 Spec

> change-id: `rebuild-admin-console-and-harden-auth` | 语言: 中文 | 版本: v1 | 创建: 2026-09-07 | 更新: 2026-09-07

---

## 为什么（Why）

浏览器全流程自动化测试（13 项）暴露 **P0 缺陷**：[middleware.ts](../../../../apps/web/middleware.ts) 仍以 HS256+JWT_SECRET 验签，而 M-SSO（0743f48）已迁 RS256/JWKS（kid=7aeb1bb2）→ 算法不匹配 → 全部 `/user/*` 307 回登录页（登记于 [项目状态审计.md](../../../docs/archive/项目状态审计.md) §五）。

同时用户验收提出 12 项后台管理缺陷：admin 复用前台布局（[app/layout.tsx](../../../../apps/web/app/layout.tsx) 在根布局强挂 SiteHeader/SiteFooter）、无独立登录页、无多层级侧边栏、缺用户/模型/提供商/产品/套餐/兑换码管理域（[项目状态审计.md](../../../docs/archive/项目状态审计.md) §8.5 蓝图）、前台登录后等级不可即时见。

本变更一次性收口：Phase 0 修 P0（先行独立交付），Phase 1–4 重建管理台并补前台等级展示。

---

## 变更清单（What Changes）

- middleware 验签 HS256 → RS256/JWKS（`createRemoteJWKSet` 自取 `/.well-known/jwks.json`，Edge 兼容，claims 对齐 verifyAccess：iss/aud/tier/ver/jti）。
- middleware matcher 扩至 `/admin/:path*`：未登录访问 /admin → 307 `/admin/login`（原 `/` 首页跳转废弃）。
- **BREAKING（仅内部结构，URL 不变）**：根布局剥离 SiteHeader/SiteFooter；前台页面迁入 `app/(site)/` 路由组，管理端迁入 `app/(admin)/` 路由组（组名不参与 URL，相对导入深度不变）。
- 新增 `/admin/login` 独立登录页（居中极简卡，不复用前台 AuthForm 观感，复用 `LoginSchema` 与 `/api/v1/auth/login`）。
- 新增 `(admin)/layout.tsx` 管理外壳：两级手风琴侧边栏（可收起纯图标 + aria-label）、独立顶栏（面包屑 + 管理员身份 + 返回主站），RSC 守卫回库复核。
- `/admin` 改为概览页（统计卡），原 AdminConfigPanel 迁至 `/admin/configs`。
- 新增管理页面：/admin/users、/admin/models、/admin/vendors、/admin/products、/admin/packages、/admin/redemptions 及配套 API（全部走 `requireAdminApi` + 写 AuditLog）。
- 新增 Prisma 模型：`Product`（产品矩阵）、`PartnerKey`（卡商密钥，keyHash 存储）；`RedemptionStatus` 枚举新增 `ISSUED`（已出库未售）。
- 实现 redemption service/repository（现占位桩）：CAS 状态机核销 → 余额码入账（ledger GRANT 幂等）/ 套餐码开 PackageOrder。
- 新增站内兑换 API `POST /api/v1/redemption/redeem`；卡商 API `GET /api/v1/partner/codes`（批量取码，X-API-Key + Redis 限流）与查码接口。
- 新增管理端余额调账 API（强制 ledger ADJUST 双录 + 备注）。
- 前台 Header 登录后即时显示等级徽章（NORMAL/PRO/MAX → 普通/Pro/Max），无需进入详情页。

---

## 影响面（Impact）

- Affected specs: `close-admin-loop-and-harden-billing`（admin 门禁/配置闭环结论被继承并扩展）；`probe-multidim-gaps-and-admin-blueprint`（§8.5 蓝图本 spec 落地）。
- Affected code:
  - 修改类：`apps/web/middleware.ts`；`apps/web/app/layout.tsx`；`apps/web/components/site/HeaderSession.tsx`、`UserMenu.tsx`；`apps/web/prisma/schema.prisma`、`prisma/seed.ts`；`packages/shared/src/schemas/redemption.schema.ts`。
  - 移动类：`apps/web/app/(web)/{about,docs,ladder,login,models,partners,pricing,products,register,roadmap,user}` → `apps/web/app/(site)/`；`apps/web/app/(web)/admin` → `apps/web/app/(admin)/admin`（URL 均不变）。
  - 新建类：`apps/web/app/(admin)/layout.tsx`、`apps/web/app/(admin)/admin/{login,users,models,vendors,products,packages,redemptions,configs}/page.tsx`；`apps/web/app/api/v1/admin/{users,models,packages,products,redemption-codes,wallets}/route.ts` 及 `[id]/route.ts`；`apps/web/app/api/v1/redemption/redeem/route.ts`；`apps/web/app/api/v1/partner/codes/route.ts`；`apps/web/components/admin/*`；`apps/web/lib/features/package/redemption/{service,repository}.ts`（实现占位桩）。

---

## ADDED Requirements

### Requirement: 管理端独立信息架构

前台与管理端 SHALL 由路由组隔离：`(site)` 组布局承载 SiteHeader/SiteFooter，`(admin)` 组布局承载管理外壳；管理端任何页面 SHALL NOT 渲染前台 Header/Footer/导航；两者 URL SHALL 与拆分前完全一致。

#### Scenario: 拆分后 URL 与头尾隔离

- **WHEN** 访问 /models、/ladder、/login 与 /admin、/admin/users
- **THEN** 前四者渲染前台 Header/Footer 且路径不变；后两者无前台 Header/Footer、有管理侧边栏
- **AND** 浏览器取证截图 + `next build` 退出码 0

### Requirement: 管理端独立登录页

`/admin/login` SHALL 提供居中、极简、独立视觉的账号密码登录卡；提交 SHALL 复用 `POST /api/v1/auth/login` 与 `LoginSchema`；成功后 SHALL 跳转 `/admin`；未登录访问 `/admin/*` SHALL 由 middleware 307 至 `/admin/login?redirect=…`。

#### Scenario: 未登录进入管理端被引导至独立登录页

- **WHEN** 匿名访问 /admin/users
- **THEN** 307 至 /admin/login?redirect=%2Fadmin%2Fusers
- **AND** 登录成功后回跳原路径；普通用户登录后访问 /admin 由 RSC 守卫重定向回 /admin/login 并提示无权限

### Requirement: 两级可收起侧边栏

`(admin)/layout.tsx` SHALL 渲染两级手风琴侧边栏（组→子项），支持收起为纯图标模式（hover/aria-label 提示），收起状态 SHALL 持久化于 localStorage；所有交互元素 SHALL 具备可访问名。

#### Scenario: 侧边栏展开收起

- **WHEN** 点击收起按钮
- **THEN** 侧边栏变窄仅显图标，再次点击恢复，刷新后状态保持
- **AND** [人工] 截图取证 + axe/aria 断言

### Requirement: 概览页与配置页分离

`/admin` SHALL 为概览页（用户数/模型数/待用兑换码/钱包总余额四统计卡 + 快捷入口）；原 AdminConfigPanel SHALL 迁至 `/admin/configs` 且功能等价（颗粒度 + 厂商优先级读写闭环不回退）。

#### Scenario: 概览统计与配置迁移

- **WHEN** 管理员访问 /admin 与 /admin/configs
- **THEN** 概览页四卡数值与库内聚合一致；配置页 PUT 后 revalidatePath 即时生效（原 E2E 口径复验）
- **AND** `pnpm vitest run` admin 相关用例全绿

### Requirement: 用户管理

管理端 SHALL 提供用户列表（分页/邮箱搜索）、详情（tier/status/role/钱包余额只读）；SHALL 支持 PATCH 调整 tier 与封禁/解封；封禁 SHALL 置 status=SUSPENDED 且 tokenVersion++（全端令牌失效）；每次变更 SHALL 写 AuditLog。

#### Scenario: 封禁即时生效

- **WHEN** 管理员封禁用户 U 后 U 用现有 access 访问 /api/v1/auth/me
- **THEN** me 返回 401（ver 失配或 status 校验）
- **AND** audit_logs 新增一条该操作记录

### Requirement: 模型与提供商管理

管理端 SHALL 提供模型列表（分页/搜索 modelCode）与编辑（nameDisplay/isActive/visibility/isFeatured/sortOrder），isActive 变更 SHALL `revalidatePath("/models")`；SHALL 提供提供商完整 CRUD（新建/编辑/软删，priority 沿用现语义）。

#### Scenario: 模型上下架即时生效

- **WHEN** PATCH /api/v1/admin/models/[id] isActive=false
- **THEN** /models 页 SSR 不再呈现该模型（revalidatePath 失效缓存）
- **AND** 浏览器取证

### Requirement: 产品管理

新增 `Product` 模型（UUIDv7 主键、slug 唯一、软删）；管理端 SHALL 提供 CRUD；前台 `/products` 页 SHALL 改为读库渲染，库空时回退现有静态占位内容。

#### Scenario: 产品 CRUD 同步前台

- **WHEN** 管理员新建/编辑产品后访问 /products
- **THEN** 前台呈现与库内一致（revalidatePath 失效）
- **AND** 数据库迁移成功且数据库文档登记

### Requirement: 套餐管理

管理端 SHALL 提供套餐（Package）CRUD（title/priceMinor/durationHours/benefits/status）与套餐兑换订单（PackageOrder）只读列表；敏感口径 SHALL 沿用 schema 既有约束（金额 BigInt 分）。

#### Scenario: 套餐新建后可被兑换码绑定

- **WHEN** 管理员新建套餐 P 后生成 PACKAGE 目标兑换码
- **THEN** 该码核销后创建 PackageOrder(packageId=P.id) 且 ACTIVE
- **AND** vitest 用例覆盖

### Requirement: 兑换码管理、站内兑换与卡商 API

实现 redemption 域：批次生成（面额/数量/有效期/前缀）→ 明文一次性导出 CSV（服务端不留存明文副本）；核销 SHALL 单事务 CAS（updateMany status ENABLED|ISSUED→USED 防并发双花）；余额码入账 SHALL 写 ledger GRANT（idempotencyKey=`redemption:{id}`）幂等；套餐码 SHALL 创建 PackageOrder；`POST /api/v1/redemption/redeem` SHALL 登录态 + Redis 限流；卡商 API `GET /api/v1/partner/codes` SHALL 以 `X-API-Key`（PartnerKey.keyHash=SHA-256 比对）鉴权 + Redis 限流，出库码置 ISSUED，并提供单码状态查询；管理端可禁用单个/整批兑换码。

#### Scenario: 并发核销不双花

- **WHEN** 同一余额码两并发请求同时 redeem
- **THEN** 恰一单成功入账（余额=面额一次），另一单返回码已使用
- **AND** ledger 恰一条 GRANT（幂等键唯一约束兜底），vitest 并发用例覆盖

#### Scenario: 卡商取码鉴权与出库

- **WHEN** 携带有效 X-API-Key 请求 count=5、无效 Key 请求同端点
- **THEN** 前者返回 5 枚 ISSUED 状态明文码（限流窗口内），后者 401
- **AND** 限流超限返回 429 信封

### Requirement: 余额调账走账本

管理端调账 API SHALL 以 ledger ADJUST 双录（direction 视正负、amountMinor 恒正、idempotencyKey=`admin-adjust:{walletId}:{请求键}`）变更钱包余额并推进 lockVersion；页面 SHALL 强制填写备注；用户侧余额页 SHALL 只读呈现。

#### Scenario: 调账入账本

- **WHEN** 管理员为钱包 W 调账 +10.00 元并备注
- **THEN** W.balanceMinor +1000，ledger_entries 新增 ADJUST 双录，余额页可见新余额
- **AND** vitest 断言账本对账恒等式（posted credits/debits 与 balance 一致）

### Requirement: 前台等级即时可见

登录用户 SHALL 在前台 Header 即时看到等级徽章（NORMAL→普通 / PRO→Pro / MAX→Max，配色区分），SHALL NOT 需进入详情页；徽章数据来自既有 `/api/v1/auth/me`（已返回 tier）；加载占位与徽章 SHALL 同尺寸防布局跳变。

#### Scenario: 登录后首屏即见等级

- **WHEN** PRO 用户登录后回到任意前台页
- **THEN** Header 用户区紧邻头像渲染「Pro」徽章
- **AND** [人工] 浏览器截图取证（chromium devtools）

---

## MODIFIED Requirements

### Requirement: middleware 登录守卫（原 Task A.3.1，spec implement-mvp-auth）

原条款「使用 jose 子路径 ./jwt/verify 以 HS256+JWT_SECRET 验签」**全部修订为**：middleware SHALL 以 `createRemoteJWKSet` 自取同源 `/.well-known/jwks.json`（Edge 兼容，jose 内建 kid 缓存），SHALL 以 RS256 + iss=AUTH_ISSUER + aud=AUTH_AUDIENCE_SELF 验签并校验 sub/tier/ver/jti claims；matcher SHALL 为 `['/user/:path*', '/admin/:path*']`，`/user/*` 未登录 307 `/login`、`/admin/*` 未登录 307 `/admin/login`；JWKS 拉取失败 SHALL 视为未登录（fail-closed）不 crash。

#### Scenario: RS256 令牌通过 middleware

- **WHEN** 携带 M-SSO 签发的 RS256 access（kid=7aeb1bb2）访问 /user/balance
- **THEN** 返回 200 页面（不再 307）
- **AND** 浏览器取证 + middleware 单测（mock JWKS fetch：有效/过期/伪造 kid/refresh 混入四态）

（其余 ADDED 之前已在「变更清单」列明，无其他 MODIFIED 条款）

---

## REMOVED Requirements

（无）
