# TASK-028：后台限时优惠端点 /api/v1/admin/prices/promotions（CRUD+窗口不重叠校验）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus**

> V0.8.0 状态：**未开工**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：未开工）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-18 契约名改为 PromotionPrice*（prices.promotions）；FIX-22 资金路径升 opus

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-12
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-038
- 来源方案：DESIGN-002

## 目标
GET/POST/PATCH/DELETE 按契约实现（PromotionPrice*（packages/shared/src/schemas/promotion.schema.ts）），同模型窗口重叠 → 40000，写审计并 revalidatePath('/pricing')；单测 ≥8 例

## 输入
- 文档：`contracts/01-api.contract.ts API-008..011`
- 契约：`PromotionPriceCreateSchema`；`PromotionPricePatchSchema`
- 前置任务：TASK-026, TASK-011
- 前置状态：TASK-026、TASK-011 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/api/v1/admin/prices/promotions/route.ts`
  - `apps/web/app/api/v1/admin/prices/promotions/[id]/route.ts`
  - `apps/web/lib/features/auth/__tests__/admin-promotions.spec.ts`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-028/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 写入 sourceType=PROMOTION, isCurrent=false
2. [ ] 重叠检测查询
3. [ ] DELETE 仅允许 PROMOTION 行
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 单测 ≥8 例全绿
- [ ] 尝试删除 OFFICIAL 行 → 40000
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-promotions.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-028/`

## 允许修改
- `apps/web/app/api/v1/admin/prices/promotions/**`
- `apps/web/lib/features/auth/__tests__/admin-promotions.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-028/**`

## 禁止修改
- `apps/web/app/api/v1/admin/prices/route.ts`
- `apps/web/app/api/v1/admin/prices/[id]/**`
- `packages/shared/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-026, TASK-011
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-029, TASK-081
- 阻塞条件：无

## 建议执行档位
opus　理由：资金路径（优惠价直接影响扣费），按 10 号预算规则资金路径=opus

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h
