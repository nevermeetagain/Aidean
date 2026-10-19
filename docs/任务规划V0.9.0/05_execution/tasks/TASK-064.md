# TASK-064：后台 UI：「模型源监控」页（源分级卡片 + 健康/最后运行 + 变更流 + 手动运行，五态齐全）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus**

> V0.9.0 状态：**未开工（Hark 核心）**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；V0.9.0：058 的 nav 节点顺延（E9-10），因 admin-nav-default-tree.ts 属 Agent-Data，拆为 TASK-094 紧随本卡合入

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-21 vitest include 仅 lib/**（vitest.config.ts:13），UI 验收以 e2e 为准

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-009/011/013
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-009、REQ-M-011、REQ-M-013
- 来源方案：DESIGN-004 / ADR-P007

## 目标
/admin/monitoring 展示源表（tier 徽章 S1/S2/A/B/C、kind、authRequired、enabled 开关、lastRunAt/lastStatus/lastCount）与变更流（4 类事件筛选、分页、证据链接），空/加载/错误/无权限/成功五态按 MONITORING_UX_STATES testid 实现

## 输入
- 文档：`docs/任务规划V0.9.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`contracts/06-ux-states.contract.ts`；`contracts/07-monitoring.contract.ts`；`docs/product/design/UI设计文档.md`
- 契约：`MONITORING_UX_STATES`；`AdminMonitoringSourceListResponse`；`AdminMonitoringChangeListResponse`
- 前置任务：TASK-063
- 前置状态：TASK-063 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/(admin)/admin/monitoring/page.tsx`
  - `apps/web/components/admin/monitoring/SourceTable.tsx`
  - `apps/web/components/admin/monitoring/ChangeFeed.tsx`
  - `apps/web/components/admin/monitoring/TierBadge.tsx`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-064/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 沿用后台既有表格/卡片组件与 Tailwind 4 token（不引新 UI 库）
2. [ ] 变更流事件卡：模型 ID、源、前后价格（USD/1M 原币，不做汇率换算，避免 U-15 依赖）、证据外链
3. [ ] 手动运行按钮：202 后轮询 lastRunAt（5s×12 上限）
4. [ ] 五态 testid：monitoring-empty/loading/error/forbidden/ready
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec tsc --noEmit` exit 0
- [ ] `pnpm --filter web lint` 0 error
- [ ] `next build` 路由表含 /admin/monitoring
- [ ] 人工：1280/768 宽度截图存证，五态各一张（mock API）
- [ ] UI 行为以 e2e 用例断言（`pnpm test:e2e -g` 对应用例全绿），不得以组件单测替代——vitest 不收集 components/**
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web lint && cd apps/web && npx next build
```

## 证据路径
`docs/任务规划V0.9.0/06_validation/evidence/EVD-064/`

## 允许修改
- `apps/web/app/(admin)/admin/monitoring/`
- `apps/web/components/admin/monitoring/`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-064/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-063
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-065, TASK-094
- 阻塞条件：契约字段不足以渲染 → 停止回报（不得在前端猜字段）

## 建议执行档位
opus　理由：UI 设计与实现（用户指令：UI 由主 Agent 完成）；需新设计信息架构

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 10h　≥2h
