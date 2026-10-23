# ADR-0012（草案）：会话版本校验与 Edge 依赖隔离

> 版本: v1.0 | 更新: 2026-10-23 | 变更: V0.12.0 规划首版（基线 main@3b9f88c）

- 状态：提议（T120-02 / T120-18 落地时改为已接受）
- 背景：封禁/改密后旧 access 在 15 分钟内仍有效（REQ-NF-011）；middleware 经 `auth/constants.ts → lib/db/prisma.ts` 引入 Prisma，build 报 Edge 不兼容警告。
- 决策：①requireUserApi / requireAdminApi 在**既有**回库查询中追加 `tokenVersion` 投影并与 `claims.ver` 比对，不新增往返；②token_version 自增点（封禁、改密、重置）同事务吊销 refresh；③middleware 只依赖新文件 `edge-constants.ts`（零 node 依赖），从 DB 读 TTL 配置的函数留在 node 侧；新增 `scripts/guard/edge-imports.mjs` 守卫。
- 备选：Redis 黑名单 jti（需逐个吊销、键量随会话增长，否决）。
- 后果：改密/封禁即时生效；middleware 体积下降（数值由 T120-02 实测）。
