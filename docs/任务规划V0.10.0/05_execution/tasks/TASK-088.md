# TASK-088：治理登记：目录结构文档登记 V0.8.0 树 + task-index 状态回写（依 EVD-086/091/092） + docs/执行过程.md 归档拆分

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**haiku**

> V0.10.0 状态：**未开工**｜V0.10.0：可开工条件见依赖；已完成依赖 TASK-090 移出卡集

> 历史（V0.4.0→V0.5.0）：V0.7.0 新增

## 归属
- 所属切片：S7（文档治理收口 + 统一需求追溯矩阵）
- 来源需求：AGENTS.md 铁律 6（目录变更必登记）/ REQ-L-015
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-L-015
- 来源方案：目录结构文档 v3.18 惯例

## 目标
目录结构文档补记 EVD-086 结论；依据 EVD-086 回写 V0.7.0 task-index 状态；docs/执行过程.md 移入 docs/archive/ 并修正引用

## 输入
- 文档：`docs/governance/目录结构文档.md`；`docs/任务规划V0.10.0/06_validation/evidence/EVD-086/verdicts.md`
- 契约：`无`
- 前置任务：TASK-086
- 前置状态：TASK-086 已完成（或方案A 下 N/A）

## 输出
- 新增/修改的文件路径：
  - `docs/governance/目录结构文档.md`
  - `docs/文档索引.md`
  - `docs/archive/执行过程.md（git mv）`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-088/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 目录结构文档已登记 V0.8.0 树（V0.8.0 规划提交按铁律 6 登记 v3.20），版本号 +1 补记 EVD-086/091/092 结论
2. [ ] 按 EVD-086/verdicts.md 只更新 docs/任务规划V0.10.0/05_execution/task-index.md 的「V0.8.0 状态」列（不改其他列，不改卡面）
3. [ ] git mv docs/执行过程.md docs/archive/ 并 grep 修正引用
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` exit 0
- [ ] `test ! -f docs/执行过程.md` exit 0
- [ ] task-index「V0.8.0 状态」列与 verdicts.md 一致（30 行逐一比对）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs && test ! -f docs/执行过程.md && grep -q '任务规划V0.9.0' docs/governance/目录结构文档.md; echo exit=$?
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-088/`

## 允许修改
- `docs/governance/目录结构文档.md`
- `docs/文档索引.md`
- `docs/archive/执行过程.md`
- `docs/执行过程.md`
- `docs/任务规划V0.10.0/05_execution/task-index.md`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-088/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-086
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：EVD-004 等证据以硬路径引用 docs/执行过程.md 且无法改指 → 保留原位只登记

## 建议执行档位
haiku　理由：索引/登记更新

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h
