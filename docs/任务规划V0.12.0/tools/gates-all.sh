#!/usr/bin/env bash
# V0.12.0 全部门禁一次跑（T120-36 使用；任何卡推送前可跑子集）。用法：bash docs/任务规划V0.12.0/tools/gates-all.sh
# 需要：DATABASE_URL 指向测试库（非生产）；dev/e2e 端口 3000 空闲。任一步失败即停并打印步骤名。
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
step(){ echo "== $1"; shift; "$@" || { echo "FAIL: $*"; exit 1; }; }
step tsc        pnpm -C apps/web exec tsc --noEmit --incremental false
step lint       pnpm -C apps/web lint
step vitest-web pnpm -C apps/web exec vitest run
step vitest-pkg pnpm -r --filter ./packages/** exec vitest run
step test-int   pnpm -C apps/web test:int
step guards     node scripts/guard/run-all.mjs
step docs-rule  node scripts/check-docs-rule.mjs
step docs-facts node scripts/check-docs-facts.mjs
step build      pnpm -C apps/web build
step e2e        pnpm exec playwright test -c playwright.config.ts --reporter=line
step palette    node scripts/guard/raw-palette.mjs
step admin-ui   node scripts/audit/admin-ui-audit.mjs
echo "ALL GATES PASS @ $(git rev-parse --short HEAD)"
