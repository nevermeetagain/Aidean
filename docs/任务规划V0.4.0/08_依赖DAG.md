# 08 · 依赖 DAG（可并行组 / 串行链 / 关键路径 / 环检测）

> 版本: v0.4 | 更新: 2026-10-14 | 变更: 任务规划V0.4.0（基于 main@bfb3aef 复核，业务树 = 77c7952；未实现需求核查 + 模型源监控体系纳入统一规划）

> 生成方式：由任务数据单一源脚本机械计算（功能依赖边 + 「同文件资源锁」串行边），不含主观判断。

## 8.1 并行判定规则（机械）

可并行 ⟺ 无共享可变状态 ∧ 依赖的契约已冻结且机器可校验 ∧ 文件所有权不相交 ∧ 不共用同一迁移版本号；另加执行纪律：同批 ≤3 个写入 Agent、Contract 批与 Guard 批不与实现混批、同批至多 1 个 e2e 任务（共享测试库/全局开关）。

## 8.2 校验结果

- ① 环检测：✅ 无环（Kahn 拓扑排序 73/73 节点全部出队）
- ② 功能依赖边 101 条；资源锁串行边 62 条（两任务允许路径重叠且原本无先后关系时，按编号小者先）
- ③ 契约冻结前置校验：✅ 全部满足
- ④ 迁移版本号：全规划两个迁移版本号：M-001（TASK-011）、M-002（TASK-058，依赖 TASK-011，串行），无并发迁移
- ⑥ 依赖合法性（非条件卡不得依赖条件卡，含资源锁边）：✅ 满足
- ⑤ 层级数（最长路径层）：L0–L19；批次总数 34，其中可并行组 10 个

## 8.3 关键路径

- **全量（含条件切片 S5/S8/S9）**：TASK-001 → TASK-002 → TASK-003 → TASK-005 → TASK-009 → TASK-006 → TASK-010 → TASK-011 → TASK-027 → TASK-029 → TASK-030 → TASK-031 → TASK-040 → TASK-041 → TASK-051 → TASK-057 → TASK-036 → TASK-052 → TASK-046（累计 91h）
- **当前可执行范围（剔除全部条件卡：U-5/U-3/U-4/U-15/P-2/U-M1/U-M2/U-M3/U-M5）**：TASK-001 → TASK-002 → TASK-003 → TASK-005 → TASK-009 → TASK-006 → TASK-010 → TASK-011 → TASK-027 → TASK-029 → TASK-030 → TASK-031 → TASK-040 → TASK-041 → TASK-051 → TASK-057（累计 84h）

关键路径解读：S0 契约骨架 → S1 迁移 M-001 → S4 生效价（资金路径）→ S4 UI → 计费 e2e → 文档登记，决定整体工期；S2/S3/S5 可在 S0 完成后与 S1 交错推进。

## 8.4 批次计划（按层级，同层内按规则装批）

- L0 · 单任务：TASK-001（Agent-Contract）
- L1 · 单任务：TASK-002（Agent-API）
- L1 · 单任务：TASK-004（Agent-Guard）
- L1 · 单任务：TASK-014（Agent-Contract）
- L2 · **可并行组**：TASK-003（Agent-API） ∥ TASK-015（Agent-API） ∥ TASK-016（Agent-API）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L2 · 单任务：TASK-021（Agent-Contract）
- L2 · 单任务：TASK-038（Agent-Guard）
- L3 · 单任务：TASK-005（Agent-Guard）
- L3 · **可并行组**：TASK-017（Agent-Data） ∥ TASK-022（Agent-API）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L3 · 单任务：TASK-026（Agent-Contract）
- L4 · **可并行组**：TASK-009（Agent-Docs） ∥ TASK-018（Agent-App） ∥ TASK-023（Agent-App）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L4 · 单任务：TASK-056（Agent-Contract）
- L5 · 单任务：TASK-006（Agent-Guard）
- L5 · 单任务：TASK-060（Agent-API）
- L6 · **可并行组**：TASK-007（Agent-Guard） ∥ TASK-019（Agent-Guard） ∥ TASK-039（Agent-Guard）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L6 · 单任务：TASK-010（Agent-Data）
- L6 · **可并行组**：TASK-024（Agent-Guard） ∥ TASK-049（Agent-Guard）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L7 · 单任务：TASK-011（Agent-Data）
- L7 · 单任务：TASK-050（Agent-Guard）
- L8 · **可并行组**：TASK-012（Agent-Data） ∥ TASK-027（Agent-API） ∥ TASK-028（Agent-API）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L8 · 单任务：TASK-037（Agent-Guard）
- L8 · 单任务：TASK-058（Agent-Data）
- L9 · **可并行组**：TASK-013（Agent-Docs） ∥ TASK-029（Agent-App） ∥ TASK-059（Agent-Data）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L9 · 单任务：TASK-073（Agent-API）
- L10 · **可并行组**：TASK-020（Agent-Docs） ∥ TASK-061（Agent-API） ∥ TASK-066（Agent-API）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L10 · 单任务：TASK-030（Agent-Guard）
- L11 · **可并行组**：TASK-025（Agent-Docs） ∥ TASK-063（Agent-API） ∥ TASK-067（Agent-App）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L11 · 单任务：TASK-062（Agent-Guard）
- L12 · **可并行组**：TASK-031（Agent-Docs） ∥ TASK-064（Agent-App）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L13 · 单任务：TASK-040（Agent-Docs）
- L13 · 单任务：TASK-065（Agent-Guard）
- L14 · 单任务：TASK-041（Agent-Docs）
- L15 · 单任务：TASK-051（Agent-Docs）
- L16 · 单任务：TASK-057（Agent-Docs）

**条件批次（BLOCKING 裁决后才下发，不计入上表）**：TASK-044（S9，U-4，L1）；TASK-045（S9，U-4，L2）；TASK-072（S12，U-M2，L5）；TASK-070（S12，U-M1，L6）；TASK-071（S12，U-M3，L7）；TASK-042（S8，U-3，L9）；TASK-008（S0，P-2，L9）；TASK-043（S8，U-3，L10）；TASK-068（S11，U-M5，L10）；TASK-055（S4，U-15，L10）；TASK-047（S4，U-15，L11）；TASK-069（S11，U-15，L11）；TASK-048（S4，U-15，L12）；TASK-032（S5，U-5，L12）；TASK-053（S4，U-15，L13）；TASK-033（S5，U-5，L13）；TASK-054（S4，U-15，L14）；TASK-034（S5，U-5，L14）；TASK-035（S5，U-5，L15）；TASK-036（S5，U-5，L17）；TASK-052（S8，U-3，L18）；TASK-046（S9，U-4，L19）。裁决后按依赖与同样规则装批；若条件卡被取消，其资源锁串行边随之失效。

## 8.5 功能依赖边

- TASK-001 → TASK-002
- TASK-001 → TASK-004
- TASK-001 → TASK-014
- TASK-001 → TASK-021
- TASK-001 → TASK-026
- TASK-001 → TASK-032
- TASK-001 → TASK-044
- TASK-001 → TASK-056
- TASK-002 → TASK-003
- TASK-002 → TASK-015
- TASK-002 → TASK-016
- TASK-003 → TASK-005
- TASK-003 → TASK-009
- TASK-003 → TASK-043
- TASK-004 → TASK-006
- TASK-004 → TASK-009
- TASK-004 → TASK-038
- TASK-005 → TASK-006
- TASK-005 → TASK-009
- TASK-006 → TASK-010
- TASK-006 → TASK-019
- TASK-006 → TASK-024
- TASK-006 → TASK-030
- TASK-006 → TASK-035
- TASK-006 → TASK-037
- TASK-006 → TASK-039
- TASK-006 → TASK-042
- TASK-006 → TASK-049
- TASK-006 → TASK-065
- TASK-007 → TASK-043
- TASK-007 → TASK-050
- TASK-009 → TASK-006
- TASK-009 → TASK-040
- TASK-010 → TASK-011
- TASK-011 → TASK-012
- TASK-011 → TASK-027
- TASK-011 → TASK-028
- TASK-011 → TASK-058
- TASK-012 → TASK-013
- TASK-014 → TASK-015
- TASK-014 → TASK-016
- TASK-015 → TASK-018
- TASK-015 → TASK-022
- TASK-016 → TASK-017
- TASK-016 → TASK-018
- TASK-017 → TASK-018
- TASK-018 → TASK-019
- TASK-018 → TASK-034
- TASK-019 → TASK-020
- TASK-021 → TASK-022
- TASK-022 → TASK-023
- TASK-023 → TASK-024
- TASK-023 → TASK-029
- TASK-024 → TASK-025
- TASK-026 → TASK-027
- TASK-026 → TASK-028
- TASK-026 → TASK-047
- TASK-026 → TASK-055
- TASK-027 → TASK-029
- TASK-027 → TASK-048
- TASK-028 → TASK-029
- TASK-029 → TASK-030
- TASK-029 → TASK-053
- TASK-030 → TASK-031
- TASK-031 → TASK-054
- TASK-032 → TASK-033
- TASK-033 → TASK-034
- TASK-034 → TASK-035
- TASK-035 → TASK-036
- TASK-037 → TASK-065
- TASK-040 → TASK-041
- TASK-041 → TASK-051
- TASK-042 → TASK-043
- TASK-042 → TASK-052
- TASK-044 → TASK-045
- TASK-045 → TASK-046
- TASK-047 → TASK-048
- TASK-048 → TASK-053
- TASK-053 → TASK-054
- TASK-055 → TASK-047
- TASK-055 → TASK-069
- TASK-056 → TASK-057
- TASK-056 → TASK-058
- TASK-056 → TASK-060
- TASK-056 → TASK-066
- TASK-056 → TASK-072
- TASK-058 → TASK-059
- TASK-058 → TASK-063
- TASK-058 → TASK-073
- TASK-059 → TASK-061
- TASK-059 → TASK-066
- TASK-059 → TASK-068
- TASK-060 → TASK-061
- TASK-060 → TASK-070
- TASK-061 → TASK-062
- TASK-061 → TASK-063
- TASK-062 → TASK-065
- TASK-063 → TASK-064
- TASK-064 → TASK-065
- TASK-066 → TASK-067
- TASK-070 → TASK-071

## 8.6 资源锁串行边（同文件 → 必须串行）

- TASK-004 → TASK-007
- TASK-006 → TASK-007
- TASK-007 → TASK-037
- TASK-007 → TASK-042
- TASK-008 → TASK-055
- TASK-009 → TASK-046
- TASK-009 → TASK-057
- TASK-012 → TASK-059
- TASK-013 → TASK-020
- TASK-013 → TASK-025
- TASK-013 → TASK-031
- TASK-013 → TASK-036
- TASK-013 → TASK-041
- TASK-013 → TASK-046
- TASK-014 → TASK-021
- TASK-014 → TASK-026
- TASK-014 → TASK-032
- TASK-014 → TASK-056
- TASK-017 → TASK-058
- TASK-020 → TASK-025
- TASK-020 → TASK-031
- TASK-020 → TASK-036
- TASK-020 → TASK-040
- TASK-020 → TASK-046
- TASK-020 → TASK-052
- TASK-020 → TASK-057
- TASK-021 → TASK-026
- TASK-021 → TASK-032
- TASK-021 → TASK-056
- TASK-023 → TASK-067
- TASK-025 → TASK-031
- TASK-025 → TASK-036
- TASK-025 → TASK-040
- TASK-025 → TASK-046
- TASK-025 → TASK-052
- TASK-025 → TASK-057
- TASK-026 → TASK-032
- TASK-026 → TASK-056
- TASK-029 → TASK-067
- TASK-031 → TASK-036
- TASK-031 → TASK-040
- TASK-031 → TASK-046
- TASK-031 → TASK-052
- TASK-031 → TASK-057
- TASK-036 → TASK-046
- TASK-036 → TASK-052
- TASK-037 → TASK-042
- TASK-040 → TASK-036
- TASK-040 → TASK-057
- TASK-041 → TASK-036
- TASK-041 → TASK-057
- TASK-047 → TASK-032
- TASK-050 → TASK-037
- TASK-050 → TASK-042
- TASK-051 → TASK-036
- TASK-051 → TASK-057
- TASK-052 → TASK-046
- TASK-054 → TASK-036
- TASK-054 → TASK-046
- TASK-057 → TASK-036
- TASK-058 → TASK-008
- TASK-067 → TASK-053

## 8.7 必须串行的链（摘要）

- 契约链：TASK-001 → 014 → 021 → 026 → 047（同改 packages/shared/src/index.ts，资源锁串行）；TASK-032（S5）/044（S9）为条件卡，亦不得与任何契约卡同时执行
- 文档链：TASK-009 → 020 → 025 → 031 → 036 → 040 → 041 → 046（同改 API接口文档/文档索引）；TASK-013 → 025、TASK-013 → 041（同改 数据库文档/台账）
- CI 链：TASK-004 → 006 → 007 → 050 → 037（同改 .github/workflows/ci.yml；042 为条件卡排其后）
- 迁移链：TASK-010 → 011（M-001）→ 012 → {027, 028}
- 头部链：TASK-018 → 034（同改 SiteHeader/MobileNav）；详情页链：TASK-023 → 029 → 053（同改 models/[slug]）；生效价链：TASK-027 → 048（同改 lib/features/pricing）

## 8.8 并行纪律（执行者必读）

- ✅ 允许并行：不同所有权、同一冻结契约、不改同一迁移版本号。
- ❌ 禁止并行：同时改 packages/shared（契约）；同时改同一张表；一边改错误码一边让前端猜字段；数据端「独立完成整个数据库」（本规划仅 M-001 一个迁移）。
