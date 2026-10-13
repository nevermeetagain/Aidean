# 架构说明（规划视角）

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）——只描述现状与本规划增量，权威架构见 docs/architecture/技术架构文档.md

## 1. 现状分层（以代码为准）

```
浏览器 ──> Next.js 15 App Router（apps/web，:3000）
            ├─ middleware.ts（/user/*、/admin/* 登录守卫，RS256 JWKS 验签）
            ├─ app/(site)/**  前台 RSC 页面        ── components/{site,home,ladder,console,...}
            ├─ app/(admin)/** 后台 RSC 页面（32）   ── components/admin/**（AdminDataTable 等）
            ├─ app/api/v1/**  148 个路由（withApi 信封 + requireUserApi/requireAdminApi(permission)）
            │     └─ lib/features/<domain>/{repository,service,schema,types}.ts
            ├─ app/oauth/** + .well-known/**  OIDC IdP（子平台 SSO）
            └─ lib/{sync,discovery,intelligence}  采集/发现/情报
packages/shared  契约唯一源：zod schemas · permissions · constants · money utils（→ 本规划加 errors.ts）
packages/ui      底座组件（Button/Dialog/Table/Tabs/EChartWrapper…）
PostgreSQL 16（Prisma 6，68 模型）· Redis（限流/调度锁/缓存）· 上游模型平台（网关，CI 用 mock-upstream）
```

依赖方向：`apps/web → packages/{shared,ui}`；`packages/*` 不得依赖 `apps/*`（TASK-007 模块边界守卫）；`components/**` 不得直连 Prisma。

## 2. 本规划增量（全部落在既有分层内，无新服务、无新存储）

| 增量 | 层 | 新模块 | 复用 |
|---|---|---|---|
| 错误码唯一源 | 契约 | packages/shared/src/errors.ts | _lib/errors.ts 改重导出 |
| 就绪探针 | API | lib/features/system/readiness.ts + /system/ready | lib/db/{prisma,redis} |
| 功能开关 | 契约/API/UI | lib/features/flags/**、/system/features、/admin/feature-flags | unstable_cache + revalidateTag 模式、AdminDataTable |
| 收藏 | 契约/API/UI | lib/features/favorites/**、/user/favorites | favorites 表、SWR、requireFeature |
| 限时优惠 | 契约/API/UI | lib/features/pricing/effective-price.ts、/admin/prices/promotions | model_prices（PROMOTION）、PricesManager |
| 搜索 | 契约/API/UI | lib/features/search/**、/api/v1/search、GlobalSearch | lib/rate-limit.ts |
| 数据修复 | 数据 | 迁移 M-001 | persistPrices |
| 守卫 | 工程 | scripts/guard/**、scripts/contract/**、CI e2e job | 既有 check-docs-* |

## 3. 横切关注点
- **性能**：新读路径均有缓存或索引覆盖（05 §5.3）；无基线不做优化（11 §11.1）。
- **扩展性**：功能开关码表与受控面映射集中在契约（新增码 = 改契约 + 种子）；搜索类型枚举可扩展（SEARCH_TYPES）。
- **配置**：新增环境变量 0 个；CI 仅新增测试用 env（mock 上游、限流旁路，均有生产保护）。
- **安全**：所有新 admin 写端点走 requireAdminApi(code) + AuditLog；公开端点不返回敏感键；搜索公开端点 IP 限流。
- **可观测**：ready 探针 + x-request-id 透传；资金路径 usage_log 记录 quotaMinor。
