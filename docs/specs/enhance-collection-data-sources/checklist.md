# Checklist · 采集基础数据支撑来源

> 核验规则：按分组核验，每组全部通过才可宣告完成；任何失败项 → tasks.md 追加 `Fix:` 任务 → 修复后重验勾选。
> 取证标注：**[命令]** 确切命令执行取证；**[断言]** 结构/文档核验；**[测试]** 自动化测试；**[人工]** 描述式核验。

---

## 分组一 · 门禁三件套（L5-a）

- [x] G-a1 类型检查零错误（全 Task）[命令]
  - 取证：`pnpm --filter web exec tsc --noEmit` → `TSC_EXIT=0`（2026-10-10 依赖 force 重装后重跑）
- [x] G-a2 全量单测绿（L1-L4 累计）[测试]
  - 取证：`vitest run` → **Test Files 97 passed (97) / Tests 959 passed (959)**；`node ./node_modules/vitest/vitest.mjs run` 原生 `VITEST_RAW_EXIT=0`（外层管道 ExitCode=1 系 Vite CJS 弃用警告写 stderr 的 PowerShell 假象，非用例失败）
- [x] G-a3 生产构建绿（L2 路由 + L4 改动）[命令]
  - 取证：`pnpm --filter web build` → `✓ Compiled successfully`，静态页 34/34，路由表含 `/api/v1/admin/scripts/[id]`、`/api/v1/admin/scripts/[id]/trigger`，postbuild standalone 拷贝完成，`LASTEXITCODE=0`

## 分组二 · 文档收口与结构一致（L5-b/c/d）

- [x] G-b1 API 端点登记与铁律 2 互引（§5.8.5）[断言]
  - 取证：《API接口文档》v1.45 §5.8.5 登记 admin/scripts CUD/trigger/executions/run-due + 错误码，末尾锚 `[采集/评测域 admin 边界](API架构设计方案.md#sync-eval-admin-architecture)`
- [x] G-b2 文档事实计数一致（文档即结构，铁律 6）[命令]
  - 取证：`node scripts/check-docs-facts.mjs` → **All 14 assertions passed**（route-count 128、spec-count 126 已同步本次新增）；`FACTS_EXIT=0`
- [x] G-b3 文档规则与版本锚（铁律 1/3）[命令]
  - 取证：`node scripts/check-docs-rule.mjs` → `[铁律1] PASS` + `[铁律-数字] PASS`；受影响文档均加/更新 `> 版本: vX.Y | 更新: 2026-10-10 | 变更: <简述>`（API v1.45 / 功能设计 v0.8.4 / 需求分析 v7.1）
- [x] G-b4 任务进度同步（每改动同步文档与进度）[断言]
  - 取证：《未完成事项目录》#30 由 🟡 升 ✅ 已闭环；《项目需求更新分析》R-71 登记不修→已交付；CHANGELOG 新增 L1-L5 条目

## 分组三 · 关键行为端到端（L2/L3/L4）

- [x] G-c1 llmtest 采集端到端可用（Task 3.3）[命令]
  - 取证：`tsx scripts/crawl/crawl_llmtest.ts --dry-run` 实测发现 50 候选（与 L0 探测吻合）
- [x] G-c2 SSRF 现状零变化（Task 4.1）[测试]
  - 取证：`url-policy-outbound.spec.ts` 断言默认无代理时 `getOutboundDispatcher()` 与 `getSecureDispatcher()` 同一实例

---

## 全局回归门禁

- [x] G-1 `check-docs-facts` + `check-docs-rule` + `tsc` + `vitest` + `build` 全链路退出码 0（本会话实跑）
- [x] G-2 与 `establish-dev-workflow` 回归联动：遵循六步循环，本 spec 为 CLOSE 归档工件；铁律 1/2/3/6 校验通过
