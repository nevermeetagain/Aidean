# TASK-051：统一需求追溯矩阵入库 + 台账内部状态矛盾消解（#17/#36）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**opus**

> V0.10.0 状态：**未开工（Hark 核心）**｜V0.10.0：可开工条件见依赖

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-22 收回 Hark：RTM 入库是需求口径终裁

## 归属
- 所属切片：S7（文档治理收口 + 统一需求追溯矩阵）
- 来源需求：本次需求「建立统一规划体系」/ AGENTS 铁律1 单一事实来源
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-C-008、REQ-NF-005、REQ-L-007、REQ-L-009
- 来源方案：ADR-P004 / 本规划 03a

## 目标
docs/product/requirements/需求追溯矩阵.md 成为需求→状态→任务的唯一追溯表（内容取自本规划 03a，逐行带证据路径），需求文档/台账/待执行大纲改为链接它；台账 #17（L44 🟡 vs §7.12 R-83 ✅）与 #36（L113 🟡 vs L295 ✅）各保留一个现行状态

## 输入
- 文档：`docs/任务规划V0.10.0/03a_统一需求追溯矩阵.md`；`docs/plans/未完成事项目录.md L44/L113/L295`
- 契约：`无（文档）`
- 前置任务：TASK-041
- 前置状态：TASK-041 已合并（台账拆分后路径）；TASK-040 已合并

## 输出
- 新增/修改的文件路径：
  - `docs/product/requirements/需求追溯矩阵.md（新建）`
  - `docs/plans/**（链接与状态对账）`
  - `docs/文档索引.md`
  - `scripts/check-docs-facts.mjs（新增 RTM 行数断言）`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-051/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 复制 RTM 表并把「本规划任务号」列改为相对链接
2. [ ] 台账 #17/#36 状态对账（以 §7.12 收口回执与代码为准）
3. [ ] check-docs-facts 增断言：RTM 中「未实现/部分」行均有任务号或「暂不执行」理由
4. [ ] 文档索引登记
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] check-docs-rule exit 0
- [ ] check-docs-facts 全 PASS（含新断言）
- [ ] `grep -c "^| REQ-" docs/product/requirements/需求追溯矩阵.md` = 本规划 RTM 行数
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-051/`

## 允许修改
- `docs/product/requirements/需求追溯矩阵.md`
- `docs/plans/**`
- `docs/文档索引.md`
- `scripts/check-docs-facts.mjs`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-051/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `docs/任务规划V0.10.0/**`
- `.example/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-041
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：RTM 与 TASK-040 后的需求文档条目数不一致 → 停止回报 Hark 对账

## 建议执行档位
opus　理由：需求追溯矩阵入库=需求口径裁决

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 3h　≥2h
