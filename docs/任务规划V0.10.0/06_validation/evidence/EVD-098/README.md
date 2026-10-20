# EVD-098 快照写入器加固（Hark 核心，2026-10-20）

## 改动
- 空目录守卫：items 为空 → 不查源、不开事务、不写快照、不下架，返回 `{ skipped: true, reason: "empty", delisted: 0 }`
- 同源串行（超出卡面的架构加固）：事务内先对 MonitoringSource 行做无副作用 UPDATE（lastCount += 0）取行锁，防止同源两次采集交错执行「upsert → 下架」，用旧轮 items 下架新轮观测；不用原生 SQL（守 facts queryraw-biz=0）。副作用：monitoring_sources.updated_at 每次采集刷新
- 观测 upsert 每批 200 条；交互事务 timeout 60000 / maxWait 10000
- 同 (sourceId, rawSha256) 撞 P2002：事务已失效，故在事务外捕获并回读既有快照，返回 idempotent=true；非 P2002 错误原样抛出
- 返回值新增 `idempotent`（及空目录时的 `skipped/reason`）；目前无其他调用方，062 调度接入时消费

## 验证
- 卡面验证命令：exit 0（verify.txt）；lib/sync/writers 单测 11 例（原 6 + 新 5：空目录、分批≤200 与 timeout、P2002 回读、行锁顺序、非唯一键错误原样抛）
- 真 PG16（127.0.0.1:55432/aidean_e2e）：1200 条首采 830ms；同哈希两路并发 → 1 条 created、1 条 idempotent，快照共 2 条；空目录调用后在架观测仍为 1200
- 全局门禁：docs rule 0；facts 14/14；guard 4/4；web tsc 0；lint 0；web test 1319 passed / 5 skipped，0 failed
