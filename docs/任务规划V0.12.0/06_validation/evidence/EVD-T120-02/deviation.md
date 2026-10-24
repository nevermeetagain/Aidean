# T120-02 偏离记录（抄送 Hark）

1. 基线体积漂移：卡面「输入 baseline.md」记 middleware 163 kB（基于 main@3b9f88c）。本卡开工基线 main@58b75551，
   middleware.ts/constants.ts/next.config.mjs 自 3b9f88c 起零改动（git log 验证），但实测 ƒ Middleware=179 kB（传递依赖增长所致）。
   改后 85.5 kB，降幅与「< 163 kB」均成立，按卡面「（记录新值）」如实以 179→85.5 计。

2. setImmediate 警告来源：webpack `next build`（CI 与本机同口径）在基线即不在日志打印 setImmediate/Edge 警告，
   卡面验证 `! grep setImmediate buildlog` 改前改后皆过。但产物 `.next/server/middleware.js` 实测内嵌
   PrismaClient/query_engine/setImmediate（grep=12/2/1），故本卡以「产物含 Prisma → 产物不含（全 0）」为实质验收，强于日志 grep。

3. ADR-0012 缺席：卡面「来源方案：ADR-0012」并允许改 `docs/ADR/ADR-0012-*.md`，然仓库 ADR 序列 0011→0013 跳号、0012 不存在。
   ADR-0012 非本卡输出交付物，且新立 ADR 受治理铁律 5 评审约束，故未创建；如需补记决策依据请由 Hark 处理。

4. 新守卫未接线 CI：`scripts/guard/edge-imports.mjs` 不在本卡「允许修改」内的是 `run-all.mjs`，故 edge-imports 作为独立守卫
   （本地/evidence 直跑，已变异检验证明可 FAIL）。CI `run-all.mjs` 硬编码守卫列表未含它；若需纳入门禁请另开卡改 run-all。
