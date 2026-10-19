# TASK-086：已移出卡独立复核：V0.8.0 判镜像落地的 22 张卡逐卡跑原验证命令并裁决 PASS/FAIL/UNKNOWN（补 e2e/真库/运行态证据）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**opus**

> V0.10.0 状态：**未开工（Hark 核心）**｜V0.10.0：可开工条件见依赖；已完成依赖 TASK-091 移出卡集

> 历史（V0.4.0→V0.5.0）：V0.7.0 新增

## 归属
- 所属切片：S0（步行骨架与契约守卫（V0.9.0：剩工件回补、CI 门禁与独立复核））
- 来源需求：REQ-L-015 / §9.3 防自证
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-015、REQ-F-021、REQ-F-041、REQ-F-052、REQ-NF-001、REQ-NF-002、REQ-NF-010、REQ-NF-011、REQ-L-001、REQ-L-002、REQ-L-003、REQ-L-004、REQ-L-012、REQ-F-054、REQ-F-055、REQ-L-015
- 来源方案：ADR-P008

## 目标
对 V0.8.0 判「镜像已落地」并已移出卡集的 22 张卡（TASK-001–005、010–012、014–019、021–024、076–079；卡面原文见 docs/任务规划V0.8.0/05_execution/tasks/）在镜像 main 上逐卡执行原卡「验证命令」，输出 PASS/FAIL/UNKNOWN 表；单测已在规划/执行期复现，本卡补 e2e/真库/运行态三类证据；FAIL 卡重新立卡回到 V0.9.x

## 输入
- 文档：`docs/任务规划V0.10.0/07_原子任务卡全集.md（已移出卡清单）`；`docs/任务规划V0.8.0/05_execution/tasks/（22 张原卡面）`；`docs/任务规划V0.9.0/06_validation/evidence/EVD-058、EVD-089（Hark PG16 证据，可复用）`
- 契约：`无（只读对照 docs/任务规划V0.5.0/contracts）`
- 前置任务：无
- 前置状态：TASK-089 已完成（V0.9.0）；TASK-091 已产出 PG16 证据（Hark 已在 PG16.14 实测 18 条迁移重放与 int spec，见 EVD-058/EVD-089，可复用）

## 输出
- 新增/修改的文件路径：
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-086/verdicts.md`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-086/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] `pnpm install --frozen-lockfile`；记录 node/pnpm 版本
2. [ ] docker 起 postgres:16 + redis:7，`prisma migrate deploy` 空库重放
3. [ ] `pnpm --filter web build && PORT=3000 pnpm --filter web start` 后跑 `pnpm test:e2e -g 'walking-skeleton|feature-flags|favorites|ladder-filter-all'`
4. [ ] 逐卡只记 PASS/FAIL/UNKNOWN + 退出码 + 证据文件名
5. [ ] FAIL 卡在 V0.9.x task-index 重新立卡（交 TASK-088 回写）
6. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] verdicts.md 恰 22 行且每行含退出码与证据文件
- [ ] 无 PASS 行缺证据文件
- [ ] FAIL 卡已在 task-index 重新立卡
- [ ] `node scripts/check-docs-facts.mjs` exit 0（R10-01：本卡新增 route/page/spec 时同步期望值）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
test $(grep -cE '^\| TASK-(00[1-5]|01[0-24-9]|02[1-4]|07[6-9]) ' docs/任务规划V0.10.0/06_validation/evidence/EVD-086/verdicts.md) -eq 22; echo rows_ok=$?
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-086/`

## 允许修改
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-086/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `scripts/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-088, TASK-092
- 阻塞条件：091 未完成 → 不开工；执行环境缺 PG16/Docker/浏览器 → 对应卡记 UNKNOWN，不得写 PASS

## 建议执行档位
opus　理由：独立验证者角色（防自证循环：执行者为他线 Agent，判定者须不同）

## 升级条件
≥3 张 FAIL → 升 fable 重估 S0/S1 范围；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h
