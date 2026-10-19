# TASK-041：台账拆分 + 勾选滞后补录 + CHANGELOG 补录 finalize 里程碑

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**sonnect**

> V0.10.0 状态：**未开工**｜V0.10.0：可开工条件见依赖

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-22 156KB 台账拆分，haiku 档偏低 → sonnect

## 归属
- 所属切片：S7（文档治理收口 + 统一需求追溯矩阵）
- 来源需求：AGENTS 铁律6（单文档 >3000 字须拆分）
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-C-008、REQ-L-008
- 来源方案：SOL-S7

## 目标
未完成事项目录（155,968 字节）按 §一~§八/§7.x 回执拆为主表 + 回执分册；finalize-admin-ia-and-ops-gaps/tasks.md 按代码证据补勾；CHANGELOG 补 finalize 条目；文档索引同步

## 输入
- 文档：`docs/plans/未完成事项目录.md`；`docs/specs/finalize-admin-ia-and-ops-gaps/tasks.md`；`CHANGELOG.md`
- 契约：`无`
- 前置任务：TASK-040
- 前置状态：无（与实现无文件交集；但与其他 Agent-Docs 卡串行）

## 输出
- 新增/修改的文件路径：
  - `docs/plans/未完成事项目录.md`
  - `docs/plans/未完成事项回执/*.md（新建分册）`
  - `docs/specs/finalize-admin-ia-and-ops-gaps/tasks.md`
  - `CHANGELOG.md`
  - `docs/文档索引.md`
  - `docs/plans/README.md`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-041/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 重算本切片引入的计数漂移（route/page/spec/lib-features/@aidean/ui refs）并同步 scripts/check-docs-facts.mjs 期望值；admin 域/页数变化同步《功能设计文档》§3.5 口径锚（check-docs-rule 以文档为锚）
2. [ ] 拆分保持锚点可达（被引用锚改为分册链接）
3. [ ] 补勾每项附证据路径（如 lib/admin-nav-default-tree.ts、api/v1/admin/holds）
4. [ ] 门禁
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] check-docs-rule exit 0
- [ ] check-docs-facts 全 PASS
- [ ] `grep -rn "未完成事项目录.md#" docs` 链接全部可解析（脚本或人工抽查 10 条）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-041/`

## 允许修改
- `scripts/check-docs-facts.mjs`
- `docs/plans/**`
- `docs/specs/finalize-admin-ia-and-ops-gaps/tasks.md`
- `CHANGELOG.md`
- `docs/文档索引.md`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-041/**`

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
- Depends on：TASK-040
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-051
- 阻塞条件：check-docs-facts 硬引用台账路径 → 本卡同步脚本中的路径（Agent-Docs 所有）

## 建议执行档位
sonnect　理由：大文件结构化拆分 + 交叉引用维护，haiku 易丢引用

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 5h　≥2h
