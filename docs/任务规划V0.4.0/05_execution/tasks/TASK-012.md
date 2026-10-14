# TASK-012：persistPrices 修正：单模型仅一条 current、事务化

> 版本: v0.4 | 更新: 2026-10-14 | 变更: 任务规划V0.4.0（基于 main@bfb3aef 复核，业务树 = 77c7952；未实现需求核查 + 模型源监控体系纳入统一规划）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**sonnect**

> V0.3.0→V0.4.0：沿用（V0.4.0 重核：bfb3aef 业务树=77c7952，无代码 delta；V0.2.0 判定 = 沿用）

## 归属
- 所属切片：S1（价格历史唯一约束修复（数据完整性，已确认缺陷））
- 来源需求：REQ-F-14
- RTM 追溯（V0.4.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-019
- 来源方案：ADR-P003

## 目标
多价格数组时仅 effectiveAt 最新一条 is_current=true，其余写为历史；updateMany+create 包在 $transaction；单测与集成测试全绿

## 输入
- 文档：`apps/web/lib/sync/writers/index.ts:62-110`
- 契约：`无`
- 前置任务：TASK-011
- 前置状态：TASK-011 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/sync/writers/index.ts`
  - `apps/web/lib/sync/writers/__tests__/persist-prices.spec.ts`
  - `docs/任务规划V0.4.0/06_validation/evidence/EVD-012/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 按 effectiveAt 降序，首条 isCurrent=true
2. [ ] $transaction 包裹
3. [ ] 补单测（mock prisma）+ 复跑集成测试
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec vitest run lib/sync` 全绿
- [ ] 集成测试三次同步均成功且 current 行恰 1 条
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/sync
```

## 证据路径
`docs/任务规划V0.4.0/06_validation/evidence/EVD-012/`

## 允许修改
- `apps/web/lib/sync/writers/**`
- `docs/任务规划V0.4.0/06_validation/evidence/EVD-012/**`

## 禁止修改
- `apps/web/prisma/**`
- `apps/web/lib/sync/adapters/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.4.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-011
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-013
- 阻塞条件：mapper 未提供 effectiveAt → 停止，提给 Agent-API（lib/sync/mappers）

## 建议执行档位
sonnect　理由：单函数修复 + 单测

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 4h　≥2h
