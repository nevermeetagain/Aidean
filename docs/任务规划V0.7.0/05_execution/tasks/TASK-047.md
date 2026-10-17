# TASK-047：计价口径归一契约：币种 CNY + 每百万 Token + 汇率配置键（EffectivePrice 扩展）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**opus** ｜ **条件卡：待 U-15（汇率口径）裁决后下发**

> V0.7.0 状态：**条件·待裁决**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；条件卡，待 U-15 裁决；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-20 与 055 调换：契约 registry 先

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-02b 价格统一 ¥/M Tokens 与 ¥5=$1 换算（需求文档 §3.2）/ REQ-C-03 价格透明
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-011
- 来源方案：ADR-P005 / DESIGN-003

## 目标
packages/shared/src/schemas/promotion.schema.ts 的 EffectivePriceSchema 增加 currency='CNY'、unit='per_million_tokens'、sourceCurrency、sourceUnit、fxRate 字段，并导出 PRICE_NORMALIZATION 常量与 normalizeUnitPrice 纯函数；shared 单测覆盖 CNY/USD × per_1k/per_million 四象限

## 输入
- 文档：`contracts/01-api.contract.ts §S4 PRICE_NORMALIZATION`；`03_solution/decisions/ADR-P005-计价口径归一.md`
- 契约：`EffectivePriceSchema（v0.2 扩展）`；`PRICE_NORMALIZATION`；`normalizeUnitPrice`
- 前置任务：TASK-026
- 前置状态：TASK-026、TASK-055 已合并；U-15（汇率口径）已裁决

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/schemas/promotion.schema.ts`
  - `packages/shared/src/utils/price-normalization.ts（新建）`
  - `packages/shared/src/constants/admin-config.constants.ts（registry 增 pricing.fxUsdCny）`
  - `packages/shared/src/utils/pricing-config.ts（PRICING_CONFIG_KEYS 增 fxUsdCny）`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/__tests__/price-normalization.spec.ts（新建）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-047/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 按冻结稿落地 PRICE_NORMALIZATION（目标币种 CNY、目标单位 per_million_tokens、配置键 pricing.fxUsdCny）
2. [ ] normalizeUnitPrice(value, currency, unit, fx)：per_1k×1000；USD×fx；未知币种抛错（调用方 fail-closed）
3. [ ] EffectivePriceSchema 扩展字段
4. [ ] ADMIN_CONFIG_REGISTRY 增 pricing.fxUsdCny（valueRule >0，defaultValue = TASK-055 种子值），使后台 PUT /api/v1/admin/configs 白名单可写
5. [ ] 单测四象限 + 未知币种 + fx<=0 拒绝
6. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter @aidean/shared test` 全绿且新增 ≥6 例
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit` 0
- [ ] price-normalization.ts 无硬编码汇率数值（汇率只来自参数）
- [ ] `pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-config-seed-parity.spec.ts` 通过（registry 与 seed 一致）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-047/`

## 允许修改
- `packages/shared/src/schemas/promotion.schema.ts`
- `packages/shared/src/utils/price-normalization.ts`
- `packages/shared/src/constants/admin-config.constants.ts`
- `packages/shared/src/utils/pricing-config.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/__tests__/price-normalization.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-047/**`

## 禁止修改
- `apps/**`
- `packages/shared/src/utils/billing.ts（calcCharge 不动）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-026
- 资源锁串行（同文件，须在其后执行）：TASK-056, TASK-082
- Blocks：TASK-048, TASK-055
- 阻塞条件：U-15 未裁决 → 不执行（条件卡）；需要改 calcCharge 的签名或精度 → 停止，升 fable

## 建议执行档位
opus　理由：资金路径契约语义（币种/单位），不可逆度高

## 升级条件
与 provider-pricing.ts 既有展示口径冲突 → 升 opus 仲裁；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h
