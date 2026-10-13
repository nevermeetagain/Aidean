# ADR-0002 · 前后端分离采用 Monorepo 分包架构

- **状态**：已采纳（Accepted）
- **日期**：2026-08-26
- **决策人**：EDY（产品/架构）、GLM（执行）
- **关联**：修正 ADR-0001 决策 4"单一应用仓库形态"中"不强行上 monorepo"的口径（技术栈锁定不变，见决策 1）；激活 ADR-0001 第五节预留的升级路径。

## 一、背景（Context）

主平台进入实施期（需求 v1.4 / schema v2.0 已就绪），用户提出五项工程要求：

1. 前后端分离；
2. 前端组件化、不重复造轮子；
3. 尽可能提高前后端代码/功能/方法的可复用率；
4. 高性能的目录设计；
5. 每个功能/模块/板块按类型存储、结构清晰，不把所有文件堆一个目录。

同时存在两个既成事实：

- 根 `package.json` 已是 turbo monorepo（`--filter=web`），`apps/web` 与 `packages/shared-types` 雏形已存在但未完成（db 脚本路径断裂、分包未真正建立）。
- 旧 `src/` 代码与文档口径严重脱节（22 个文件引用已删除模型、余额口径已变、导航已变）。

## 二、决策（Decision）

1. **架构形态 = Monorepo 分包（pnpm + Turborepo）**：`apps/web` 承载 Next.js 全栈（页面 + API Routes，即"前后端在部署上不分离、在代码上物理分包"）；共享能力下沉 `packages/*`。**不推翻 ADR-0001 的技术栈锁定**（Next.js 15 + PG16 + Redis + Prisma + Tailwind 4），仅修正"单一应用仓库"表述。
   - 不选"独立双工程"（Vite 前端 + NestJS 后端）：丢失 SSR/ISR/SEO（公开榜单页靠 SEO 获客）、类型共享需发包、部署服务翻倍，且 MVP 期无独立伸缩的流量证明。
   - 保留升级通道：网关转发流量证明需要独立伸缩时，新增 `apps/api`（NestJS）承接 `/api/v1/gateway/*`，页面与业务 API 留在 `apps/web`——分包边界即未来的拆分边界。
2. **旧 `src/` 代码归档重写**：整体移入 `.example/history/current-legacy/`（只读，遵守铁律 4 模式），按新蓝图全新实施；确认可用的片段（部分 UI 组件）按需搬迁。
3. **分层复用策略**（回应"尽可能提高复用率"）：
   - 基础层强制复用：`packages/ui`（组件）、`packages/shared`（类型/DTO/Zod schema/常量）、hooks 与工具函数；
   - 业务层按 feature 隔离，不跨业务强行共享；业务组件**第三次重复出现**才提升为公共组件（三次法则，防过度抽象）；
   - "不重复造轮子"首先指用现成方案：shadcn 模式原子组件、lucide-react 图标、ECharts 图表、Zod 校验。
4. **高性能目录五细则**：
   - 分包边界 = turbo 缓存边界（按包配置 build/lint/typecheck 管道，增量构建）；
   - App Router 路由目录 = 代码分割边界（天然按页分块）；
   - `'use client'` 下沉到叶子组件，页面级默认 Server Component（最小化客户端 bundle）；
   - **禁用业务代码内的 barrel file**（`index.ts` 汇出伤 tree-shaking 与构建速度）；仅 `packages/*` 入口允许；
   - 重库（ECharts 等）动态 `import()`，只在用到的路由 chunk 出现。
5. **混合式"按类型存储"**：路由层按 Next.js 约定（`app/`）；业务逻辑按 feature 分包（`lib/features/<name>/` 内自含 service/repository/schema）；基础层按类型（`components/ui`、`lib/utils`、`packages/shared`）。

## 三、理由（Rationale）

- 代码库已是 turbo 雏形，"完成 monorepo"是追认事实而非强行升级；
- 前后端类型/DTO/常量/组件跨端复用在 monorepo 内零成本（workspace 协议），这是"复用率"诉求的最大杠杆；
- 保留 Next.js 全栈即保留 SSR/SEO 与既有迁移资产（Prisma schema v2.0、契约测试口径），改动半径最小；
- 归档重写：旧代码与新架构（分包 + 账本 + 七项导航）兼容度极低，搬运成本高于重写，且与 ADR-0001 确立的"历史只读"治理模式一致。

## 四、后果（Consequences）

- **正向**：分包边界清晰（复用有载体）；turbo 缓存提速构建；类型契约（packages/shared 的 Zod schema）成为前后端唯一真源；未来可无痛拆分独立 API 服务。
- **代价**：工程初始化成本（workspace/tsconfig paths/管道配置）一次性投入；文档需同步（目录结构文档 v2.0、技术架构文档 D 系列）。
- **约束**：`apps/web` 内 API Routes 仍须走 Route→Service→Repository 三层（继承旧体系 D 系列决策，接口分层规范见《API 架构设计方案》）。
