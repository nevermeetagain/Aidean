# TASK-048：生效价解析器接入币种/单位归一（网关扣费与读侧同口径）

> **2026-10-20 完成（Hark）**：汇率改读日汇率快照 getDailyFx（取代卡体 pricing.fxUsdCny，见 ADR-P005 v0.3/v0.4）；存量单位按 EVD-049 订正（迁移 20261020010000）；并入 U-23 免费模型跳过余额校验。证据 EVD-048。

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus** ｜ **条件卡：待 U-15（汇率口径）裁决后下发**

> V0.10.0 状态：**条件·待裁决**｜V0.10.0：条件卡，待 U-15 裁决

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-02b / REQ-F-07 计费公式
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-011
- 来源方案：ADR-P005 / DESIGN-003

## 目标
resolveEffectivePrice 返回的 priceInput/priceOutput 一律为 CNY/百万 Token（USD 行按 pricing.fxUsdCny 换算、per_1k 行 ×1000），网关 PLATFORM 预扣与结算、/api/v1/models/[id]、pricing 读侧全部消费归一后的价格；无法归一的价格行使该候选被跳过（降级链继续）

## 输入
- 文档：`03_solution/design/DESIGN-003-生效价解析器.md`；`docs/architecture/网关计费时序契约.md`
- 契约：`EffectivePriceSchema（v0.2）`；`PRICE_NORMALIZATION`
- 前置任务：TASK-047
- 前置状态：TASK-027、TASK-047 已合并；U-15 已裁决；TASK-049 盘点结果已入证据（存量 USD/per_1k 行数），且人工抽样确认 USD 行为美元原价（ADR-P005 反证排除）

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/features/pricing/effective-price.ts`
  - `apps/web/lib/features/pricing/__tests__/effective-price-normalization.spec.ts`
  - `apps/web/lib/features/gateway/service.ts（限定改动）`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-048/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 解析器读取 billingCurrency/billingUnit 并调用 normalizeUnitPrice
2. [ ] 汇率读 SystemConfig pricing.fxUsdCny（经 shared PRICING_CONFIG_KEYS；缺失 → 视为不可归一，候选跳过并记 warn 日志）
3. [ ] 单测：USD per_million / CNY per_1k / 未知币种 / 汇率缺失 四路径 + 网关预扣金额断言
4. [ ] 回归 gateway 全部 __tests__
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 新增单测 ≥8 例全绿
- [ ] `pnpm --filter web exec vitest run lib/features/gateway lib/features/pricing` 全绿
- [ ] USD 1.00/M、fx=F 时扣费基准 = F 元/M（表驱动断言）
- [ ] R9-01：无价模型在 PLATFORM 路径不得按 0 放行（不可归一/无价 = skip-candidate，降级链耗尽 → 30002）
- [ ] R9-03：service 的请求时刻 now 传入 repository（findModelByCode/findModelsByIds 的 at 参数），预扣与结算同一生效价
- [ ] R9-04：优惠行与当前价的币种/单位一律经归一后计费（不再按 ¥/M 原样相乘）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/pricing lib/features/gateway && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-048/`

## 允许修改
- `apps/web/lib/features/pricing/**`
- `apps/web/lib/features/gateway/service.ts（仅限：resolveRouteChain 把请求时刻 now 传给 repository 的 at 参数；无价/不可归一候选 skip-candidate。计费公式与加价率/倍率乘法不得改）`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-048/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/lib/features/billing/**`
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-047
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-053, TASK-080
- 阻塞条件：U-15 未裁决 → 不执行（条件卡）；需改 gateway/service.ts 允许范围之外的逻辑（计费公式、加价率/倍率、预扣/结算流程）→ 停止回报

## 建议执行档位
opus　理由：资金路径：改变实际扣费金额

## 升级条件
资金回归任一失败 → 立即回滚并重写任务书；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 8h　≥2h
