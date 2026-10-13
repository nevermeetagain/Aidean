# TASK-027：生效价解析服务 + 网关计费/前台展示接入

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus**

## 归属
- 所属切片：S4（限时优惠计费生效（需求 §3.6））
- 来源需求：REQ-F-12 / REQ-F-07 计费公式
- 来源方案：DESIGN-002

## 目标
resolveEffectivePrice(modelId, at) 实现契约生效规则；网关 PLATFORM 计费基准价改用之（加价率/倍率仍在服务端内乘，不外泄）；/api/v1/models/[id] 与 pricing 读侧返回 EffectivePrice；单测覆盖窗口边界/免费/过期回落/无优惠

## 输入
- 文档：`docs/任务规划V0.1.0/03_solution/design/DESIGN-002-限时优惠计费.md`；`docs/architecture/网关计费时序契约.md`；`apps/web/lib/features/gateway/repository.ts:89,109（isCurrent 取价）`
- 契约：`EffectivePriceSchema`
- 前置任务：TASK-026, TASK-011
- 前置状态：TASK-026、TASK-011 已合并（部分唯一索引已上线，允许多条非 current 行）

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/features/pricing/effective-price.ts（新建）`
  - `apps/web/lib/features/pricing/__tests__/effective-price.spec.ts`
  - `apps/web/lib/features/gateway/repository.ts`
  - `apps/web/app/api/v1/models/[id]/route.ts`
  - `docs/任务规划V0.1.0/06_validation/evidence/EVD-027/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 查询：PROMOTION 且 effectiveFrom<=at<effectiveUntil 取最新；否则 isCurrent
2. [ ] gateway repository 两处取价改调用（保持原 Decimal 精度）
3. [ ] 读侧 DTO 增 isPromotion/promotionEndsAt/base*
4. [ ] 回归：gateway 既有 9 个 __tests__ 全绿
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] effective-price 单测 ≥8 例
- [ ] gateway __tests__ 全绿
- [ ] grep 断言 EffectivePrice 序列化不含 markup/multiplier（单测）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/pricing lib/features/gateway && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.1.0/06_validation/evidence/EVD-027/`

## 允许修改
- `apps/web/lib/features/pricing/**`
- `apps/web/lib/features/gateway/repository.ts`
- `apps/web/app/api/v1/models/[id]/route.ts`
- `docs/任务规划V0.1.0/06_validation/evidence/EVD-027/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/lib/features/billing/**（账务服务不动）`
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.1.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-026, TASK-011
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-029
- 阻塞条件：发现计费精度需改 Decimal→BigInt 口径 → 停止，升 opus 出 ADR

## 建议执行档位
opus　理由：资金路径（统一计费网关扣费），高风险

## 升级条件
资金回归任一失败 → 立即回滚并重写任务书；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 12h　≥2h
