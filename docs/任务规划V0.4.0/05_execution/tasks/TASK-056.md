# TASK-056：监控契约落地：monitoring.schema.ts（源/快照/观测/变更事件/管理端 DTO）+ 2 个新错误码

> 版本: v0.4 | 更新: 2026-10-14 | 变更: 任务规划V0.4.0（基于 main@bfb3aef 复核，业务树 = 77c7952；未实现需求核查 + 模型源监控体系纳入统一规划）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**opus**

> V0.3.0→V0.4.0：新增（V0.4.0 模型源监控）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-001/002/003/004/012
- RTM 追溯（V0.4.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-001、REQ-M-012
- 来源方案：DESIGN-004 / ADR-P007

## 目标
packages/shared 导出 MonitoringSource*/CatalogSnapshot*/ProviderModelObservation*/CatalogChangeEvent*/AdminMonitoring* zod 与 MONITOR_SOURCE_NOT_FOUND=20004、MONITOR_SOURCE_CREDENTIAL_MISSING=50012；码值与既有 25 码无冲突（单测断言）

## 输入
- 文档：`docs/任务规划V0.4.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`contracts/07-monitoring.contract.ts`；`contracts/02-errors.contract.ts`
- 契约：`MonitoringSourceSchema`；`SOURCE_TIERS`；`CatalogChangeEventSchema`；`MONITORING_ERROR_CODES`；`MONITORING_UX_STATES`
- 前置任务：TASK-001
- 前置状态：TASK-001 已合并（errors.ts 唯一源已存在）

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/schemas/monitoring.schema.ts（新建）`
  - `packages/shared/src/errors.ts（追加 2 码 + HTTP 映射 50012→503）`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/__tests__/monitoring.spec.ts（新建）`
  - `docs/任务规划V0.4.0/06_validation/evidence/EVD-056/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 将 contracts/07-monitoring.contract.ts 中 zod 定义原样落入 monitoring.schema.ts（不得改字段名/枚举值）
2. [ ] errors.ts 追加 MONITOR_SOURCE_NOT_FOUND:20004、MONITOR_SOURCE_CREDENTIAL_MISSING:50012 与 DEFAULT_STATUS_BY_CODE[20004]=404、[50012]=503、ERROR_PRESENTATION 两条
3. [ ] index.ts 导出；monitoring.spec.ts 断言：SOURCE_TIERS=[S1,S2,A,B,C]、码值全局唯一、CatalogChangeEvent 判别联合 4 种 kind 可解析样例
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit` exit 0
- [ ] `pnpm --filter @aidean/shared test` 全绿（含 monitoring.spec.ts）
- [ ] `node -e` 读取 ERROR_CODES 值去重后数量 = 27
- [ ] contracts/selfcheck-monitoring.ts 输出 collisions=0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test
```

## 证据路径
`docs/任务规划V0.4.0/06_validation/evidence/EVD-056/`

## 允许修改
- `packages/shared/src/schemas/monitoring.schema.ts`
- `packages/shared/src/errors.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/__tests__/monitoring.spec.ts`
- `docs/任务规划V0.4.0/06_validation/evidence/EVD-056/**`

## 禁止修改
- `apps/**`
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.4.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-001
- 资源锁串行（同文件，须在其后执行）：TASK-014, TASK-021, TASK-026
- Blocks：TASK-057, TASK-058, TASK-060, TASK-066, TASK-072
- 阻塞条件：冻结稿字段与 Prisma 草案（05 §5.6）不一致 → 停止，回报规划者

## 建议执行档位
opus　理由：契约语义（源分级、证据口径、错误码）影响数据/API/UI 三端，不可逆度高

## 升级条件
需改既有码值 → 升 fable；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h
