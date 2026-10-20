# EVD-053 · 运行态取证（双地区请求 + 三主题对比度）

- 时间：2026-10-20 20:00 前后 CST；HEAD 基于 origin/main accbc1f + 本卡工作区改动。
- 环境：PostgreSQL 16.14 `aidean_ci@127.0.0.1:55471`（prisma 全量迁移；`pnpm db:seed`；TASK-101 写入的当日汇率快照 2026-10-20 USD/CNY=6.6761，源 Frankfurter）；Redis = 本地 fakeredis `:6392`；`next dev -p 3100`（3000 留给 C 线）；Chromium headless（playwright 1.62.1，用户态补 libatk 等）。
- 请求方式：Playwright `extraHTTPHeaders: { "cf-ipcountry": "CN" | "US" }`，经 TASK-102 middleware → `x-display-currency`。
- 取证演示数据（只写本地 CI 库）：seed 的 /pricing 前 120 行（输入价升序）全为免费 demo 行，看不到换算；故给 `claude-3-5-haiku`（官方 USD 0.8/4）插入一条 7 天窗口内的 USD 限时优惠 0.4/2（sourceName=「EVD-053 演示」），使其按「优惠置顶」出现在表首。脚本：本机 lineb-tools/seed053-promo.ts。

## 结果（截图见 screenshots/，原始数值见 runtime-results.json）

| 截图 | 请求头 | 主价 | 原币注记 / 汇率注记 |
|---|---|---|---|
| pricing-CN.png | cf-ipcountry: CN | 表头说明「统一按 ¥ / 百万 Tokens」；Claude 3.5 Haiku 输入 ¥2.67（划线 ¥5.34）、输出 ¥13.35（划线 ¥26.70）+ 限时优惠徽标 | 「官方 $0.400 /M」「官方 $2.00 /M」；表尾「跨币种按当日汇率 1 USD = 6.6761 CNY（2026-10-20，每日一次）换算」 |
| pricing-US.png | cf-ipcountry: US | 「统一按 $ / 百万 Tokens」；同行 $0.400（划线 $0.800）、$2.00（划线 $4.00） | 源币种=展示币种 → 无原币注记（CNY 源 demo 行仍触发表尾汇率注记） |
| model-gpt-4o-CN.png | CN | 输入 ¥33.38 /M Tokens、输出 ¥100.14 /M Tokens（= $5 / $15 × 6.6761） | 「（官方 $5.00 /M）」「（官方 $15.00 /M）」+「按当日汇率 1 USD = 6.6761 CNY（2026-10-20，每日一次）换算；实际扣费按账户余额币种结算。」 |
| model-gpt-4o-US.png | US | 输入 $5.00、输出 $15.00 /M Tokens | 无（同币种） |
| *-CN-fx-missing-pending.png | CN，当日汇率临时移走 | 跨币种行一律「价格待核」（/pricing 216 处、详情页 2 处），页面无 ¥0 | 无汇率注记；取证后快照原样移回（lineb-tools/fx-toggle.ts） |

换算核对：0.4×6.6761=2.670、0.8×6.6761=5.341、2×6.6761=13.352、4×6.6761=26.704、5×6.6761=33.381、15×6.6761=100.142 —— 与页面一致（2 位小数）。

## 三主题对比度简查（indigo / teal / orange；WCAG 相对亮度，canvas 解析 oklch → sRGB，前景按 alpha 合成到最近不透明背景）

| 元素 | 文件归属 | indigo | teal | orange | ≥4.5 |
|---|---|---|---|---|---|
| 主价（/pricing 表格） | 本卡 | 7.25 | 7.25 | 7.25 | ✓ |
| 主价（详情页） | 本卡 | 4.55 | 4.55 | 4.55 | ✓ |
| 原币注记 price-source-note | 本卡 | 4.55 | 4.55 | 4.55 | ✓ |
| 汇率注记 fx-note（/pricing 表尾，本卡把 slate-400 提到 slate-500） | 本卡 | 4.55 | 4.55 | 4.55 | ✓ |
| 汇率注记 fx-note（详情页） | 本卡 | 4.55 | 4.55 | 4.55 | ✓ |
| 币种说明 display-currency | 本卡 | 4.55 | 4.55 | 4.55 | ✓ |
| 价格待核 price-pending（amber-700） | 本卡 | 4.81 | 4.81 | 4.81 | ✓ |
| 模型链接 | 原有 | 17.06 | 17.06 | 17.06 | ✓ |
| 优惠主价 rose-600 | components/common/PriceTag（非本卡范围） | 4.33 | 4.33 | 4.33 | ✗（见 deviation 4） |
| 优惠徽标 | 同上 | 4.12 | 4.12 | 4.12 | ✗（同上） |
| 单位「/M Tokens」slate-400 | 同上 | 2.51 | 2.51 | 2.51 | ✗（同上） |
| 原价划线 slate-400 | 同上 | 2.51 | 2.51 | 2.51 | ✗（同上） |

三主题只改 `--primary/--accent`（globals.css `[data-theme]`），价格区文字色为固定 slate/rose/amber，故三主题读数相同；主题切换已生效（见 *-theme-orange.png 左侧强调条变橙）。
