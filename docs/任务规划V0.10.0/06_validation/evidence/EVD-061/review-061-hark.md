# review-061（Hark 核心审查，2026-10-20）

审查对象：5db1342 feat(TASK-061)（外部助手按旧交接书提交）。detect.ts 结论 PASS（四类事件、归一合并、阈值、单位不同不比较均与 DESIGN-004 §5 一致）。

| 编号 | 级别 | 问题 | 修复 |
|---|---|---|---|
| M1 | 必修 | persist 每次重放都 `evidenceChain.create`，同一快照重跑/并发会产生重复证据链（事件表有唯一键，证据链没有） | 先读快照已存在键，只为本次新建事件写证据链；事务内先对快照行做无副作用 UPDATE（itemCount += 0）取行锁，串行化同快照并发（不用原生 SQL，守 facts queryraw-biz=0） |
| M2 | 必修 | 交互事务逐条 upsert，未设 timeout；首个快照数百至上千事件会撞 Prisma 默认 5s 超时整批回滚 | 新键 `createMany`（≤500/批，skipDuplicates 兜底），证据链 `createMany`；事务 timeout 60s / maxWait 10s |
| S1 | 建议（不改） | DESIGN-004 §5「单位不同时改记 listed 的 evidence」未实现，目前单位变化静默 | 登记，归 062 调度接入时评估 |

## 验证
- 单测：lib/monitoring/diff 20/20（persist 8：新增重放不重复证据链、快照行锁先于读、事务 timeout、1201 条分 3 批）
- 真 PG16（127.0.0.1:55432/aidean_e2e，18 迁移）：800 条 model_first_seen，两路并发 + 一次重放 → 事件 800、证据链 800（无重复），总耗时 1491ms（行锁版本复跑）
- 全局门禁：docs rule 0；facts 14/14；guard 4/4；web tsc 0；lint 0；web test 1314 passed / 5 skipped，0 failed（134 文件）
