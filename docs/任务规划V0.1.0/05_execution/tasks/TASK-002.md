# TASK-002：web 侧错误码改为从 shared 重导出（消除双源）

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

## 归属
- 所属切片：S0（步行骨架与契约守卫）
- 来源需求：REQ-NF-01
- 来源方案：ADR-P001

## 目标
apps/web/app/api/v1/_lib/errors.ts 不再定义码值，仅重导出 shared；web 全量单测与 tsc 保持全绿

## 输入
- 文档：`contracts/02-errors.contract.ts`
- 契约：`ERROR_CODES`；`DEFAULT_STATUS_BY_CODE`
- 前置任务：TASK-001
- 前置状态：TASK-001 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/api/v1/_lib/errors.ts`
  - `apps/web/app/api/v1/_lib/response.ts（如需改为 import shared 映射）`
  - `docs/任务规划V0.1.0/06_validation/evidence/EVD-002/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] errors.ts 中 ERROR_CODES/DEFAULT_STATUS_BY_CODE 改为 `export { ERROR_CODES, DEFAULT_STATUS_BY_CODE } from "@aidean/shared"`，保留 formatZodMessage 与 ApiError（运行时类）
2. [ ] response.ts 继续 import ./errors（路径不变，零调用方改动）
3. [ ] 运行 web tsc 与 vitest 全量
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec tsc --noEmit` 退出码 0
- [ ] `pnpm --filter web test` 1081+ 例全绿
- [ ] `grep -nE "^\s+[A-Z_]+: [0-9]{5}," apps/web/app/api/v1/_lib/errors.ts` 无输出（无本地码值）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web test
```

## 证据路径
`docs/任务规划V0.1.0/06_validation/evidence/EVD-002/`

## 允许修改
- `apps/web/app/api/v1/_lib/errors.ts`
- `apps/web/app/api/v1/_lib/response.ts`
- `docs/任务规划V0.1.0/06_validation/evidence/EVD-002/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/app/api/v1/**/route.ts`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.1.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-001
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-003, TASK-015, TASK-016
- 阻塞条件：任何 route 因类型变化需改动 → 停止，回报 Agent-Contract

## 建议执行档位
sonnect　理由：机械重构，契约已冻结，有既有 1081 单测兜底

## 升级条件
单测失败 2 次 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h
