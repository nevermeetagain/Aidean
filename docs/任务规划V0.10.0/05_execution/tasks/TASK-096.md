# TASK-096：限时优惠写侧加固：开放式窗口重叠、PATCH 强制 isCurrent=false 与计费口径复核、事务内校验+写入、整数位上限

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus**

> V0.10.0 状态：**未开工（Hark 核心）**｜V0.10.0 新增

> 历史（V0.4.0→V0.5.0）：V0.10.0 新增（review-ext12 D2/D3/D10/D11）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-038 / REQ-F-063
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-038
- 来源方案：DESIGN-002；review-ext12 D2/D3/D10/D11

## 目标
POST/PATCH /api/v1/admin/prices/promotions[/:id] 对任何既有优惠（含 effectiveUntil=null）窗口重叠一律 40000；PATCH 写入恒 isCurrent=false、sourceType=PROMOTION，且计费三元组与当前价不一致时 40000；重叠检查与写入在同一事务（按 modelId 加 pg_advisory_xact_lock）；整数位 >13 → 40000 而非 500

## 输入
- 文档：`docs/任务规划V0.10.0/03_solution/design/DESIGN-002-限时优惠计费.md`；`docs/任务规划V0.9.0/06_validation/evidence/EVD-028/`
- 契约：`PromotionPriceCreateSchema`；`PromotionPricePatchSchema`
- 前置任务：TASK-095
- 前置状态：TASK-028 已合并（V0.9.0 外部完成）

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/api/v1/admin/prices/promotions/route.ts`
  - `apps/web/app/api/v1/admin/prices/promotions/[id]/route.ts`
  - `apps/web/lib/features/auth/__tests__/admin-promotions.spec.ts`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-096/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 抽出共用校验：scale ≤6、整数位 ≤13、窗口 from<until
2. [ ] 重叠条件改为 effectiveFrom < until AND (effectiveUntil IS NULL OR effectiveUntil > from)，PATCH 排除自身
3. [ ] $transaction 内 advisory lock(modelId) → 重叠检查 → 写入
4. [ ] PATCH data 恒带 isCurrent=false/sourceType=PROMOTION；复核计费三元组
5. [ ] 单测：开放式窗口重叠、PATCH 修复脏行、整数位超限 40000、并发两写只成功一条（mock 事务顺序）
6. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] admin-promotions 单测全绿且新增 ≥5 例
- [ ] web tsc exit 0
- [ ] `node scripts/check-docs-facts.mjs` exit 0
- [ ] diff 仅落在允许范围
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-promotions.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-096/`

## 允许修改
- `apps/web/app/api/v1/admin/prices/promotions/`
- `apps/web/lib/features/auth/__tests__/admin-promotions.spec.ts`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-096/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-095
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-097
- 阻塞条件：需改契约或加 DB 排他约束（迁移）→ 停，提 ADR

## 建议执行档位
opus　理由：资金路径：优惠窗口与计费口径决定扣费

## 升级条件
并发语义需迁移级约束 → opus 券；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h
