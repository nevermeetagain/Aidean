# EVD-BASELINE-V2 · 规划期基线取证

> 版本: v0.2 | 更新: 2026-10-14 | 变更: 首次落档（任务规划V0.2.0）——main@59e83dd（代码树 = 77c7952），沙箱 Node v22.23.3 / pnpm 9.0.0，无 PG/Redis/Docker

| # | 命令 | 退出码 | 关键结果 | 原始输出 |
|---|---|---|---|---|
| 1 | `git pull`；`git fetch`；`git ls-remote origin` | 0 | Already up to date；HEAD 59e83dd，origin/main 77c7952（远端缺 V0.1.0 提交） | 01_规划快照.md |
| 2 | `corepack enable` | 1 | EACCES symlink /usr/bin/yarn | install.txt（首行之前的尝试，见 01） |
| 3 | `corepack enable --install-directory ~/bin && pnpm install --frozen-lockfile` | 0 | Done in 48.4s | install.txt |
| 4 | `node scripts/check-docs-rule.mjs` | 0 | PASS | docsrule.txt |
| 5 | `node scripts/check-docs-facts.mjs` | 0 | 14/14 | docsfacts.txt |
| 6 | `cd apps/web && npx prisma validate` | 1 | P1012 DATABASE_URL 未设置 | （见 prisma.txt 前次） |
| 7 | `DATABASE_URL=postgresql://u:p@localhost:5432/x npx prisma validate` | 0 | valid | prisma.txt |
| 8 | `pnpm --filter @aidean/shared exec tsc --noEmit` | 0 | 18.0s | tsc-shared.txt |
| 9 | `pnpm --filter web exec tsc --noEmit` | 0 | 48.6s | tsc-web.txt |
| 10 | `pnpm --filter @aidean/shared test` | 0 | 12 files / 118 tests | test-shared.txt |
| 11 | `timeout 115 pnpm --filter web test` | 0 | 112 files / 1081 tests | test-web.txt |
| 12 | `pnpm --filter @aidean/ui exec vitest run` | 0 | 4 tests | test-ui.txt |
| 13 | `pnpm --filter web lint` | 0 | 0 error / 1 warning | lint.txt |
| 14 | `cd apps/web && npx next build` | 0 | 29 静态页；First Load shared 99.3 kB | build.txt |
| 15 | `npx playwright test --list --config playwright.config.ts` / `--config e2e/playwright.config.ts` | 0 | 138/26；64/14 | pw-root.txt / pw-sub.txt |
| 16 | `PORT= npx next start -p 3000` + curl ×3 | — | 见 latency.txt；ladder API 500（无库）；health 200（无库） | latency.txt |
| 17 | `node replay.mjs`（PGlite 0.2 / PG16.4，`npm i @electric-sql/pglite@0.2`） | 0 | 16/16 迁移 OK，68 基表 | pglite-replay.txt |
| 18 | `node repro.mjs` | 0 | 第 2/3 次写价 23505；同批 2 current 23505；OFFICIAL+PROMOTION current 23505 | pglite-repro-p2002.txt |
| 19 | `node verify-m001.mjs`（读 database/001_init.sql） | 0 | 三次写价 OK；current=1；PROMOTION(is_current=false) 并存 OK；同批 2 current 仍 23505 | pglite-verify-m001.txt |
| 20 | `tsc -p contracts/tsconfig.json && tsx selfcheck.ts` | 0 | total 25 / web 22 / mism 0 / failurePaths 14 | contracts-selfcheck.txt |
| 21 | `git ls-remote https://github.com/{aideanew/BotHot,nevermeetagain/AideanThesis,aideanew/AideanFleet,aideanew/AideanBot}` + 浅克隆读 AGENTS.md | 0/0/0/128 | 前三可访问；AideanBot not found | ADR-P006 |
| 22 | `python3 _generator/gen.py && python3 _generator/gen_rtm.py` | 0 | 55 卡；无环；越权 0；规则重叠 0；冻结前置 ✅；依赖合法性 ✅；RTM 83 条，孤儿卡 0、缺口 0 | 08/09/10/03a |
