# TASK-095：CI 回绿：check-docs-facts 计数同步（route 154→156、spec 170→173）+ R10-01 规则落地

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**haiku**

> V0.10.0 状态：**未开工（Hark 核心）**｜V0.10.0 新增

> 历史（V0.4.0→V0.5.0）：V0.10.0 新增（review-ext12 D1）

## 归属
- 所属切片：S0（步行骨架与契约守卫（V0.9.0：剩工件回补、CI 门禁与独立复核））
- 来源需求：REQ-NF-012（CI 硬门禁）
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-001
- 来源方案：review-ext12 D1

## 目标
main 上 `node scripts/check-docs-facts.mjs` exit 0（route-count=156、spec-count=173 以执行时实测为准），CI docs-facts 步骤转绿

## 输入
- 文档：`docs/任务规划V0.10.0/25_执行记录.md`
- 契约：`无`
- 前置任务：无
- 前置状态：main@ff08433

## 输出
- 新增/修改的文件路径：
  - `scripts/check-docs-facts.mjs`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-095/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 实测 route.ts / *.spec.ts 计数
2. [ ] 只改两项期望值与说明（注明 059/028/093 来源）
3. [ ] 跑 rule/facts/guard
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` exit 0
- [ ] diff 仅 scripts/check-docs-facts.mjs 两行数值与说明
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs; echo exit=$?
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-095/`

## 允许修改
- `scripts/check-docs-facts.mjs`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-095/**`

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
- Blocks：TASK-096
- 阻塞条件：无

## 建议执行档位
haiku　理由：两处数值同步，阻断 main CI，Hark 立即处理

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 0.5h　<2h
