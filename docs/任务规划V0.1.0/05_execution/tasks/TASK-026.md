# TASK-026：限时优惠契约落地（PromotionPrice*/EffectivePrice）

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**opus**

## 归属
- 所属切片：S4（限时优惠计费生效（需求 §3.6））
- 来源需求：REQ-F-12 限时优惠（需求 §3.6）/ REQ-C-03 价格透明（§五.6）
- 来源方案：DESIGN-002

## 目标
packages/shared/src/schemas/promotion.schema.ts 落地，单测覆盖 until<=from 拒绝、价格非负字符串、EffectivePrice 不含 markup/multiplier 键

## 输入
- 文档：`contracts/01-api.contract.ts §S4`；`docs/任务规划V0.1.0/03_solution/design/DESIGN-002-限时优惠计费.md`
- 契约：`PromotionPriceCreateSchema`；`PromotionPricePatchSchema`；`EffectivePriceSchema`
- 前置任务：TASK-001
- 前置状态：TASK-001 已合并

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/schemas/promotion.schema.ts`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/__tests__/promotion.spec.ts`
  - `docs/任务规划V0.1.0/06_validation/evidence/EVD-026/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 原样落地
2. [ ] 单测含「EffectivePriceSchema.keyof() 不含 markupRate/tokenMultiplier」断言
3. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] shared tsc+test 全绿
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test
```

## 证据路径
`docs/任务规划V0.1.0/06_validation/evidence/EVD-026/`

## 允许修改
- `packages/shared/src/schemas/promotion.schema.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/__tests__/promotion.spec.ts`
- `docs/任务规划V0.1.0/06_validation/evidence/EVD-026/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.1.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-001
- 资源锁串行（同文件，须在其后执行）：TASK-014, TASK-021
- Blocks：TASK-027, TASK-028
- 阻塞条件：U-9 裁决优惠需叠加用户等级折扣 → 停止，修订 DESIGN-002

## 建议执行档位
opus　理由：计费口径契约，涉及价格透明与敏感字段一票否决

## 升级条件
需改既有价格契约 → 升 fable；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h
