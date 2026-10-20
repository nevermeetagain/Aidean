# EVD-039 偏离说明

1. **真实基线未采集（环境不具备）**：本执行环境为无 root 的沙箱，无 PostgreSQL、无 Redis、无 docker（`which pg_ctl postgres redis-server docker` 均为空），无法起临时库与 :3000 应用。按派单规则「e2e 若需浏览器/数据库而环境不具备，记录 deviation.md，不得伪造输出」，`ladder-1k-baseline.md` 只写测量口径与复跑命令，结果表标「未测」。
   - 卡面验证命令 `node scripts/test/benchmark/ladder-1k.mjs --dry-run` 原样 exit 0（自检 15/15：安全闸 8 例、数据生成 5 例、百分位 2 例），见 verify.txt。
   - 验收「证据含命令、原始样本与 p50/p95」中「原始样本与 p50/p95」**未满足**，待具备 PG16+Redis 的环境（如 EVD-035 使用的 shared-postgres:5435 + dev :3000）用 baseline.md 中命令复跑，`--out` 直接覆盖本证据。
2. **清理方式**：卡面写「结束 TRUNCATE 回滚」；脚本改为按 `bench1k-` 前缀/专用厂商定点删除（Benchmark 随 AiModel 级联）。理由：TRUNCATE 会清掉临时库中种子数据（天梯页其余用例依赖），定点删除效果等价于「回到插入前」且更安全。
3. **ladder 缓存**：`/api/v1/ladder` 走服务端缓存（Redis/unstable_cache），采样中除预热外多为热缓存读；p50/p95 反映的是千级规模下的热路径。冷路径如需单独测，复跑前清 Redis 即可（只测量不优化，本卡不改业务代码）。
4. `scripts/check-docs-facts.mjs` 未改：新增 `.mjs` 脚本不计入 route/page/spec/lib-features 计数，14/14 原样通过。
5. task-index 本卡行状态回写（派单要求，卡面禁止项 docs/任务规划V0.10.0/** 的授权偏离，同 EVD-036）。
