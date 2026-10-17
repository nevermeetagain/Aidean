# TASK-086：他线 S0/S1 落地独立复核：16 张卡逐卡跑验证命令并裁决 PASS/FAIL/UNKNOWN

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**opus**

> V0.7.0 状态：**待 085**｜V0.7.0 新增：把「员工声明」转为「可复现证据」的唯一入口

> 历史（V0.4.0→V0.5.0）：V0.7.0 新增

## 归属
- 所属切片：S0（步行骨架与契约守卫（含 V0.7.0 主线归一前置））
- 来源需求：REQ-L-015 / §9.3 防自证
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-L-015
- 来源方案：ADR-P008

## 目标
对 TASK-001…013/050/076/077 在归一后的 main 上逐卡执行卡内「验证命令」，输出 16 行 PASS/FAIL/UNKNOWN 表，并据此更新 task-index 状态

## 输入
- 文档：`docs/任务规划V0.7.0/05_execution/task-index.md`；`docs/任务规划V0.5.0/06_validation/evidence/（他线证据，仅作对照）`
- 契约：`无（只读对照 docs/任务规划V0.5.0/contracts）`
- 前置任务：TASK-085
- 前置状态：TASK-085 已完成（方案B）；方案A 下本卡自动关闭为 N/A

## 输出
- 新增/修改的文件路径：
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-086/verdicts.md`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-086/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] `pnpm install --frozen-lockfile`；记录 node/pnpm 版本
2. [ ] 逐卡执行验证命令（需 PG 的卡用 docker postgres:16，DATABASE_URL 仅写入环境变量）
3. [ ] 每卡只记 PASS/FAIL/UNKNOWN + 命令退出码 + 输出文件名
4. [ ] 汇总回写 task-index「V0.7.0 状态」列（交 TASK-088 落文档）
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] verdicts.md 恰 16 行，每行含退出码与证据文件
- [ ] 无 PASS 行缺证据文件
- [ ] FAIL/UNKNOWN 卡已重新标为「未开工/阻塞」
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
test $(grep -cE '^\| TASK-(00[1-9]|01[0-3]|050|076|077) ' docs/任务规划V0.7.0/06_validation/evidence/EVD-086/verdicts.md) -eq 16; echo rows_ok=$?
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-086/`

## 允许修改
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-086/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `scripts/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-085
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-088
- 阻塞条件：085 未完成；或执行环境缺 PG16/Docker → 记 UNKNOWN 不得写 PASS

## 建议执行档位
opus　理由：独立验证者角色（防自证循环：执行者为他线 Agent，判定者须不同）

## 升级条件
≥3 张 FAIL → 升 fable 重估 S0/S1 范围；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h
