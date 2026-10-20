# EVD-101 偏离说明

1. **单测不在 `pnpm --filter web test` 内**：卡面指定 `scripts/crawl/__tests__/fx_daily.spec.ts`，而 web vitest 配置 `include: ["lib/**/*.spec.ts"]`（apps/web/vitest.config.ts，非本线文件）。本卡以 `vitest run --root ../..` 单独运行（15/15，verify.txt）。如需纳入全局门禁，**需要改 apps/web/vitest.config.ts 的 include**（不在本卡允许范围）。spec-count 断言只统计 e2e/ 与 apps/web/，本 spec 不计入，`check-docs-facts.mjs` 未改。
2. **真 PG16**：用 `/workspace/work/pg16` 的 embedded-postgres 16.14 起独立实例（127.0.0.1:55471，库 aidean_ci），`prisma migrate deploy` 全量迁移后实跑；源真实联网拉取 Frankfurter（免费、无 Key，非付费外网调用）。结果见 pg16-run.txt：首跑写 1 行、同日重跑幂等（未再拉源、count=1）、源 422 → exit 1 未写库；TASK-047 `getDailyFx` 读到同一行（stale=false）。
3. **同日已有快照时不再拉源**：卡面「同一天重复运行不产生第二条」，实现取更严口径——当日已有行则直接返回 exists，不改写当日值（「每天只用一个汇率」，避免同一天计费前后汇率不同）；并发竞争由唯一键 `ON CONFLICT DO NOTHING` 兜底。
4. **合理区间 [1, 20]**：卡面「非法数值拒绝」。除 ≤0/NaN/缺失外，USD/CNY 越出 [1,20] 视为错位数据（如倒数 0.15、单位错 667）拒绝；常量 `FX_SANE_RANGE` 可调。
5. **rate_date 取采集时刻的 Asia/Shanghai 自然日**（`fxDateOf`，与读侧同口径），不取源返回的 `date`（ECB 等源周末不更新，源日期可能早于当日）；源日期仅打印留痕。
6. task-index：原表无 101 行，按「只追加本卡行」在表尾追加。
