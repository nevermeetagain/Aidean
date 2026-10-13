# 项目结构重建方案

> 基于《项目完整目录结构 v2.0》规范，对 Aidean 生态 6 个平台进行结构审计、目标设计、迁移规划。
> 生成日期：2026-09-30

---

## 一、现状审计

### 1.1 Aidean（Hub / 主平台）

```
Aidean/
├── apps/web/              # Next.js 15 前端 + API Routes
│   ├── app/               # App Router：(admin) (admin-login) (site) api/ oauth/
│   ├── components/
│   ├── lib/
│   │   ├── features/      # 15 个功能模块（auth, billing, gateway, news, ...）
│   │   ├── admin/
│   │   ├── db/            # prisma.ts, redis.ts
│   │   └── sync/
│   ├── prisma/            # schema.prisma + migrations
│   ├── hooks/ stores/ docs/ scripts/ public/
│   └── middleware.ts
├── packages/              # config, shared, ui
├── database/baseline/
├── scripts/               # check-docs, crawl, db, deploy, ops, ranking, test
├── deploy/                # base, caddy, pgbouncer, prometheus, web, synapse
├── docker/ data/ e2e/ public/ docs/
└── 参考文档/
```

**审计发现**：
| 检查项 | 状态 | 说明 |
|--------|:---:|------|
| 根目录白名单 | ⚠️ | `参考文档/` 非规范目录名；`data/` 应在 `.local/` |
| 模块化组织 | PARTIAL | `lib/features/` 有 15 个模块但无 domain/application/interfaces 分层 |
| contracts/ 共享类型 | MISSING | `packages/shared` 存在但非 contracts 模式 |
| 三类配置分离 | PARTIAL | `packages/config` 有 eslint/prettier/tsconfig 但未分 base/local/secret |
| 生成物治理 | MISSING | 无 Makefile guard / make guard |
| 依赖方向 enforcement | MISSING | 无 ESLint module boundary / dependency-cruiser |
| .local/ 隔离 | MISSING | 无 .local/ 目录，data/ 暴露在根 |
| AGENTS.md | MISSING | 根目录无 AGENTS.md |
| Makefile | MISSING | 无 Makefile（用 scripts/ 替代） |

### 1.2 子平台结构概览

| 平台 | 语言 | 结构特点 | 关键差距 |
|------|------|----------|----------|
| AideanBot | TS | backend/ + frontend/ 分离 | 无模块化、无 contracts、无 AGENTS.md 规范 |
| BotHot | TS | apps/ + backend/ + frontend/ + packages/ | 有 Makefile 但无架构 guard；混合结构 |
| AideanFleet | Python | fleet/ + config/ + reports/ | Python 项目，无模块分层；有 Makefile |
| AideanThesis | Python+TS | apps/ + packages/ + database/ | 有 Makefile + pnpm workspace；最接近规范 |
| AideanCompany | — | 不存在 | 完全待建 |


---

## 二、目标结构设计 — Aidean（Hub）

### 2.1 目标目录树

```
Aidean/
├── AGENTS.md                      # AI Agent 入口（规范格式）
├── Makefile                       # 架构 guard + 常用命令
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
│
├── apps/
│   ├── web/                       # Next.js 前端
│   │   ├── app/                   # App Router（保留）
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── middleware.ts
│   │   └── package.json
│   └── api/                       # 独立 API 服务（从 app/api 提取）
│       ├── modules/
│       │   ├── identity/          # 身份域：OIDC IdP 7 端点
│       │   │   ├── domain/        # 实体、值对象、领域服务
│       │   │   ├── application/   # 用例、命令、查询
│       │   │   ├── interfaces/    # HTTP 控制器、DTO
│       │   │   └── infrastructure/ # OIDC 库适配、JWKS 缓存
│       │   ├── billing/           # 计费域：余额/套餐/预留/对账
│       │   │   ├── domain/
│       │   │   ├── application/
│       │   │   ├── interfaces/
│       │   │   └── infrastructure/
│       │   ├── gateway/           # LLM 网关域：provider 池/路由/缓存
│       │   │   ├── domain/
│       │   │   ├── application/
│       │   │   ├── interfaces/
│       │   │   └── infrastructure/
│       │   ├── event/             # 事件域：Outbox 发布器/Webhook
│       │   │   ├── domain/
│       │   │   ├── application/
│       │   │   ├── interfaces/
│       │   │   └── infrastructure/
│       │   ├── provenance/        # 溯源域：Provenance 图/查询
│       │   │   ├── domain/
│       │   │   ├── application/
│       │   │   ├── interfaces/
│       │   │   └── infrastructure/
│       │   ├── news/              # 新闻/内容域
│       │   ├── ladder/            # 天梯域
│       │   ├── ranking/           # 排名域
│       │   └── shared/            # 跨域共享（非 contracts）
│       └── package.json
│
├── packages/
│   ├── contracts/                 # 共享类型/接口/DTO 契约
│   │   ├── identity/              # OIDC 契约（User, Token, Scope）
│   │   ├── billing/               # 计费契约（Balance, Plan, Usage）
│   │   ├── event/                 # 事件契约（7 种事件类型）
│   │   ├── gateway/               # 网关契约（ChatRequest, ChatResponse）
│   │   ├── provenance/            # 溯源契约
│   │   └── package.json
│   ├── config/                    # 三类配置分离
│   │   ├── base/                  # 基础配置（eslint, prettier, tsconfig）
│   │   ├── local/                 # 本地开发配置（.env.example）
│   │   └── secret/                # 密钥配置模板（不提交实际值）
│   ├── ui/                        # 共享 UI 组件库
│   └── shared/                    # 共享工具函数
│
├── database/
│   ├── schema.prisma              # Prisma schema（从 apps/web/prisma 提取）
│   ├── migrations/
│   ├── seed/
│   └── baseline/
│
├── infra/
│   ├── deploy/                    # 部署配置（caddy, pgbouncer, prometheus）
│   ├── docker/                    # Dockerfile + compose
│   └── scripts/                   # 运维脚本
│
├── scripts/                       # 开发脚本
│   ├── check-module-boundaries.mjs
│   ├── check-docs-facts.mjs
│   └── check-port-gating.mjs
│
├── docs/                          # 规范文档体系（见 docs-rebuild-plan.md）
│
├── e2e/                           # E2E 测试
│
├── .local/                        # 本地运行产物（gitignored）
│   ├── data/
│   ├── logs/
│   └── cache/
│
└── .github/
    └── workflows/
        └── ci.yml                 # lint → test → guard → build
```

### 2.2 关键设计决策

1. **apps/api/ 独立提取**：当前 API Routes 内嵌于 Next.js app/api/，规范要求 API 独立部署以便 Hub-and-Spoke 架构中子平台通过 OIDC/网关访问
2. **modules/ 按业务域组织**：identity/billing/gateway/event/provenance 五大核心域 + news/ladder/ranking 业务域
3. **每域四层分层**：domain（纯业务逻辑）→ application（用例编排）→ interfaces（HTTP/DTO）→ infrastructure（技术适配）
4. **contracts/ 跨平台共享**：OIDC/计费/事件/网关/溯源的 TypeScript 类型定义，子平台通过 npm/pip 引用
5. **.local/ 隔离**：data/logs/cache 移累的本地产物全部隔离到 .local/，gitignored


---

## 三、目标结构设计 — 子平台

### 3.1 AideanBot（TS / Hono）

```
AideanBot/
├── AGENTS.md
├── Makefile
├── package.json
├── apps/
│   └── bot/
│       ├── modules/
│       │   ├── channels/          # 渠道适配（微信/飞书/钉钉/...）
│       │   │   ├── domain/
│       │   │   ├── application/
│       │   │   ├── interfaces/
│       │   │   └── infrastructure/
│       │   ├── oidc-client/       # OIDC 客户端（接入 Hub）
│       │   ├── gateway-client/    # 网关客户端（代理 LLM 调用）
│       │   ├── billing-client/    # 计费客户端（余额查询）
│       │   └── event-handler/     # 事件处理（接收 Hub Webhook）
│       └── package.json
├── packages/
│   └── contracts/                 # 从 @aidean/contracts 引用
├── database/
├── infra/
├── scripts/
├── docs/
└── .local/
```

### 3.2 BotHot（TS / Hono）

```
BotHot/
├── AGENTS.md
├── Makefile                       # 加架构 guard
├── package.json
├── apps/
│   └── bothot/
│       ├── modules/
│       │   ├── collectors/        # 10 渠道采集器
│       │   │   ├── domain/
│       │   │   ├── application/
│       │   │   ├── interfaces/
│       │   │   └── infrastructure/
│       │   ├── clustering/        # 热点聚簇算法
│       │   ├── daily-report/      # 日报生成
│       │   ├── event-push/        # 事件推送
│       │   ├── oidc-client/       # 【待接入】
│       │   ├── gateway-client/    # 【待接入】
│       │   ├── billing-client/    # 【待接入】
│       │   └── event-handler/     # 【待接入】
│       └── package.json
├── packages/
│   └── contracts/
├── database/
├── infra/
├── scripts/
├── docs/
└── .local/
```

### 3.3 AideanFleet（Python）

```
AideanFleet/
├── AGENTS.md
├── Makefile                       # 加架构 guard
├── pyproject.toml
├── apps/
│   └── fleet/
│       ├── modules/
│       │   ├── orchestration/     # DAG 引擎 + 10 状态机
│       │   │   ├── domain/        # DAG 节点/边/状态定义
│       │   │   ├── application/   # 编排用例
│       │   │   ├── interfaces/    # HTTP API + CLI
│       │   │   └── infrastructure/ # SQLite/JSONL 持久化
│       │   ├── executors/         # HttpExecutor + 未来扩展
│       │   ├── oidc-client/
│       │   ├── gateway-client/
│       │   ├── billing-client/
│       │   └── event-handler/
│       └── __init__.py
├── packages/
│   └── contracts/                 # Python 包：fleet_contracts
├── config/
├── docs/
├── reports/                       # 运行报告（生成物）
└── .local/
```

### 3.4 AideanThesis（Python / FastAPI + TS 前端）

```
AideanThesis/
├── AGENTS.md
├── Makefile
├── apps/
│   ├── api/                       # FastAPI 后端
│   │   ├── modules/
│   │   │   ├── writing/           # 写作/模板/导出
│   │   │   │   ├── domain/
│   │   │   │   ├── application/
│   │   │   │   ├── interfaces/
│   │   │   │   └── infrastructure/
│   │   │   ├── review/            # 审阅/查重
│   │   │   ├── oidc-client/       # 【替换 jwt_provider.py】
│   │   │   ├── gateway-client/
│   │   │   ├── billing-client/
│   │   │   └── event-handler/
│   │   └── requirements.txt
│   └── web/                       # 前端
├── packages/
│   └── contracts/
├── database/
├── infra/
├── docs/
└── .local/
```

### 3.5 AideanCompany（待建）

```
AideanCompany/
├── AGENTS.md
├── Makefile
├── package.json                   # 或 pyproject.toml（待定）
├── apps/
│   └── company/
│       ├── modules/
│       │   ├── knowledge/         # 知识库管理
│       │   ├── oidc-client/
│       │   ├── gateway-client/
│       │   ├── billing-client/
│       │   └── event-handler/
│       └── package.json
├── packages/
│   └── contracts/
├── database/
├── infra/
├── docs/
└── .local/
```

### 3.6 子平台通用模式

每个子平台必须包含以下 4 个接入模块：

| 模块 | 职责 | 依赖 |
|------|------|------|
| `oidc-client/` | OIDC 认证（登录/登出/token 验证/JWKS 缓存） | @aidean/contracts/identity |
| `gateway-client/` | LLM 网关代理调用（禁止直连 provider） | @aidean/contracts/gateway |
| `billing-client/` | 余额查询/消费上报（禁止持久化余额） | @aidean/contracts/billing |
| `event-handler/` | 接收 Hub Webhook 事件 + HMAC 验签 + 幂等处理 | @aidean/contracts/event |


---

## 四、架构 Guard 配置

### 4.1 四层 Guard 体系

| 层 | 工具 | 检查内容 | 配置文件 |
|:---:|------|----------|----------|
| L1 | ESLint | 模块边界、import 方向、禁止跨域直接引用 | `.eslintrc.module-boundaries.js` |
| L2 | dependency-cruiser | 依赖图方向、循环依赖检测 | `.dependency-cruiser.js` |
| L3 | Makefile guard | 生成物不提交、端口不冲突、文档漂移 | `Makefile` guard target |
| L4 | CI pipeline | lint → test → guard → build 全流水线 | `.github/workflows/ci.yml` |

### 4.2 ESLint 模块边界规则（Aidean Hub 示例）

```javascript
// .eslintrc.module-boundaries.js
module.exports = {
  rules: {
    "boundaries/element-types": ["error", {
      default: "disallow",
      rules: [
        // domain 只能被同域 application 引用
        { from: "domain", allow: ["application"] },
        // application 可引用同域 domain + interfaces
        { from: "application", allow: ["domain", "interfaces"] },
        // interfaces 可引用同域 application
        { from: "interfaces", allow: ["application"] },
        // infrastructure 可引用同域 domain + application
        { from: "infrastructure", allow: ["domain", "application"] },
        // 跨域引用只能通过 contracts
        { from: "modules/*", allow: ["contracts/*"] },
      ]
    }]
  }
};
```

### 4.3 Makefile Guard 目标

```makefile
# Makefile
.PHONY: guard lint test build ci

guard: guard-modules guard-ports guard-docs guard-generated
	@echo "✓ All architecture guards passed"

guard-modules:
	@npx eslint -c .eslintrc.module-boundaries.js apps/api/modules/
	@npx dependency-cruiser apps/api/modules/

guard-ports:
	@node scripts/check-port-gating.mjs

guard-docs:
	@node scripts/check-docs-facts.mjs
	@node scripts/check-docs-rule.mjs

guard-generated:
	@# 确保生成物不提交
	@git diff --cached --name-only | grep -E '\.(generated|auto)\.' && exit 1 || true

lint:
	@pnpm lint

test:
	@pnpm test

build:
	@pnpm build

ci: lint test guard build
	@echo "✓ CI pipeline passed"
```

### 4.4 CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: make lint
      - run: make test
      - run: make guard
      - run: make build
```

---

## 五、AGENTS.md 规范入口

```markdown
# AGENTS.md — Aidean 生态

## 项目概述
Aidean 是多平台 AI 生态的 Hub 平台，提供 OIDC 身份统一、LLM 网关、统一计费、
事件分发、溯源追踪等基础设施服务。

## 架构
- 拓扑：Hub-and-Spoke（详见 docs/03_solution/SOL-001）
- 技术栈：TypeScript / Next.js 15 / Prisma / PostgreSQL
- 端口段：[3000, 3100)

## 目录结构
- `apps/web/` — Next.js 前端
- `apps/api/` — API 服务（模块化）
- `packages/contracts/` — 跨平台共享契约
- `packages/config/` — 三类配置分离
- `database/` — Prisma schema + migrations
- `infra/` — 部署/运维配置
- `docs/` — 规范文档体系（00_governance ~ 09_archive）
- `.local/` — 本地产物（gitignored）

## AI Agent 修改边界
- ✅ 可修改：apps/*/modules/*/domain/, application/
- ✅ 可修改：apps/*/modules/*/interfaces/（新增端点）
- ⚠️ 需评审：packages/contracts/（影响所有子平台）
- ⚠️ 需评审：apps/*/modules/*/infrastructure/（技术选型变更）
- ❌ 不可修改：docs/00_governance/（人工维护）
- ❌ 不可修改：.local/（运行时产物）

## 常用命令
- `make ci` — 完整 CI 流水线
- `make guard` — 架构 guard 检查
- `make dev` — 本地开发
- `make test` — 测试

## 关键约束
1. 子平台禁止直连 LLM provider（必须走网关）
2. 子平台禁止持久化余额（必须实时查询 Hub）
3. 端口分配通过 CI port gating 强制（半开区间）
4. 文档双向追溯必须完整（REQ → SOL → CODE）
```

---

## 六、迁移路线图

### Phase 0：准备（1 周）

1. 创建 `.local/` 目录，迁移 `data/` → `.local/data/`
2. 创建 `AGENTS.md` 和 `Makefile`（基础版）
3. 将 `参考文档/` 重命名为 `.example/`（隐藏目录）

### Phase 1：Aidean Hub 结构重组（2 周）

4. 提取 `apps/web/app/api/` → `apps/api/`
5. 将 `lib/features/*` 重组为 `apps/api/modules/*/` 四层分层
6. 提取共享类型 → `packages/contracts/`
7. 拆分 `packages/config` → `base/ + local/ + secret/`
8. 迁移 `deploy/ + docker/` → `infra/`

### Phase 2：架构 Guard 配置（1 周）

9. 配置 ESLint 模块边界规则
10. 配置 dependency-cruiser
11. 完善 Makefile guard 目标
12. 配置 CI pipeline

### Phase 3：子平台结构对齐（3 周，并行）

13. AideanBot：backend/frontend → apps/bot/modules/ + 4 接入模块
14. BotHot：重组 + 接入 SSO/网关/余额（消除 3 个 MISSING）
15. AideanFleet：fleet/ → apps/fleet/modules/ + 4 接入模块
16. AideanThesis：apps/api/modules/ + 替换 JWT → OIDC（消除 1 个 DIVERGED）
17. AideanCompany：从零创建结构

### Phase 4：验证（1 周）

18. 全生态架构 guard 通过
19. 端口 CI gating 验证
20. 文档双向追溯验证
21. 子平台接入集成测试

---

## 七、迁移映射表（Aidean Hub）

| 源 | 目标 | 操作 |
|----|------|:---:|
| `apps/web/app/api/` | `apps/api/modules/` | 提取+重组 |
| `apps/web/lib/features/auth/` | `apps/api/modules/identity/domain/` | 重组 |
| `apps/web/lib/features/billing/` | `apps/api/modules/billing/` | 重组 |
| `apps/web/lib/features/gateway/` | `apps/api/modules/gateway/` | 重组 |
| `apps/web/lib/features/oauth/` | `apps/api/modules/identity/` | 合并 |
| `apps/web/lib/features/news/` | `apps/api/modules/news/` | 重组 |
| `apps/web/lib/features/ladder/` | `apps/api/modules/ladder/` | 重组 |
| `apps/web/lib/features/ranking/` | `apps/api/modules/ranking/` | 重组 |
| `apps/web/prisma/` | `database/` | 迁移 |
| `packages/shared/` | `packages/contracts/` | 改造 |
| `packages/config/` | `packages/config/base/` | 拆分 |
| `deploy/ + docker/` | `infra/` | 合并 |
| `data/` | `.local/data/` | 迁移 |
| `参考文档/` | `.example/` | 重命名 |
| `scripts/` | `scripts/` + `infra/scripts/` | 拆分 |
