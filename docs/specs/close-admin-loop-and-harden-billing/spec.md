# Admin 收口与计费测试补强 Spec

## Why
五维审计（2026-09-07）发现四处发布前本地欠账：① admin 的 `ladder/config` 端点写侧唯一、读侧为零（lib/app 层 rg 零命中），配置空转误导运营；② admin 鉴权门禁零测试；③ billing 资金路径仅 1 个 spec 文件，hold→capture→refund 资金级语义无回归网；④ `/oauth/dev/callback` 404，SSO 三方联调缺模拟回调页。

## What Changes
- **ladder/config 闭环核验（修正：实施时发现读侧早已接通）**：`lib/features/ladder/config.ts getLadderGranularity()` 已存在且被 models/ladder 页 SSR 消费（page.tsx:11/47/51），默认/回退 **0.1**、合法域 [0.01,10]（clamp）；本任务仅核验+回归，零编辑
- **admin 权限矩阵测试**：`requireAdminApi()` 与 `/admin` 页面门禁的 403/200 覆盖
- **dev callback 页**：`/oauth/dev/callback` 简单回显 code/state 的 dev 工具页（no-store）
- **billing 资金路径测试**：hold→capture→release/refund→对账主链 ≥3 spec 文件
- **Task 7（测试驱动新增）：修复测试揪出的 3 个资金级缺陷**：voidHold 对已过期 hold 二次解冻（held 负值）、hold() 懒清理后 stale heldMinor 误拒、sumActiveHolds 将 CAPTURED 计入活跃 holds（对账恒失衡）；capture 加余额防御守卫
- **文档同步**：《项目状态审计.md》v1.1（含侦查误判修正与缺陷处置）；核对 API接口文档 admin 端点锚点

## Impact
- Affected specs: audit-full-dimension-gaps（发现项处置）、implement-billing-module（测试补强）
- Affected code: `apps/web/app/(web)/models/page.tsx`、`apps/web/lib/features/ladder/`（config 读取 + store 初始值）、`apps/web/app/oauth/dev/callback/page.tsx`（新建）、`apps/web/lib/features/billing/__tests__/`、`apps/web/lib/features/auth/__tests__/`、`docs/项目状态审计.md`、`docs/文档索引.md`

## ADDED Requirements

### Requirement: Ladder Config 读写闭环
models SSR SHALL 读取 admin 维护的分度值配置作为 `axisGranularity` 初始默认值；配置非法/缺失时 SHALL 回退 5.0。客户端切换行为不变（纯客户端、零请求）。

#### Scenario: 运营改配置后 SSR 生效
- **WHEN** admin 通过面板 PUT config=g2 后用户首访 /models
- **THEN** SSR 初始 granularity 为 2，轴按 2.0 定距；用户本地切换仍零请求

### Requirement: Admin 门禁测试
`requireAdminApi` SHALL 有 403（普通用户/未登录）与 200（ADMIN/SUPER_ADMIN）矩阵测试。

### Requirement: Dev Callback 页
`/oauth/dev/callback` SHALL 渲染 query 中 code/state/error 供 SSO 联调，响应 no-store。

### Requirement: Billing 资金路径回归
hold→capture→release/refund 及对账汇总 SHALL 有显式测试锁定业务语义（capture≤hold、幂等重复请求、余额不足拒付）。

## Out of Scope
M-C 生产部署（外部凭据依赖）、M-D 二期立项、admin 审计日志（后续 PR）。
