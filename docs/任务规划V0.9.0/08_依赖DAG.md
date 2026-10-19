# 08 · 依赖 DAG（可并行组 / 串行链 / 关键路径 / 环检测）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 生成方式：由任务数据单一源脚本机械计算（功能依赖边 + 「同文件资源锁」串行边），不含主观判断。

## 8.1 并行判定规则（机械）

可并行 ⟺ 无共享可变状态 ∧ 依赖的契约已冻结且机器可校验 ∧ 文件所有权不相交 ∧ 不共用同一迁移版本号；另加执行纪律：同批 ≤3 个写入 Agent、Contract 批与 Guard 批不与实现混批、同批至多 1 个 e2e 任务（共享测试库/全局开关）。

## 8.2 校验结果

- ① 环检测：✅ 无环（Kahn 拓扑排序 64/64 节点全部出队）
- ② 功能依赖边 59 条；资源锁串行边 54 条（两任务允许路径重叠且原本无先后关系时，按编号小者先）
- ③ 契约冻结前置校验：✅ 全部满足
- ④ 迁移版本号：全规划两个迁移版本号：M-001（TASK-011）、M-002（TASK-058，依赖 TASK-011，串行），无并发迁移
- ⑥ 依赖合法性（非条件卡不得依赖条件卡，含资源锁边）：✅ 满足
- ⑤ 层级数（最长路径层）：L0–L13；批次总数 23，其中可并行组 10 个

## 8.3 关键路径

- **全量（含条件切片 S5/S8/S9）**：TASK-091 → TASK-086 → TASK-088 → TASK-009 → TASK-006 → TASK-007 → TASK-050 → TASK-037 → TASK-042 → TASK-043（累计 54h）
- **当前可执行范围（剔除全部条件卡：U-5/U-3/U-4/U-15/P-2/U-M1/U-M2/U-M3/U-M5）**：TASK-091 → TASK-086 → TASK-088 → TASK-009 → TASK-006 → TASK-030 → TASK-031 → TASK-040 → TASK-041 → TASK-051（累计 40h）

关键路径解读：S0 契约骨架 → S1 迁移 M-001 → S4 生效价（资金路径）→ S4 UI → 计费 e2e → 文档登记，决定整体工期；S2/S3/S5 可在 S0 完成后与 S1 交错推进。

## 8.4 批次计划（按层级，同层内按规则装批）

- L0 · **可并行组**：TASK-028（Agent-API） ∥ TASK-059（Agent-Data） ∥ TASK-073（Agent-API）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L0 · **可并行组**：TASK-038（Agent-Guard） ∥ TASK-085（Agent-Guard） ∥ TASK-091（Agent-Guard）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L0 · 单任务：TASK-093（Agent-API）
- L1 · **可并行组**：TASK-029（Agent-App） ∥ TASK-061（Agent-API） ∥ TASK-066（Agent-API）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L1 · **可并行组**：TASK-049（Agent-Guard） ∥ TASK-086（Agent-Guard）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L1 · **可并行组**：TASK-081（Agent-API） ∥ TASK-087（Agent-Docs） ∥ TASK-090（Agent-Docs）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L2 · **可并行组**：TASK-062（Agent-Guard） ∥ TASK-092（Agent-Guard）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L2 · **可并行组**：TASK-063（Agent-API） ∥ TASK-067（Agent-App） ∥ TASK-088（Agent-Docs）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L3 · **可并行组**：TASK-009（Agent-Docs） ∥ TASK-064（Agent-App） ∥ TASK-074（Agent-App）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L4 · 单任务：TASK-006（Agent-Guard）
- L4 · **可并行组**：TASK-013（Agent-Docs） ∥ TASK-094（Agent-Data）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L5 · **可并行组**：TASK-007（Agent-Guard） ∥ TASK-030（Agent-Guard） ∥ TASK-039（Agent-Guard）
  - 机械依据：✅无共享可变状态（非同一 e2e 全局库批次、非同表写）；✅依赖契约已冻结（同切片契约卡为祖先，见校验③）；✅文件所有权不相交（允许路径两两无前缀重叠，脚本校验）；✅不共用迁移版本号（迁移版本号：TASK-011 持 M-001、TASK-058 持 M-002，二者不同批）
- L5 · 单任务：TASK-020（Agent-Docs）
- L5 · 单任务：TASK-075（Agent-Guard）
- L5 · 单任务：TASK-084（Agent-Guard）
- L6 · 单任务：TASK-025（Agent-Docs）
- L6 · 单任务：TASK-050（Agent-Guard）
- L7 · 单任务：TASK-031（Agent-Docs）
- L7 · 单任务：TASK-037（Agent-Guard）
- L8 · 单任务：TASK-040（Agent-Docs）
- L8 · 单任务：TASK-065（Agent-Guard）
- L9 · 单任务：TASK-041（Agent-Docs）
- L10 · 单任务：TASK-051（Agent-Docs）

**条件批次（BLOCKING 裁决后才下发，不计入上表）**：TASK-047（S4，U-15，L0）；TASK-044（S9，U-4，L0）；TASK-070（S12，U-M1，L0）；TASK-072（S12，U-M2，L0）；TASK-008（S0，P-2，L1）；TASK-032（S5，U-5，L1）；TASK-048（S4，U-15，L1）；TASK-045（S9，U-4，L1）；TASK-068（S11，U-M5，L1）；TASK-071（S12，U-M3，L1）；TASK-055（S4，U-15，L2）；TASK-033（S5，U-5，L2）；TASK-080（S4，U-15，L2）；TASK-069（S11，U-15，L3）；TASK-034（S5，U-5，L3）；TASK-053（S4，U-15，L4）；TASK-035（S5，U-5，L5）；TASK-054（S4，U-15，L8）；TASK-042（S8，U-3，L8）；TASK-043（S8，U-3，L9）；TASK-083（S8，U-3，L9）；TASK-036（S5，U-5，L11）；TASK-052（S8，U-3，L12）；TASK-046（S9，U-4，L13）。裁决后按依赖与同样规则装批；若条件卡被取消，其资源锁串行边随之失效。

## 8.5 功能依赖边

- TASK-006 → TASK-030
- TASK-006 → TASK-035
- TASK-006 → TASK-037
- TASK-006 → TASK-039
- TASK-006 → TASK-042
- TASK-006 → TASK-065
- TASK-006 → TASK-075
- TASK-006 → TASK-084
- TASK-007 → TASK-043
- TASK-007 → TASK-050
- TASK-009 → TASK-006
- TASK-009 → TASK-040
- TASK-028 → TASK-029
- TASK-028 → TASK-081
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
- TASK-042 → TASK-083
- TASK-044 → TASK-045
- TASK-045 → TASK-046
- TASK-047 → TASK-048
- TASK-047 → TASK-055
- TASK-048 → TASK-053
- TASK-048 → TASK-080
- TASK-053 → TASK-054
- TASK-055 → TASK-069
- TASK-059 → TASK-061
- TASK-059 → TASK-066
- TASK-059 → TASK-068
- TASK-061 → TASK-062
- TASK-061 → TASK-063
- TASK-062 → TASK-065
- TASK-063 → TASK-064
- TASK-064 → TASK-065
- TASK-064 → TASK-094
- TASK-066 → TASK-067
- TASK-067 → TASK-074
- TASK-070 → TASK-071
- TASK-074 → TASK-075
- TASK-085 → TASK-007
- TASK-085 → TASK-008
- TASK-085 → TASK-049
- TASK-085 → TASK-087
- TASK-085 → TASK-090
- TASK-086 → TASK-088
- TASK-086 → TASK-092
- TASK-090 → TASK-088
- TASK-091 → TASK-086
- TASK-093 → TASK-029

## 8.6 资源锁串行边（同文件 → 必须串行）

- TASK-006 → TASK-007
- TASK-007 → TASK-037
- TASK-007 → TASK-042
- TASK-008 → TASK-055
- TASK-009 → TASK-013
- TASK-009 → TASK-020
- TASK-009 → TASK-025
- TASK-009 → TASK-046
- TASK-013 → TASK-020
- TASK-013 → TASK-025
- TASK-013 → TASK-031
- TASK-013 → TASK-036
- TASK-013 → TASK-041
- TASK-013 → TASK-046
- TASK-020 → TASK-025
- TASK-020 → TASK-031
- TASK-020 → TASK-036
- TASK-020 → TASK-040
- TASK-020 → TASK-046
- TASK-020 → TASK-052
- TASK-025 → TASK-031
- TASK-025 → TASK-036
- TASK-025 → TASK-040
- TASK-025 → TASK-046
- TASK-025 → TASK-052
- TASK-029 → TASK-067
- TASK-031 → TASK-036
- TASK-031 → TASK-040
- TASK-031 → TASK-046
- TASK-031 → TASK-052
- TASK-036 → TASK-046
- TASK-036 → TASK-052
- TASK-037 → TASK-042
- TASK-040 → TASK-036
- TASK-041 → TASK-036
- TASK-047 → TASK-032
- TASK-050 → TASK-037
- TASK-050 → TASK-042
- TASK-051 → TASK-036
- TASK-052 → TASK-046
- TASK-054 → TASK-036
- TASK-054 → TASK-046
- TASK-067 → TASK-053
- TASK-074 → TASK-053
- TASK-085 → TASK-006
- TASK-088 → TASK-009
- TASK-088 → TASK-020
- TASK-088 → TASK-025
- TASK-088 → TASK-046
- TASK-090 → TASK-009
- TASK-090 → TASK-013
- TASK-090 → TASK-020
- TASK-090 → TASK-025
- TASK-090 → TASK-046

## 8.7 必须串行的链（摘要）

- 契约链：TASK-001 → 014 → 021 → 026 → 047（同改 packages/shared/src/index.ts，资源锁串行）；TASK-032（S5）/044（S9）为条件卡，亦不得与任何契约卡同时执行
- 文档链：TASK-009 → 020 → 025 → 031 → 036 → 040 → 041 → 046（同改 API接口文档/文档索引）；TASK-013 → 025、TASK-013 → 041（同改 数据库文档/台账）
- CI 链：TASK-004 → 006 → 007 → 050 → 037（同改 .github/workflows/ci.yml；042 为条件卡排其后）
- 迁移链：TASK-010 → 011（M-001）→ 012 → {027, 028}
- 头部链：TASK-018 → 034（同改 SiteHeader/MobileNav）；详情页链：TASK-023 → 029 → 053（同改 models/[slug]）；生效价链：TASK-027 → 048（同改 lib/features/pricing）

## 8.8 并行纪律（执行者必读）

- ✅ 允许并行：不同所有权、同一冻结契约、不改同一迁移版本号。
- ❌ 禁止并行：同时改 packages/shared（契约）；同时改同一张表；一边改错误码一边让前端猜字段；数据端「独立完成整个数据库」（本规划仅 M-001 一个迁移）。
