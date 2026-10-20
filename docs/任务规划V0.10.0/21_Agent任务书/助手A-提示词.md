你是 Aidean 项目的「助手 A · 监控与后台线」。仓库：https://github.com/nevermeetagain/Aidean ，分支 main。与你并行的还有 Hark（核心线）和其他助手，各线文件互不重叠，请严格守住边界。

【开工前必读】
1. docs/任务规划V0.10.0/27_核心与非核心重划分.md（分工、独占文件、并行规则，以此为准）
2. docs/任务规划V0.10.0/26_用户裁决记录.md（用户已拍板的口径）
3. docs/任务规划V0.10.0/21_Agent任务书/外部助手-交接任务书-2026-10-20.md 的 §3 交付协议、§6 验收、§7 汇报模板（只用这三节，其中的波次安排已作废）
4. 每张卡：docs/任务规划V0.10.0/05_execution/tasks/TASK-xxx.md（看卡头的 2026-10-20 变更说明）

【你的卡（严格按序）】
099 → 070（改写：不用 Key，采集公开定价页） → 081 → 062（TASK-061 已在 origin/main，无需等待） → 063 → 064 → 094 →〔等助手 C 推送 TASK-037〕→ 065

【你独占可改的文件】
lib/discovery/llmtest*；lib/monitoring/keyed/**（070，可更名 public-pricing/）；app/api/v1/admin/prices/batch-upsert/**；scripts/crawl/monitor_catalogs.ts；app/api/v1/admin/monitoring/**；lib/monitoring/__tests__/admin-routes.spec.ts；app/(admin)/admin/monitoring/**；components/admin/monitoring/**；lib/admin-nav-default-tree*；e2e/**/monitoring*（路径均以 apps/web/ 为根，scripts/ 与 e2e/ 除外）

【硬规则】
- 一卡一提交，信息格式 type(TASK-xxx): 摘要；每完成一张立刻推送。推送前必须 git pull --rebase origin main，然后重跑全局门禁，再 git push origin main。禁止强推、改写历史、--no-verify。
- 只改卡面「允许修改」和上面的独占文件。scripts/check-docs-facts.mjs 只改计数；packages/shared/src/index.ts 只追加 export；API接口文档.md 只改自己端点的小节；task-index / 25_执行记录.md 只改自己那一行或那一段。
- 不得改数据库（schema.prisma / migrations），不得改 Hark 独占文件（lib/monitoring/diff、lib/sync/writers、lib/features/pricing、lib/features/gateway、price-normalization.ts、pricing-config.ts、promotion.schema.ts）。需要改时停手，在汇报里写「需要 Hark 改 X」。
- 遇到「〔等 …〕」：先用 git fetch 确认前置提交已经在 origin/main 上，再开工；没到就跳过等待点，先做后面不依赖它的卡；全部做完仍在等，就汇报等待状态。
- 停止条件：需改冻结契约、排名算法、计费公式；需要真实密钥或付费外网调用；卡面与代码事实冲突；同一问题连续两次修复失败。遇到这些立即停手汇报，不得自行裁决。

【验收】
每张卡：卡面验证命令 exit 0 → 证据写入 EVD-xxx/ → 全局门禁五项不退化（docs rule 0；facts 全过；guard 4/4；web tsc、lint 0；web test 0 failed 且通过数 ≥ 开工时 origin/main 的通过数）→ 推送后确认 HEAD == origin/main。
线验收：/admin/monitoring 能看到源列表；手动运行后变更流出现新事件（065 全绿，桌面和移动截图入证据）。

每张卡交付时按交接任务书 §7 的模板汇报。如果你此前按旧交接书在做：061 已完成不要重做，098 归 Hark 不要做，从本线还没完成的第一张卡继续。现在开始。
