# EVD-030 偏差记录

1. **汇率夹具**：seed 不写 `fx_daily_rates`。TASK-048 后网关对 USD 价缺汇率 fail-closed，故 spec 在测试库无当日（≤上海日）USD→CNY 快照时写入一条 `source=e2e-fixture` 的 7.20000000 夹具，并在 afterAll 删除；若已有快照则直接取服务端会用的那一行复算。非生产数据。
2. **充值方式**：生产构建下 mock-pay 不可用，付费用户经管理端调账入账 ¥55.00（审计可追溯），不走支付通道。
3. **配置**：卡面命令用 `e2e/playwright.config.ts`（playwright.txt）；根配置 `--project=flows`（testDir `./e2e/tests`）复跑同样 2 passed，见 playwright-root-config.txt。
