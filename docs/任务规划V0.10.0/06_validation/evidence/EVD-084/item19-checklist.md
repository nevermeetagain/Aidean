# EVD-084 · 台账 #19「admin 扩容立项 + 配置治理专项」逐项核对（2026-10-20，基线 origin/main@1d9b5d4）

来源：`docs/plans/未完成事项目录.md:46`（#19 🟡「扩容已完成、治理待收口」，L3 核验 2026-09-23）及其引用的 #35、#43。核对方式：只读 grep/ls 代码，命令与输出附后。

| # | 子项（台账原文） | 代码实测 | 结论 |
|---|---|---|---|
| 1 | admin 扩容：18 页 + 20 路由域 | `find app/(admin) -name page.tsx` = **34**；`ls app/api/v1/admin` = **38** 域；与 check-docs-rule 文档锚「admin API 域=38, admin 页面=34」一致 | ✅ 已完成（台账数字过时，现 34 页 / 38 域） |
| 2 | 治理缺口：admin 组件 0 引用 @aidean/ui（#35） | `components/admin` 下 54 个 tsx，**48** 个 import `@aidean/ui`；未引用的 6 个为布局/会话壳（AdminLogoutButton、AdminMobileNav、AdminSidebar、SessionKeepAlive）与监控子件（monitoring/SourceTable、monitoring/TierBadge） | ✅ 「0 引用」已不成立（主体收口） |
| 2a | #35 子项：admin 域内联 `<table>` | 余 **2** 处：`CapabilityMatrix.tsx:58`、`ProtocolMatrix.tsx:61`（矩阵型表格，二者已用 @aidean/ui Badge）；SyncManager 已迁 Table（:265 注释） | 🟡 缺口：2 处矩阵内联 table 未迁 @aidean/ui Table |
| 2b | 监控子件未用底座 | `monitoring/SourceTable.tsx`、`monitoring/TierBadge.tsx` 未 import @aidean/ui（TASK-064 新增，归助手 A 线） | 🟡 缺口（登记，不在本线修） |
| 3 | admin/tools 路由散点（#43 子项） | `app/(admin)/admin/tools` **不存在**；`e2e/admin/tools.spec.ts:60-67` 仍注册 `/admin/tools/{skills,mcp,agents}` 3 路由并 `describe.skip`（api-stations 已迁 `/admin/api-stations`，:20）；admin-nav 无 `/admin/tools` 入口 | 🟡 缺口：3 个 P2 候选路由仍为 skip 占位，解禁即红 |
| 4 | 配置治理：后台配置白名单单源 | `app/api/v1/admin/configs/route.ts` 读 shared `ADMIN_CONFIG_KEYS`（`packages/shared/src/schemas/admin.schema.ts:139`）+ `ADMIN_CONFIG_REGISTRY`；`lib/features/auth/__tests__/admin-config-seed-parity.spec.ts` 守 seed↔白名单一致 | ✅ 已收口（单源 + 守卫测试） |

## 总结
#19 「扩容」✅；「配置治理」主干 ✅（白名单单源 + parity 守卫、@aidean/ui 48/54 引用）。剩余缺口 3 条：①CapabilityMatrix/ProtocolMatrix 2 处内联 table；②monitoring/SourceTable、TierBadge 未用底座；③`/admin/tools/{skills,mcp,agents}` skip 占位。建议台账 #19 状态改为「✅ 扩容完成；治理余 3 缺口转 #35/#43」——台账归助手 C（`docs/plans/**`），本卡不改，**需要助手 C 线按本清单回写台账**。

## 取证命令
```
cd apps/web
find "app/(admin)" -name page.tsx | wc -l          # 34
ls app/api/v1/admin | wc -l                          # 38
find components/admin -name "*.tsx" | wc -l          # 54
grep -rl '@aidean/ui' components/admin | wc -l       # 48
grep -rn "<table" components/admin                   # CapabilityMatrix:58 / ProtocolMatrix:61 / SyncManager:265(注释)
ls "app/(admin)/admin/tools"                         # No such file or directory
grep -n "describe.skip\|tools/" ../../e2e/admin/tools.spec.ts
```
