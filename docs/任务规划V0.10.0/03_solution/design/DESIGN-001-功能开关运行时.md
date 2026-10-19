# DESIGN-001：功能开关运行时

> 版本: v0.2 | 更新: 2026-10-14 | 变更: V0.2.0 复核沿用（V0.1.0 原文保留，增补见文末「V0.2.0 复核」）

> V0.10.0 承接说明（2026-10-19）：本文件正文承接 V0.9.0（及更早）原文，其中「未开工/待回补」等表述均指当时；**当前事实以 `25_执行记录.md`、`17h_V0.9.0到V0.10.0差异.md`、`05_execution/task-index.md` 为准**（外部 12 卡已完成并审查；007 由 085 满足；新增 095–099）。

> V0.9.0 承接说明（2026-10-19）：本文件正文为 **V0.8.0 原文**（基线 c2da219），其中「待裁决 B-0'/APPROVE/U-22」「未开工」等表述均指当时；**当前事实以 `25_执行记录.md`、`17g_V0.8.0到V0.9.0差异.md`、`05_execution/task-index.md` 为准**（B-0' 已裁决 A'；089/026/082/027/056/058/060/057 已完成）。契约唯一源仍为 `docs/任务规划V0.5.0/contracts/`。


## 1. 组件与数据流

```
feature_flags（7 行） ──读──> lib/features/flags/repository.ts
                                   │
                         service.ts getFeatureFlags()  ← unstable_cache(tag: feature-flags, revalidate: 60s)
                         │                    │                         │
           requireFeature(code)        GET /api/v1/system/features   RSC: 页面判定 + 导航过滤
           (API 首行，关→ApiError 50011/403)  (PublicFeaturesSchema)      (FeatureDisabled 组件 / navigation.ts)
                                   ▲
   PATCH /api/v1/admin/feature-flags/[id] ── 写库 → writeAudit → revalidateTag('feature-flags')
```

## 2. 判定规则
`enabled(code) = row.isEnabled ∧ (enableFrom 为空 ∨ now ≥ enableFrom) ∧ (enableUntil 为空 ∨ now < enableUntil)`；行不存在 → 视为开启（兼容未来新码先上代码后上种子）；读库异常 → 开启并记录（ADR-P002）。

## 3. 受控面（契约① FEATURE_GATES）
| 码 | API | 页面/入口 |
|---|---|---|
| ladder.model | GET /api/v1/ladder?type=models | /models、/ladder、产品下拉「模型天梯图」 |
| ladder.station | GET /api/v1/ladder?type=stations | /providers、导航「模型服务提供商」 |
| gateway.chat | POST /api/v1/gateway/chat | 无页面受控（本规划仅 API 拒绝；控制台调用台的隐藏不在 TASK-018 范围，如需另立卡） |
| evaluation.enabled | POST /api/v1/evaluations | /evaluations/new（CompareDock 不在本规划范围） |
| favorites.enabled | /api/v1/user/favorites* | 收藏按钮、控制台收藏 Tab |
| comparison.enabled / chat.support | 无消费面（不接入，登记即可） | — |

## 4. 测试
- 单测（TASK-015）：开/关/时间窗/行缺失/DB 异常 5 态；route 级 50011 断言。
- e2e（TASK-019）：关→入口消失+403 态+API 50011→开→恢复；workers=1；finally 还原。

## 5. 性能
开关读取走缓存，单请求额外开销为一次内存命中；无基线，不做进一步优化（§9.1）。

## V0.2.0 复核

- 沿用。受控面清单不变；前台入口隐藏改 SiteHeader 与 S5 搜索的资源锁关系不变（TASK-018 → 034）。
