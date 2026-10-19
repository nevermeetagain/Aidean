# TASK-091：PG16 真库验证：空库迁移重放 + persistPrices 三次写价 + 收藏唯一约束（证据产出，不改代码）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.9.0 状态：**未开工**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-089 移出卡集

> 历史（V0.4.0→V0.5.0）：V0.7.0 新增

## 归属
- 所属切片：S1（价格历史唯一约束修复（数据完整性，已确认缺陷））
- 来源需求：REQ-F-019 / REQ-NF-（迁移可重放）
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-019
- 来源方案：ADR-P003

## 目标
补齐 PG16 真库证据中 Hark 未覆盖的部分：收藏唯一约束（favorites @@unique(userId,refType,refId)）真库断言 + `\d model_prices` 部分唯一索引截图；迁移重放与 persistPrices 三次写价已由 Hark 在 PG16.14 实测（EVD-058/migrate-deploy-empty.txt、EVD-089/int-spec-gate-matrix.txt）

## 输入
- 文档：`docs/任务规划V0.9.0/03_solution/decisions/ADR-P003-价格当前行部分唯一索引.md`
- 契约：`无`
- 前置任务：无
- 前置状态：TASK-089 已合并

## 输出
- 新增/修改的文件路径：
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-091/favorites.txt`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-091/model_prices.txt`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-091/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=p postgres:16`（或 embedded PG16）；`export PG16_URL=...`；`DATABASE_URL=$PG16_URL pnpm --filter web exec prisma migrate deploy`
2. [ ] 收藏唯一约束真库断言：同一 (userId, refType, refId) 第二次 insert 得 23505/P2002；POST /api/v1/user/favorites 幂等返回既有记录（可用 vitest int spec，RUN_DB_TESTS=1 门控，输出存 EVD-091/favorites.txt）
3. [ ] `psql $PG16_URL -c "\d model_prices"` 输出存 EVD-091/model_prices.txt（应见 WHERE is_current 部分唯一索引）
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 收藏重复插入被唯一约束拒绝（输出含 23505 或 P2002）且无 skipped
- [ ] \d 输出含 `WHERE is_current`
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
test -n "$PG16_URL" || { echo PG16_URL_missing; exit 2; }; grep -Eq '23505|P2002' docs/任务规划V0.9.0/06_validation/evidence/EVD-091/favorites.txt && grep -q 'WHERE is_current' docs/任务规划V0.9.0/06_validation/evidence/EVD-091/model_prices.txt; echo exit=$?
```

## 证据路径
`docs/任务规划V0.9.0/06_validation/evidence/EVD-091/`

## 允许修改
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-091/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-086
- 阻塞条件：无 Docker/PG16 → 记 UNKNOWN，不得写 PASS

## 建议执行档位
sonnect　理由：按命令执行并留证，无设计决策

## 升级条件
迁移重放失败 → 升 opus 判定是否叠加遗漏迁移；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 1h　<2h
