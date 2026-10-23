#!/usr/bin/env bash
# 契约草案自检：tsc --strict 解析 + selfcheck 8 条正/反例（需已 pnpm install）。
set -euo pipefail
R="$(git rev-parse --show-toplevel)"; T="$R/packages/shared/.tmp-v120"
rm -rf "$T"; mkdir -p "$T"; cp "$R"/docs/任务规划V0.12.0/contracts/*.ts "$T"/
( cd "$R/packages/shared" && npx tsc --noEmit --strict --skipLibCheck --moduleResolution bundler --module esnext --target es2022 $(ls "$T"/*.contract.ts) )
"$R/apps/web/node_modules/.bin/tsx" "$T/selfcheck.ts"
rm -rf "$T"
