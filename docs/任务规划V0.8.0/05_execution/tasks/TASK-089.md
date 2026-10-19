# TASK-089：修复集成测试门控：persist-prices.int.spec.ts 改为显式开关 RUN_DB_TESTS=1，避免 CI 占位 DATABASE_URL 误触发

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**sonnect**

> V0.8.0 状态：**未开工（Hark 核心）**｜V0.8.0 新增：规划期以带 DATABASE_URL（localhost:5432）的环境复现连接失败（EVD-BASELINE-V8/web-vitest.txt:241-252）；独立审查确认 CI 作业级占位 DATABASE_URL 对「Unit tests (web)」生效且 vitest.config 无覆盖

> 历史（V0.4.0→V0.5.0）：V0.7.0 新增

## 归属
- 所属切片：S1（价格历史唯一约束修复（数据完整性，已确认缺陷））
- 来源需求：REQ-NF-（CI 门禁可信）/ §9.4 相关单测为硬门禁
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-019、REQ-NF-005
- 来源方案：V0.8.0 02_事实基线 D8-01

## 目标
默认 `pnpm --filter web test`（含 CI 作业级占位 DATABASE_URL）下该集成套件 skip；`RUN_DB_TESTS=1 DATABASE_URL=<pg16>` 下执行

## 输入
- 文档：`docs/任务规划V0.8.0/02_事实基线.md §D8-01`；`.github/workflows/ci.yml:23-25`
- 契约：`无`
- 前置任务：TASK-085
- 前置状态：无

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/sync/writers/__tests__/persist-prices.int.spec.ts`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-089/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 把 `const DB_ENABLED = !!process.env.DATABASE_URL` 改为 `process.env.RUN_DB_TESTS === "1" && !!process.env.DATABASE_URL`
2. [ ] 同步更新文件头注释中的运行命令
3. [ ] 以 CI 同款占位串运行 web 单测确认 0 失败
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `DATABASE_URL=postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder pnpm --filter web exec vitest run` exit 0
- [ ] 该文件在上述命令中计为 skipped
- [ ] diff 仅触及本文件
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
DATABASE_URL='postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public' pnpm --filter web exec vitest run; echo exit=$?
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-089/`

## 允许修改
- `apps/web/lib/sync/writers/__tests__/persist-prices.int.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-089/**`

## 禁止修改
- `apps/web/lib/sync/writers/index.ts`
- `.github/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-085
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-086, TASK-091
- 阻塞条件：他线（B' 下）已在 huaweicloud 以其他方式修复 → 关闭本卡，以下次叠加为准

## 建议执行档位
sonnect　理由：单文件门控修改，规则明确

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 1h　<2h
