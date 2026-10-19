# TASK-028：后台限时优惠端点 /api/v1/admin/prices/promotions（CRUD+窗口不重叠校验）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus**

> V0.9.0 状态：**未开工**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-026、TASK-011 移出卡集；V0.9.0 STEP-2 审查：真库探针证实优惠行误标 isCurrent=true 时过期后会被当当前价，解析器已防御（027），写侧须在本卡根治

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-18 契约名改为 PromotionPrice*（prices.promotions）；FIX-22 资金路径升 opus

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-12
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-038
- 来源方案：DESIGN-002

## 目标
GET/POST/PATCH/DELETE 按契约实现（PromotionPrice*（packages/shared/src/schemas/promotion.schema.ts）），同模型窗口重叠 → 40000，写审计并 revalidatePath('/pricing')；单测 ≥8 例

## 输入
- 文档：`contracts/01-api.contract.ts API-008..011`
- 契约：`PromotionPriceCreateSchema`；`PromotionPricePatchSchema`
- 前置任务：无
- 前置状态：TASK-026、TASK-011 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/api/v1/admin/prices/promotions/route.ts`
  - `apps/web/app/api/v1/admin/prices/promotions/[id]/route.ts`
  - `apps/web/lib/features/auth/__tests__/admin-promotions.spec.ts`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-028/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 写入 sourceType=PROMOTION, isCurrent=false
2. [ ] 重叠检测查询
3. [ ] DELETE 仅允许 PROMOTION 行
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 单测 ≥8 例全绿
- [ ] 尝试删除 OFFICIAL 行 → 40000
- [ ] 优惠行强制 is_current=false、source_type=PROMOTION（单测：请求体无法写入 isCurrent=true）
- [ ] effectiveUntil 必填且 > effectiveFrom；与同模型既有优惠窗口重叠 → 40000
- [ ] billingCurrency / billingUnit / billingMode 与该模型当前价一致，不一致 → 40000（防 R9-04 计费口径漂移）
- [ ] 价格字符串小数位 ≤ 6（Decimal(19,6) 静默舍入防护，E9-11）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-promotions.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.9.0/06_validation/evidence/EVD-028/`

## 允许修改
- `apps/web/app/api/v1/admin/prices/promotions/**`
- `apps/web/lib/features/auth/__tests__/admin-promotions.spec.ts`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-028/**`

## 禁止修改
- `apps/web/app/api/v1/admin/prices/route.ts`
- `apps/web/app/api/v1/admin/prices/[id]/**`
- `packages/shared/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-029, TASK-081
- 阻塞条件：无

## 建议执行档位
opus　理由：资金路径（优惠价直接影响扣费），按 10 号预算规则资金路径=opus

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h
