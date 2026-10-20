# EVD-053 偏离说明

1. **口径更替（登记）**：卡体目标/验收写的旧口径「统一 ¥/M、页面无 `$` 作为主价格符号」已由 **U-15**（26_用户裁决记录 #1，2026-10-20 11:09 CST）取代：**中国大陆 IP 显示 ¥/M，其他地区显示 $/M，全站同一当日汇率快照**。本卡按 U-15 实现：主价 = EffectivePrice 归一字段（priceInput/priceOutput，currency=展示币种，每百万 Token）；源币种 ≠ 展示币种时并列「官方 原币原价 /M」与当日汇率注记。验收「主列均为 ¥」相应改为「CN 请求主列均为 ¥、US 请求主列均为 $」，见 runtime.md 截图。卡体「Execution Steps 2：sourceCurrency≠CNY 时追加原币注记」相应改为 sourceCurrency≠展示币种。
2. **缓存口径**：两页由 ISR（revalidate=300）改为 `dynamic = "force-dynamic"`（EVD-102 deviation 5 的要求）：按请求头渲染币种，避免首个访问者的币种被缓存给所有地区。/pricing 后台保存处的 `revalidatePath("/pricing")` 保留，无害。
3. **不可归一 → 「价格待核」**：resolveEffectivePrice / toEffectivePriceDto 返回 null（缺当日汇率、未知币种或单位）时显示「价格待核」，绝不显示 0 或未换算原值；免费（0）的跨币种行在缺汇率时同样显示「价格待核」（fail-closed，与网关同一归一函数口径）。原价为 0 时不再重复「官方 免费」注记。
4. **对比度未全部达标的元素在共享组件**：优惠主价 rose-600（4.33）、优惠徽标（4.12）、单位「/M Tokens」与原价划线 slate-400（2.51）来自 `apps/web/components/common/PriceTag.tsx`，不在本卡「允许修改」范围（仅 pricing/** 与 models/[slug]/**），本卡未改；建议另开小卡把 PriceTag 的 slate-400→slate-500、rose-600→rose-700。本卡新增/拥有的文字（主价、原币注记、汇率注记、币种说明、价格待核）三主题均 ≥4.5。
5. **review-029 S4/S5**：S4——详情页 resolveEffectivePrice 抛错时回落 isCurrent 当前价（同样经 normalizePriceRow 归一到展示币种，isPromotion=false 不显示徽标），回落也不可归一 → 「价格待核」；S5——/pricing 两处优惠查询各自 try/catch，失败只降级为当前价表，不整体走空态。二者为代码路径（运行态未注入 DB 故障，未截图）。
6. **取证数据**：本地 CI 库额外插入一条演示优惠（runtime.md 已注明）；取「价格待核」截图时临时把当日汇率行日期移走 400 天，取证后移回，未改 schema/migrations。
7. **运行方式**：截图用 `next dev`（非生产构建），端口 3100；Redis 用 fakeredis。e2e 未新增。
8. task-index 053 行：状态改「已完成（助手B，EVD-053）」，其余列不动。
