# TASK-058：迁移 M-002：monitoring_sources / catalog_snapshots / provider_model_observations / catalog_change_events + 种子注册公开源 + 后台导航节点

> 版本: v0.4 | 更新: 2026-10-14 | 变更: 任务规划V0.4.0（基于 main@bfb3aef 复核，业务树 = 77c7952；未实现需求核查 + 模型源监控体系纳入统一规划）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**opus**

> V0.3.0→V0.4.0：新增（V0.4.0 模型源监控）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-001/002/003/004/005
- RTM 追溯（V0.4.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-001、REQ-M-003、REQ-M-004
- 来源方案：DESIGN-004 / ADR-P007

## 目标
新增迁移 20261015000000_model_source_monitoring（仅 CREATE，不改既有表）在空库重放与存量升级均成功；seed 注册 5 个公开源（openrouter/aihubmix/quanzil/huggingface/llmtest）

## 输入
- 文档：`docs/任务规划V0.4.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`docs/任务规划V0.4.0/05_数据模型基线.md §5.6`；`docs/任务规划V0.4.0/database/002_monitoring.sql`
- 契约：`MonitoringSourceSchema`；`CatalogSnapshotSchema`；`ProviderModelObservationSchema`；`CatalogChangeEventSchema`
- 前置任务：TASK-011, TASK-056
- 前置状态：TASK-011（M-001）已合并；TASK-056 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/prisma/schema.prisma（追加 4 model + 2 enum）`
  - `apps/web/prisma/migrations/20261015000000_model_source_monitoring/migration.sql（新建）`
  - `apps/web/prisma/seed.ts（monitoringSourcesData 5 行，upsert by key）`
  - `apps/web/lib/admin-nav-default-tree.ts（新增「模型源监控」节点 /admin/monitoring）`
  - `docs/任务规划V0.4.0/06_validation/evidence/EVD-058/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 按 database/002_monitoring.sql 写 Prisma model（字段/索引/唯一键逐一对应），`prisma migrate dev --create-only` 生成并人工比对 SQL
2. [ ] seed：monitoringSourcesData（key, tier, kind, endpoint, authRequired, cadenceCron, tosStatus, enabled）5 行；tosStatus 初值取 U-M6 裁决（未裁决=pending，仅后台可见）；authRequired=true 的源默认 enabled=false
3. [ ] admin-nav-default-tree.ts 增节点（权限码复用 admin:sync:read，避免新增权限码）
4. [ ] PG16 空库：migrate deploy + db:seed 两次（幂等）
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `DATABASE_URL=... npx prisma validate` exit 0
- [ ] 空库 `prisma migrate deploy` 17/17 成功（证据含输出）
- [ ] seed 两次后 monitoring_sources 恰 5 行
- [ ] 既有 16 条迁移文件 `git diff --stat` 为空
- [ ] admin-navigation 相关单测全绿
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
cd apps/web && DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy && DATABASE_URL=$TEST_DATABASE_URL npx prisma db seed && pnpm --filter web exec vitest run lib/admin-nav
```

## 证据路径
`docs/任务规划V0.4.0/06_validation/evidence/EVD-058/`

## 允许修改
- `apps/web/prisma/schema.prisma`
- `apps/web/prisma/migrations/20261015000000_model_source_monitoring/`
- `apps/web/prisma/seed.ts`
- `apps/web/lib/admin-nav-default-tree.ts`
- `docs/任务规划V0.4.0/06_validation/evidence/EVD-058/**`

## 禁止修改
- `apps/web/app/**`
- `packages/**`
- `apps/web/prisma/migrations/2026092*、20261008*、20261010*、20261012*（既有迁移只读）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.4.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-011, TASK-056
- 资源锁串行（同文件，须在其后执行）：TASK-017
- Blocks：TASK-059, TASK-063, TASK-073
- 阻塞条件：需要 ALTER 既有表 → 停止并提 ADR（本迁移只允许 CREATE）

## 建议执行档位
opus　理由：新增 4 表 + 索引 + 种子，迁移不可逆且需串行（持有 M-002）

## 升级条件
空库重放失败 2 次 → 升 opus 复审 SQL；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 8h　≥2h
