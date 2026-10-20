# EVD-030 · e2e promotion-billing（限时优惠价 → 网关计费）

- 环境：`next start` 生产构建（HEAD b909643，含 TASK-048/080/053），PG16.14 `aidean_e2e`（`prisma migrate deploy` + `db:seed`），Redis :6390，`AIDEAN_ENABLE_MOCK_UPSTREAM=1`。
- 结果：`playwright.txt`——2 passed / exit=0（验证命令原样执行，`--config e2e/playwright.config.ts --workers=1`）。
- 覆盖：admin API-009 建优惠（priceInput=priceOutput=0）→ 零余额用户调网关 200（U-23 免费跳过余额校验）、充值用户余额不变且 usage quotaMinor=0 → API-011 删除优惠 → 再调按归一原价（USD→CNY 当日汇率、每百万 Token）逐分扣费，钱包/流水/usage 三处一致；零余额用户不再放行。
- 计数：spec 193→194，`check-docs-facts` 期望值同步。
- 偏差见 deviation.md。
