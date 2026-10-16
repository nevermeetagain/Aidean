# EVD-BASELINE-V4 · V0.4.0 规划期取证

> 版本: v0.4 | 更新: 2026-10-14 | 变更: 首次落档——main@bfb3aef（业务树 = 77c7952），Node v22.23.3 / pnpm 9，无 PG/Redis/Docker

| # | 命令 | 退出码 | 关键结果 | 文件 |
|---|---|---|---|---|
| 1 | `git pull` | 0 | Already up to date；HEAD bfb3aef | 01 |
| 2 | `git diff --stat 77c7952 HEAD -- . ':!docs'` | 0 | 空（0 行）→ 无代码 delta | codediff.txt |
| 3 | `node scripts/check-docs-rule.mjs` | 0 | PASS | docsrule.txt |
| 4 | `node scripts/check-docs-facts.mjs` | 0 | 14/14 | docsfacts.txt |
| 5 | `DATABASE_URL=postgresql://u:p@localhost:5432/x npx prisma validate` | 0 | valid | prisma.txt |
| 6 | `pnpm --filter web exec tsc --noEmit` | 0 | 48s | tsc-web.txt |
| 7 | `timeout 115 pnpm --filter web test` | 0 | 112 files / 1081 tests，107s | test-web.txt |
| 8 | `tsc -p contracts/tsconfig.json`；`tsx selfcheck-monitoring.ts`；`tsx selfcheck.ts` | 0/0/0 | collisions=[]；mism=0 | contracts-selfcheck.txt |
| 9 | PGlite 0.2 执行 database/002_monitoring.sql + 约束探针 | 0 | 4 表；23505×2；23514 | pglite-m002.txt |
| 10 | curl 外部端点探针（10 个）+ python 统计 | — | 见文件（含 fetched_at） | probes.txt |
| 11 | `python3 _generator/gen.py && gen_rtm.py && gen_outline.py` | 0 | 73 卡；无环；越权 0；重叠 0；冻结前置 ✅；RTM 99 条、孤儿 0、缺口 0 | 08/09/10/03a/20 |
| 12 | 写盘后复跑 docs 门禁 | 0 | 见 13 | 13 |
