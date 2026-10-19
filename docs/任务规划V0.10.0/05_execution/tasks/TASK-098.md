# TASK-098：快照写入器加固：空 items 不下架、分批 upsert 与事务超时、同 hash 并发返回既有快照

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**sonnect**

> V0.10.0 状态：**未开工**｜V0.10.0 新增

> 历史（V0.4.0→V0.5.0）：V0.10.0 新增（review-ext12 D6/D7/D10）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-004 / REQ-M-005
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-003、REQ-M-004
- 来源方案：review-ext12 D6/D7/D10

## 目标
persistCatalogSnapshot：items 为空时不执行下架（记 snapshot status=empty 并返回 delisted=0）；upsert 按 200 条分批且事务 timeout 显式设为 60s；同 (sourceId, contentHash) 并发第二次捕获 P2002 后返回既有快照（idempotent=true）

## 输入
- 文档：`docs/任务规划V0.9.0/06_validation/evidence/EVD-059/`；`docs/任务规划V0.10.0/03_solution/design/DESIGN-004-模型源监控体系.md`
- 契约：`07-monitoring（冻结）`
- 前置任务：无
- 前置状态：TASK-059 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/sync/writers/catalog-snapshot.ts`
  - `apps/web/lib/sync/writers/catalog-snapshot.spec.ts`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-098/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 空 items 守卫
2. [ ] 分批 + timeout
3. [ ] P2002 回读
4. [ ] 单测 3 例
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] catalog-snapshot 单测全绿且新增 ≥3 例
- [ ] web tsc exit 0
- [ ] `node scripts/check-docs-facts.mjs` exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/sync/writers && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-098/`

## 允许修改
- `apps/web/lib/sync/writers/catalog-snapshot.ts`
- `apps/web/lib/sync/writers/catalog-snapshot.spec.ts`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-098/**`

## 禁止修改
- `apps/web/prisma/**`
- `packages/shared/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：需改表结构 → 停，交 Hark

## 建议执行档位
sonnect　理由：仓储层健壮性，规则明确

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h
