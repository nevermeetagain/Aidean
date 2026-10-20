# EVD-037：e2e 配置口径收敛基线表

> 卡片：TASK-037 | 执行：助手 C | 日期：2026-10-20

## 1. 收敛前

- 根配置 `playwright.config.ts`：**150 tests / 30 files**
  - 分 project：admin 74 / admin-setup 1 / smoke 7 / web 68
- 子配置 `e2e/playwright.config.ts`：**68 tests / 15 files**（全部位于 `e2e/tests`）
- 交集：`e2e/tests/smoke.spec.ts` = **7 tests**（根配置 smoke project 已覆盖）
- 去重并集：**150 + 68 − 7 = 211 tests**；文件 **30 + 15 − 1 = 44 files**

## 2. 收敛后

- 根配置：**211 tests / 44 files**
  - 分 project：admin 74 / admin-setup 1 / flows 61 / smoke 7 / web 68
- 兼容壳 `e2e/playwright.config.ts`（re-export）：**211 tests / 44 files**，与根配置一致

## 3. `e2e/tests` 逐文件对账

| 文件 | 收敛前（子配置） | 收敛后（flows） | 对账 |
|---|---:|---:|---|
| `tests/auth-guard.spec.ts` | 3 | 3 | 一致 |
| `tests/billing-flow.spec.ts` | 2 | 2 | 一致 |
| `tests/console-flow-gradient.spec.ts` | 2 | 2 | 一致 |
| `tests/console-regression.spec.ts` | 4 | 4 | 一致 |
| `tests/fe01-console-call.spec.ts` | 6 | 6 | 一致 |
| `tests/g6-evaluations.spec.ts` | 9 | 9 | 一致 |
| `tests/g6-openapi-keys.spec.ts` | 9 | 9 | 一致 |
| `tests/gateway-flow.spec.ts` | 2 | 2 | 一致 |
| `tests/header-links.spec.ts` | 1 | 1 | 一致 |
| `tests/ladder-filter-all.spec.ts` | 4 | 4 | 一致 |
| `tests/ladder-matrix.spec.ts` | 4 | 4 | 一致 |
| `tests/model-provenance.spec.ts` | 3 | 3 | 一致 |
| `tests/smoke.spec.ts` | 7 | 0 | 由 smoke project 承载（flows 明确排除，避免重复） |
| `tests/theme-switch.spec.ts` | 1 | 1 | 一致 |
| `tests/zcode-audit.spec.ts` | 11 | 11 | 一致 |

合计：收敛前 68；收敛后 flows 61；smoke 差 7（转入 smoke project，未丢失）。

## 4. 结论

- 根配置 `--list` 总数 211 = 收敛前去重并集 211，无丢失、无重复。
- `flows` project = 旧子配置 68 − smoke 7 = 61。
- `pnpm test:e2e` 已指向根配置；CI e2e job 显式带 `--config playwright.config.ts`。

