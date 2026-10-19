# TASK-050：CI verify 收尾：本地按 ci.yml 顺序复现 verify job 全部步骤 + coverage 目录入 .gitignore

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.10.0 状态：**未开工**｜V0.10.0：可开工条件见依赖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S0（步行骨架与守卫（V0.10.0：e2e 实跑、CI 收尾、独立复核））
- 来源需求：REQ-NF-03 测试可复现 / §9.4 守卫（ci.yml 现无 lint 与 packages/ui 测试步骤）
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-006
- 来源方案：SOL-S0

## 目标
085 已把 lint 与 @aidean/ui 单测接入 ci.yml（:67-76）；本卡在本地按 ci.yml verify job 顺序逐步执行（含 build）并留存输出，确认全部 exit 0；apps/web/coverage/ 加入 .gitignore

## 输入
- 文档：`.github/workflows/ci.yml:47-69`；`11_基线指标.md §11.2（lint 0 error/1 warning、ui 4 例）`
- 契约：`无（CI 配置）`
- 前置任务：无
- 前置状态：TASK-085 已合并（ci.yml 已含 lint / ui 单测，见 ci.yml:67-76）

## 输出
- 新增/修改的文件路径：
  - `.gitignore`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-050/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 按 ci.yml verify job 的 run 行逐条执行，输出存 EVD-050/verify-job.txt
2. [ ] `.gitignore` 增 apps/web/coverage/
3. [ ] 失败步骤 → 记 FAIL 与归属卡，不在本卡修业务代码
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] EVD-050/verify-job.txt 逐步记录 `exit=<码>` 且全部为 0；非 0 步骤改记 `FAIL→TASK-xxx` 并不计入本卡通过
- [ ] 跑完 `pnpm --filter web exec vitest run --coverage` 后 `git status --short` 不出现 apps/web/coverage
- [ ] diff 仅 .gitignore（与证据目录）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
grep -q 'apps/web/coverage' .gitignore && test -s docs/任务规划V0.10.0/06_validation/evidence/EVD-050/verify-job.txt && ! grep -E 'exit=[1-9]' docs/任务规划V0.10.0/06_validation/evidence/EVD-050/verify-job.txt; echo exit=$?
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-050/`

## 允许修改
- `.gitignore`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-050/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：lint 在 CI Node 20 下出现本地无的 error → 不改业务代码，登记并上报

## 建议执行档位
sonnect　理由：CI 配置追加两个既有命令，确定性

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 1h　<2h
