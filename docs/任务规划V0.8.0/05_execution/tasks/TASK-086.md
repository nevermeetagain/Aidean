# TASK-086：他线 S0–S3 落地独立复核：30 张卡逐卡跑验证命令并裁决 PASS/FAIL/UNKNOWN（单测已由规划期先行实测）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**opus**

> V0.8.0 状态：**待 089、091**｜V0.8.0：代码已在镜像，复核范围扩为 S0–S3 30 卡；经 089（← 085）、091 启动；规划期已完成单测/类型/lint/构建先行实测（EVD-BASELINE-V8）

> 历史（V0.4.0→V0.5.0）：V0.7.0 新增

## 归属
- 所属切片：S0（步行骨架与契约守卫（V0.8.0：代码已叠加，剩回补与复核））
- 来源需求：REQ-L-015 / §9.3 防自证
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-041、REQ-F-052、REQ-NF-002、REQ-L-015
- 来源方案：ADR-P008

## 目标
对 TASK-001…025、050、076–079 在镜像 main 上逐卡执行卡内「验证命令」，输出 PASS/FAIL/UNKNOWN 表；规划期已得单测 PASS 的卡，本卡补 e2e/真库/运行态三类证据

## 输入
- 文档：`docs/任务规划V0.8.0/05_execution/task-index.md`；`docs/任务规划V0.5.0/06_validation/evidence/（他线证据，仅作对照）`
- 契约：`无（只读对照 docs/任务规划V0.5.0/contracts）`
- 前置任务：TASK-089, TASK-091
- 前置状态：TASK-089 已合并（否则 web 单测在带 DATABASE_URL 的环境中必有 1 文件失败）；TASK-091 已产出 PG16 证据

## 输出
- 新增/修改的文件路径：
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-086/verdicts.md`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-086/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] `pnpm install --frozen-lockfile`；记录 node/pnpm 版本
2. [ ] docker 起 postgres:16 + redis:7，`prisma migrate deploy` 空库重放
3. [ ] `pnpm --filter web build && PORT=3000 pnpm --filter web start` 后跑 `pnpm test:e2e -g 'walking-skeleton|feature-flags|favorites|ladder-filter-all'`
4. [ ] 逐卡只记 PASS/FAIL/UNKNOWN + 退出码 + 证据文件名
5. [ ] 回写 task-index 状态列（交 TASK-088）
6. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] verdicts.md 恰 30 行且每行含退出码与证据文件
- [ ] 无 PASS 行缺证据文件
- [ ] FAIL 卡已转回「未开工/返工」
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
test $(grep -cE '^\| TASK-(0[0-2][0-9]|050|07[6-9]) ' docs/任务规划V0.8.0/06_validation/evidence/EVD-086/verdicts.md) -eq 30; echo rows_ok=$?
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-086/`

## 允许修改
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-086/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `scripts/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-089, TASK-091
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-088, TASK-092
- 阻塞条件：089、091 未完成 → 不开工（089 依赖 085，故 086 实际随 085 → 089 链启动）；执行环境缺 PG16/Docker/浏览器 → 对应卡记 UNKNOWN，不得写 PASS

## 建议执行档位
opus　理由：独立验证者角色（防自证循环：执行者为他线 Agent，判定者须不同）

## 升级条件
≥3 张 FAIL → 升 fable 重估 S0/S1 范围；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h
