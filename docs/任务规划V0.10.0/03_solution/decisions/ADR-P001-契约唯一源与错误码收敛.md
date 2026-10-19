# ADR-P001：契约唯一源 = packages/shared，错误码收敛进 shared

> 版本: v0.2 | 更新: 2026-10-14 | 变更: V0.2.0 复核沿用（V0.1.0 原文保留，增补见文末「V0.2.0 复核」）

> V0.10.0 承接说明（2026-10-19）：本文件正文承接 V0.9.0（及更早）原文，其中「未开工/待回补」等表述均指当时；**当前事实以 `25_执行记录.md`、`17h_V0.9.0到V0.10.0差异.md`、`05_execution/task-index.md` 为准**（外部 12 卡已完成并审查；007 由 085 满足；新增 095–099）。

> V0.9.0 承接说明（2026-10-19）：本文件正文为 **V0.8.0 原文**（基线 c2da219），其中「待裁决 B-0'/APPROVE/U-22」「未开工」等表述均指当时；**当前事实以 `25_执行记录.md`、`17g_V0.8.0到V0.9.0差异.md`、`05_execution/task-index.md` 为准**（B-0' 已裁决 A'；089/026/082/027/056/058/060/057 已完成）。契约唯一源仍为 `docs/任务规划V0.5.0/contracts/`。


## 背景（证据）
- 运行时错误码表在 `apps/web/app/api/v1/_lib/errors.ts:39-82`（22 码）；`packages/shared/src/types/index.ts:72-89` 另有一张经 `index.ts:37` 公开导出、0 引用、值冲突的旧 `ErrorCode`；API接口文档 §4 只登记 3xxxx/4xxxx 段并写「与 errors.ts 双源对齐」。
- 开发流程.md §五.2：「公开接口变更必须先更新 packages/shared 的 Zod Schema」。

## 决策
1. 契约唯一源为 `packages/shared/src/**`（zod schema + TS 常量）；不引入 OpenAPI/JSON Schema 第二源。
2. 错误码迁入 `packages/shared/src/errors.ts`（TASK-001），web 侧仅重导出（TASK-002），删除 shared 旧表。
3. 契约测试由脚本从 shared 导出物生成（TASK-004），CI 防手改。
4. API接口文档 §4 改为「全段单表、唯一源 shared」（TASK-009）；文档是登记面，不是源。

## 备选与否决理由
- OpenAPI 为源再生成 zod：需新增生成链与依赖，且现有 20 个 schema 文件全部要反向迁移，回归面大 → 否决。
- 保持 web 为码表源：packages/shared 无法引用 apps/web（违反依赖方向），前端组件拿不到码表 → 否决。

## 后果
- 正面：前后端共享同一码表；新增码必须先改 shared 才能用，契约测试自动覆盖。
- 负面：shared 版本变化会触发 web 全量类型检查（可接受，CI 已双包 tsc）。
- 风险：旧表若被外部仓库（子平台）引用会断——本仓 grep 0 引用，子平台不依赖本仓包（不同仓库），风险低。

## V0.2.0 复核

- 状态：**已确认仍成立**。旧表 `packages/shared/src/types/index.ts:72-89` 仍在且全仓 0 引用；web 运行时码表 22 码未变；冻结稿自检 `mism=0`（EVD-BASELINE-V2/contracts-selfcheck.txt）。V0.2.0 未新增错误码（计价不可归一复用 30002）。
