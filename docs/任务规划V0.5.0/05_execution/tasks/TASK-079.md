# TASK-079：e2e：筛选「全部」全选/全不选 + 价格页档位一致

> 版本: v0.5 | 更新: 2026-10-14 | 变更: 任务规划V0.5.0（基于 main@cd5b1a9 复核，业务树 = 77c7952 无 delta；V0.4.0 反向审计 28 项修正 + 14 条遗漏需求入表 + 执行者重分配与 Agent 任务书）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.4.0→V0.5.0：V0.5.0 新增

## 归属
- 所属切片：S3（收藏）
- 来源需求：REQ-F-058 / REQ-F-026
- RTM 追溯（V0.5.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-058
- 来源方案：同 078

## 目标
e2e 断言两条行为

## 输入
- 文档：`docs/任务规划V0.5.0/05_execution/tasks/TASK-078.md`
- 契约：`无`
- 前置任务：TASK-078, TASK-006
- 前置状态：TASK-078、TASK-006 已合并

## 输出
- 新增/修改的文件路径：
  - `e2e/ladder-filter-all.spec.ts（新建）`
  - `docs/任务规划V0.5.0/06_validation/evidence/EVD-079/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 全选/全不选各一例；pricing 档位与 RECHARGE_TIERS 一致一例
2. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm test:e2e -g ladder-filter-all` 全绿
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm test:e2e -g ladder-filter-all
```

## 证据路径
`docs/任务规划V0.5.0/06_validation/evidence/EVD-079/`

## 允许修改
- `e2e/ladder-filter-all.spec.ts`
- `docs/任务规划V0.5.0/06_validation/evidence/EVD-079/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-078, TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：无

## 建议执行档位
sonnect　理由：e2e 编写

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h
