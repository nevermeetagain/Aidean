# TASK-073：llmtest 观测入时序：composite 分数/存活/通过计数写 ReliabilityObservation（不再只塞 description）

> 版本: v0.4 | 更新: 2026-10-14 | 变更: 任务规划V0.4.0（基于 main@bfb3aef 复核，业务树 = 77c7952；未实现需求核查 + 模型源监控体系纳入统一规划）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.3.0→V0.4.0：新增（V0.4.0 模型源监控）

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-M-008
- RTM 追溯（V0.4.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-008
- 来源方案：DESIGN-004 / ADR-P007

## 目标
每次 llmtest 采集把 score/isAlive/total_checks/pass_count/last_alive_at 写 ReliabilityObservation(entityType='station' 或 candidate 关联)，窗口=采集日；保留既有候选发现行为不变

## 输入
- 文档：`apps/web/lib/discovery/llmtest.ts`；`docs/任务规划V0.4.0/19_外部来源核验证据.md（composite 实测 51 条、rank 从 2 开始）`
- 契约：`无新增`
- 前置任务：TASK-058
- 前置状态：TASK-058 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/discovery/llmtest.ts`
  - `apps/web/lib/discovery/llmtest.spec.ts`
  - `apps/web/lib/discovery/llmtest-observations.ts（新建）`
  - `docs/任务规划V0.4.0/06_validation/evidence/EVD-073/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 新增 mapLlmtestItemToObservation 纯函数
2. [ ] llmtest.spec.ts 增 3 用例（缺字段/isAlive=false/重复采集）
3. [ ] rank 缺 1 的现象记录为数据源特性，不做补齐
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec vitest run lib/discovery/llmtest.spec.ts` 全绿
- [ ] 既有用例不变（用例数只增不减）
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/discovery/llmtest.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.4.0/06_validation/evidence/EVD-073/`

## 允许修改
- `apps/web/lib/discovery/llmtest.ts`
- `apps/web/lib/discovery/llmtest.spec.ts`
- `apps/web/lib/discovery/llmtest-observations.ts`
- `docs/任务规划V0.4.0/06_validation/evidence/EVD-073/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.4.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-058
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：无

## 建议执行档位
sonnect　理由：既有映射扩展 + 单测

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h
