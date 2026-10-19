# ADR-P002：功能开关读取失败 fail-open + 后台复用 admin.configs 权限

> 版本: v0.2 | 更新: 2026-10-14 | 变更: V0.2.0 复核沿用（V0.1.0 原文保留，增补见文末「V0.2.0 复核」）

> V0.9.0 承接说明（2026-10-19）：本文件正文为 **V0.8.0 原文**（基线 c2da219），其中「待裁决 B-0'/APPROVE/U-22」「未开工」等表述均指当时；**当前事实以 `25_执行记录.md`、`17g_V0.8.0到V0.9.0差异.md`、`05_execution/task-index.md` 为准**（B-0' 已裁决 A'；089/026/082/027/056/058/060/057 已完成）。契约唯一源仍为 `docs/任务规划V0.5.0/contracts/`。

>
> V0.8.0 状态：「feature_flags 运行时 0 消费、后台无 feature-flags 端点」为 V0.2.0 复核时的历史；c2da219 已有 lib/features/flags/*、/api/v1/system/features、/api/v1/admin/feature-flags 与三路由 requireFeature 门控（F8-08）。

## 背景
- 需求 §3.9：关闭则入口隐藏、页面 403、API 拒绝。`feature_flags` 表与 7 条种子已存在（seed.ts:240-248），运行时零消费。
- 开关会挂在统一计费网关、测评、天梯等核心入口上，开关本身的可用性会放大为业务可用性。

## 决策
1. **失败策略 fail-open**：读取开关失败（DB 异常/超时）时视为开启，并 `console.error` 记录；理由：开关表与业务表同库，库不可用时受控业务本身也不可用，fail-closed 只会把「开关读失败」放大为全站 403。
2. **缓存**：`unstable_cache` + tag `feature-flags`，后台 PATCH 后 `revalidateTag` 即时失效（与既有 admin-auth/admin-nav 模式一致）。
3. **判定位置**：API 在 `withApi` handler 首行 `requireFeature(code)`（早于业务逻辑）；页面在 RSC 首行判定，呈现 403 功能关闭态；导航按 `FEATURE_GATES.pages` 过滤。
4. **权限**：后台开关端点复用 `admin.configs.read/write`，不新增权限域（避免 seed-rbac 重跑；CHANGELOG S7 先例）。
5. **范围**：只实现 `is_enabled` + `enable_from/until` 时间窗；`rollout_percentage/strategy/enabled_roles` 无需求来源，不实现。

## 可改判条件
- 用户要求 fail-closed（安全优先）→ 仅改 service 一处分支与对应单测。
- 用户要求独立权限域 → 新增 `flags` 域（permissions.ts + seed-rbac + 菜单 perms），升 opus 复核。

## V0.2.0 复核

- 状态：**已确认仍成立**。`feature_flags` 运行时 0 消费；后台无 feature-flags 端点（app/api/v1/admin 36 个域目录）。fail-open 假设 U-7 仍为 NON_BLOCKING。
