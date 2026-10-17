# TASK-050：CI 门禁补齐：lint + @aidean/ui 单测进入 verify job

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**他线声称完成·证据不足**｜V0.6.0 声称已在 aideanew/Aidean@huaweicloud 落地（存档证据 docs/任务规划V0.5.0/06_validation/evidence/EVD-050/）；镜像核验（ffa158c）：迁移目录无 20261014000000_*（末条 20261012082315_rbac_role_permission_user_role）；schema.prisma:480 仍为 @@unique([modelId, isCurrent])；scripts/contract/、scripts/guard/ 不存在；ci.yml 无 lint 步骤；app/api/v1/system/ 仅 health、navigation（无 ready）。处置：TASK-086 于主线归一后逐卡跑本卡「验证命令」→ PASS 关闭 / FAIL 回到本卡执行；方案A（镜像为真源）下按本卡原样执行

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S0（步行骨架与契约守卫（含 V0.7.0 主线归一前置））
- 来源需求：REQ-NF-03 测试可复现 / §9.4 守卫（ci.yml 现无 lint 与 packages/ui 测试步骤）
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-006
- 来源方案：SOL-S0

## 目标
CI verify job 新增 `pnpm --filter web lint`（0 error）与 `pnpm --filter @aidean/ui exec vitest run`（4 例）两步，任一失败阻断合并

## 输入
- 文档：`.github/workflows/ci.yml:47-69`；`11_基线指标.md §11.2（lint 0 error/1 warning、ui 4 例）`
- 契约：`无（CI 配置）`
- 前置任务：TASK-007
- 前置状态：TASK-006/007 已合并（同文件资源锁）

## 输出
- 新增/修改的文件路径：
  - `.github/workflows/ci.yml`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-050/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 在 Typecheck(web) 之后插入 Lint(web) 步骤
2. [ ] 在 Unit tests(shared) 之后插入 Unit tests(ui) 步骤
3. [ ] 本地按 CI 顺序复跑两命令
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] CI verify job 日志含 Lint(web) 与 Unit tests(ui) 两步且均成功
- [ ] lint 输出 0 error（既有 1 warning SafeImage.tsx:19 允许）
- [ ] @aidean/ui 4 tests passed
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web lint && pnpm --filter @aidean/ui exec vitest run
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-050/`

## 允许修改
- `.github/workflows/ci.yml`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-050/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-007
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：lint 在 CI Node 20 下出现本地无的 error → 不改业务代码，登记并上报

## 建议执行档位
sonnect　理由：CI 配置追加两个既有命令，确定性

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h
