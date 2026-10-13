# EVD-BASELINE · 规划阶段基线取证

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）——HEAD 77c7952，沙箱 Node v22.23.3 / pnpm 9.0.0，无 PG/Redis

| # | 命令 | 退出码 | 关键结果 |
|---|---|---|---|
| 1 | `git pull` | 0 | Already up to date |
| 2 | `corepack enable && pnpm install --frozen-lockfile` | 124→0 | 首轮 115s 超时；重跑 37.7s 成功（prisma generate 完成） |
| 3 | `node scripts/check-docs-rule.mjs` | 0 | PASS（model=68/enum=37/域=36/页=32） |
| 4 | `node scripts/check-docs-facts.mjs` | 0 | 14/14 PASS |
| 5 | `pnpm --filter @aidean/shared exec tsc --noEmit` | 0 | 8.1s |
| 6 | `pnpm --filter web exec tsc --noEmit` | 0 | 24.9s |
| 7 | `pnpm --filter @aidean/shared test` | 0 | 12 files / 118 tests |
| 8 | `pnpm --filter web test` | 0 | 112 files / 1081 tests，65.2s |
| 9 | `pnpm --filter @aidean/ui exec vitest run` | 0 | 1 file / 4 tests |
| 10 | `pnpm --filter web lint` | 0 | 0 error / 1 warning（SafeImage.tsx:19） |
| 11 | `cd apps/web && npx next build` | 124→0 | 首轮超时；次轮 87.9s 成功（route-sizes.txt） |
| 12 | `npx prisma validate` | 0 | valid |
| 13 | `npx playwright test --list --config playwright.config.ts` / `--config e2e/playwright.config.ts` | 0 | 138 tests/26 files；64 tests/14 files |
| 14 | `next start -p 3000` + `curl -w %{time_starttransfer}` ×3 | — | `/` 44.7/13.2/12.4ms；`/models` 50.5/3.4/2.9ms；`/login` 176.1/1.1/1.1ms；`/api/v1/ladder?type=models` 500（无库）；`/api/v1/system/health` 200（无库亦 200） |
| 15 | `tsc -p contracts/tsconfig.json` + `tsx selfcheck.ts` | 0 | `{"total":25,"web":22,"dup":[],"mism":0,"missingPres":[],"failurePaths":13}` |

原始输出摘录：`raw-tails.txt`；页面体积表：`route-sizes.txt`。
