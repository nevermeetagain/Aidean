# TASK-062：调度脚本 monitor_catalogs.ts（按源 cron 运行 collector→writer→diff，单源失败不影响他源）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.8.0 状态：**未开工**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：未开工）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-009/010
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-002、REQ-M-009、REQ-M-010
- 来源方案：DESIGN-004 / ADR-P007

## 目标
`npx tsx scripts/crawl/monitor_catalogs.ts --source openrouter --dry-run` 输出观测数；非 dry-run 写库；任一源异常记 monitoring_sources.lastError 且退出码仍为 0（部分成功）、全部失败退出码 1

## 输入
- 文档：`docs/任务规划V0.8.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`scripts/crawl/crawl_llmtest.ts（范式）`；`apps/web/lib/features/admin/script-executor.ts（调度执行器）`
- 契约：`MonitoringSourceSchema`
- 前置任务：TASK-061
- 前置状态：TASK-061 已合并

## 输出
- 新增/修改的文件路径：
  - `scripts/crawl/monitor_catalogs.ts（新建）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-062/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 参数：--source <key|all> --dry-run --limit N
2. [ ] 按 enabled 且 authRequired=false（或凭证已配置）的源顺序执行；每源 try/catch
3. [ ] 更新 monitoring_sources.lastRunAt/lastStatus/lastError/lastCount
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `npx tsx scripts/crawl/monitor_catalogs.ts --help` exit 0
- [ ] --dry-run 在无 DB 环境下对 fixture 模式（MONITOR_FIXTURE_DIR）输出 3 源计数
- [ ] 人工断网时退出码 1 且 stderr 含每源错误
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
npx tsx scripts/crawl/monitor_catalogs.ts --help && MONITOR_FIXTURE_DIR=apps/web/lib/monitoring/catalog/__tests__/fixtures npx tsx scripts/crawl/monitor_catalogs.ts --source all --dry-run
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-062/`

## 允许修改
- `scripts/crawl/monitor_catalogs.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-062/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-061
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-065
- 阻塞条件：无

## 建议执行档位
sonnect　理由：薄封装脚本，沿用 crawl_llmtest.ts 范式

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h
