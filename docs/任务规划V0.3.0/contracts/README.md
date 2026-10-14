# contracts/ · 冻结契约稿

> 版本: v0.2 | 更新: 2026-10-14 | 变更: V0.2.0 复核沿用 V0.1.0 冻结稿

| 文件 | 契约 | 落地目标（唯一源） | 落地任务 |
|---|---|---|---|
| `01-api.contract.ts` | ① API（12 端点 + 分页/幂等/时间/金额口径） | `packages/shared/src/schemas/{system,feature-flags,favorites,promotion,search}.schema.ts` + admin.schema.ts 扩展 | TASK-001/014/021/026/032/044 |
| `02-errors.contract.ts` | ② Errors（25 码 + HTTP 映射 + 展示策略 + 失败路径覆盖） | `packages/shared/src/errors.ts` | TASK-001 |
| `03-identity.contract.ts` | ③ Identity（角色/等级/JWT/权限码/越权禁止清单） | 现行代码固化，无新增；由 TASK-004 生成断言 | TASK-004 |
| `04-resources.contract.ts` | ④ Resources（URL 规则/上传面/生命周期） | 现行代码固化 | — |
| `05-events.contract.ts` | ⑤ Events（缓存标签/back-channel/调度/幂等键） | 新增 `feature-flags` 标签 | TASK-015/016 |
| `06-ux-states.contract.ts` | ⑥ UX States（7 界面五态 + testid） | UI 卡与 e2e 卡共同遵守 | TASK-018/023/029/034 |
| `selfcheck.ts` + `tsconfig.json` | 自检脚本（冻结稿 vs 运行时码表一致性） | — | 规划阶段已运行 |

规则：
1. 本目录在任务实施期间**只读**（所有任务卡「禁止修改」含此路径）。改动必须先提 ADR，并消耗 fable 券（推翻已冻结契约）。
2. 落地任务须「原样落地」；若发现冻结稿本身有错，停止并上报，不得在实现中静默修正。
3. 落地合并后，以 `packages/shared` 为准；本目录仅作历史与审计参考。

**V0.2.0 变更（相对 V0.1.0 冻结稿）**：① `EffectivePriceSchema` 增 currency/unit/source*/fxRate 七字段 + `PRICE_NORMALIZATION` + `FxConfigSchema`（TASK-047）；② `FAILURE_PATHS` 增「价格不可归一」→ 30002（码表 25 码不变）；⑤ `FX_CONFIG_CHANGE`；⑥ `PRICING_CURRENCY_DISPLAY`。③④ 无变化。规划期自检：tsc exit 0，selfcheck `mism=0, dup=[], failurePaths=14`。

运行自检：

```bash
cd "docs/任务规划V0.2.0/contracts"
../../../node_modules/.bin/tsc -p tsconfig.json
../../../apps/web/node_modules/.bin/tsx --tsconfig tsconfig.json selfcheck.ts
```
