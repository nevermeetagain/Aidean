# EVD-038：单测覆盖率基线（web/shared，不设阈值）

> 版本: v1.0 | 更新: 2026-10-19 | 变更: TASK-038 首次测量（REQ-NF-008 / SOL-S6 / §9.1 基线指标）

关联卡：`docs/任务规划V0.9.0/05_execution/tasks/TASK-038.md`

## 1. 目的与方法

引入与 vitest 主版本匹配的 `@vitest/coverage-v8` 作为 devDependency，产出 web/shared 行/分支覆盖率**首次基线测量值**；仅上报、不设阈值（`no thresholds`）。

- web vitest 实测 **2.1.9**（package.json `^2.1.9`）→ 装 `@vitest/coverage-v8@2.1.9`
- shared vitest 实测 **3.2.7**（package.json `^3.2.4`）→ 装 `@vitest/coverage-v8@3.2.7`
- 两端精确版本号取自 `pnpm-lock.yaml` 实测已装 vitest 版本，避免主版本错配。

## 2. 实测覆盖率（v8 provider，text-summary）

### 2.1 apps/web（口径=lib 单元面，见勘误②）

| 指标 | 百分比 | 绝对值（覆盖/总） |
| --- | --- | --- |
| Statements | 66.56% | 7996 / 12012 |
| Branches | 79.81% | 2290 / 2869 |
| Functions | 76.06% | 502 / 660 |
| Lines | 66.56% | 7996 / 12012 |

> 上值对齐本目录入库的原始 `vitest-coverage-output.txt`。web **Branches** 绝对分母在多次运行间有 ±1 非确定性抖动（v8 对异步/时序相关分支的插值），实测在 79.81%（2290/2869）～79.82%（2291/2870）之间浮动；其余指标（Statements/Lines/Functions）稳定。shared 全指标稳定。

命令：`pnpm --filter web exec vitest run --coverage` → `WEB_COV_EXIT=0`
测试总数（启用覆盖率）：**1210 passed | 5 skipped（1215 文件计 125 passed | 2 skipped）**

### 2.2 packages/shared

| 指标 | 百分比 | 绝对值（覆盖/总） |
| --- | --- | --- |
| Statements | 92.65% | 2284 / 2465 |
| Branches | 77.91% | 194 / 249 |
| Functions | 57.14% | 36 / 63 |
| Lines | 92.65% | 2284 / 2465 |

命令：`pnpm --filter @aidean/shared exec vitest run --coverage ...` → `SHARED_COV_EXIT=0`
测试总数（启用覆盖率）：**210 passed（21 文件）**

## 3. 验收对照（卡面 L42–L44）

| 卡面验收 | 实测 | 结论 |
| --- | --- | --- |
| `pnpm --filter web exec vitest run --coverage` exit 0 且输出 Lines/Branches 百分比 | exit=0；Lines 66.56%、Branches 79.81%（±0.01% 抖动，见 2.1 注） | ✅ |
| 测试总数不变 | 启用 --coverage 前后：web 1210 passed\|5 skipped(1215)、shared 210 passed，与 plain `verify.sh` 一致 | ✅（详见勘误①） |
| diff 仅落允许范围（`git diff --name-only` 逐行核对） | 恰 4 文件：`apps/web/vitest.config.ts`、`apps/web/package.json`、`packages/shared/package.json`、`pnpm-lock.yaml`；另 2 个 `*.generated.spec.ts` 为 EOL 幻影，不入库 | ✅ |

回归四连（plain，`verify.sh`）：SHARED_TSC=0 / SHARED_TEST=0(210 passed) / WEB_TSC=0 / WEB_TEST=0(1210 passed|5 skipped)。
文档两门：RULE_EXIT=0（72/37/33/Next 15.0.x）、FACTS_EXIT=0（14/14）——本卡纯配置，无文档/计数漂移。

## 4. 勘误与口径说明

- **①「测试总数不变（1081）」**：1081 为卡面 V0.5.0 沿用旧基线数。实测 web 单测为 **1210 passed | 5 skipped（合计 1215）**、shared **210 passed**（历经 S1–S3/090/009/025 等增长）。本卡验收意图为「启用覆盖率不改变测试总数」——`verify.sh`（plain）与 `measure.sh`（--coverage）两侧总数完全一致，故意图满足；具体数字以实测为准。
- **②web 基线口径**：`apps/web/vitest.config.ts` 的 `test.include` 限定为 `lib/**/*.spec.ts`，故 `coverage.include=["lib/**"]`、`all:true`。web 覆盖率基线代表「web 单测实际覆盖的 lib 单元面」，**非全 app**（页面/路由未纳入单测计量）。此口径与卡「web/shared 单测覆盖率基线」一致。
- **③「CI 只上报不卡阈值」**：coverage 段刻意不含 `thresholds`，`vitest run`（默认）不启用覆盖率、仅 `--coverage` 时产出 → 天然不卡阈值。`.github/workflows/ci.yml` 不在本卡允许路径，故 CI 上报 wiring 不改；本地/按需 `--coverage` 已满足「只上报」。

## 5. 复现命令

```bash
# 前置：注入占位 DATABASE_URL（web 单测含 DB-less 路径，用占位串即可）
export DATABASE_URL='postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public'
# web（报告默认写 apps/web/coverage/；本证据为保持受控树干净，用 .scratch 重定向）
pnpm --filter web exec vitest run --coverage --coverage.reportsDirectory=../../.scratch/038/coverage-web
# shared（无 vitest.config，靠 CLI flag 配 provider/reporter）
pnpm --filter @aidean/shared exec vitest run --coverage --coverage.provider=v8 --coverage.reporter=text-summary --coverage.reporter=json-summary --coverage.reportsDirectory=../../.scratch/038/coverage-shared --coverage.include='src/**' --coverage.exclude='src/__tests__/**'
```

原始 text-summary 与 `coverage-summary.json` 落于 `.scratch/038/coverage-{web,shared}/`（`.scratch/` 已 gitignore，不入受控树）。
