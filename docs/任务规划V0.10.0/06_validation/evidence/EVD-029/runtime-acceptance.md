# EVD-029 运行态验收（2026-10-19，Hark 环境）

> 环境：embedded PostgreSQL 16.14（迁移 18/18 + `pnpm db:seed` + navigation/rbac seed）+ `next dev -p 3000` + Playwright chromium（用户态补库，脚本见 setup.sh.txt）。
> 演示数据（ui-seed.ts.txt）：Mistral Medium 限时免费（进行中）、Claude 3.5 Haiku 五折（进行中）、Jurassic-2 Ultra（未开始）。

| # | 场景 | 结果 | 证据 |
|---|---|---|---|
| 1 | /pricing 网关单价表：优惠模型置顶、徽标「限时免费/限时优惠 · 截至 MM/DD HH:mm」、原价划线 | PASS（页面徽标计数 2） | pricing.png |
| 2 | /models/claude-3-5-haiku：输入/输出生效价 + 原价划线 + 徽标；单位随 billingUnit（/K Tokens） | PASS | detail-promo.png |
| 3 | /models/mistral-medium：生效价 0 显示「免费」，徽标「限时免费」 | PASS | detail-free.png |
| 4 | /admin/prices →「限时优惠」Tab：状态（未开始/进行中）、北京时间窗口、原价划线、编辑/删除 | PASS | admin-promos.png |
| 5 | 新建对话框：模型服务端搜索、当前价口径提示、设为限时免费、北京时间 datetime-local | PASS | admin-dialog.png |
| 6 | 与既有优惠重叠 → Dialog 内联错误「保存失败：与既有优惠窗口重叠」（promo-error） | PASS | admin-dialog-error.png |
| 7 | 新建 GPT-4o mini 限时免费 → 「已保存，价格页即时生效」（promo-saved）且子表刷新 | PASS | admin-promos-after-save.png |

运行态发现并修复的缺陷（单测未覆盖）：
- D-029-1：子表请求 pageSize=100 被 AdminPageQuerySchema（≤50）拒为 40000 → 改为 50/页 + 分页。
- D-029-2：/pricing 按输入价取前 120 条会把优惠模型挤出表格 → 窗口内优惠模型保证上表并置顶。
- D-029-3：模型下拉只含父组件首屏 100 条当前价 → 改为服务端 q 搜索；子表「原价」按 modelId 补查。
- D-029-4：详情页单位硬编码「¥/M Tokens」与存量 per_1k_tokens/USD 行不符 → 单位与币种随价格行展示（¥/M 归一仍属 TASK-053/U-15）。

截图中文为 wqy-microhei 字体渲染（沙箱无系统中文字体）。
