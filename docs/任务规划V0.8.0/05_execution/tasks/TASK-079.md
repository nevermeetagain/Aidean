# TASK-079：e2e：筛选「全部」全选/全不选 + 价格页档位一致

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.8.0 状态：**镜像已落地·e2e 未运行**｜V0.8.0 复核（c2da219）：e2e/tests/ladder-filter-all.spec.ts 新增；本环境未运行（UNKNOWN）（V0.7.0 判定：未开工）；剩余工时 0（原 2h，验收转 TASK-086/091/092）

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增

## 归属
- 所属切片：S3（收藏）
- 来源需求：REQ-F-058 / REQ-F-026
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-058
- 来源方案：同 078

## 目标
e2e 断言两条行为

## 输入
- 文档：`docs/任务规划V0.8.0/05_execution/tasks/TASK-078.md`
- 契约：`无`
- 前置任务：TASK-078, TASK-006
- 前置状态：TASK-078、TASK-006 已合并

## 输出
- 新增/修改的文件路径：
  - `e2e/ladder-filter-all.spec.ts（新建）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-079/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.8.0/06_validation/evidence/EVD-079/`

## 允许修改
- `e2e/ladder-filter-all.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-079/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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
小　约 0h　<2h
