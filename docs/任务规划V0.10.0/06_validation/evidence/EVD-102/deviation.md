# EVD-102 偏离说明

1. **middleware matcher 扩展（必要，不改守卫逻辑）**：原 matcher 仅 `/user/:path*`、`/admin/:path*`，站点页（/pricing、/models/[slug]）根本不经 middleware，无法写币种头。改为追加一条覆盖其余路径的 matcher（排除 `_next/static`、`_next/image`、`favicon.ico` 与带扩展名的静态文件），并在函数首行按原范围 `isGuardedPath` 分流：范围外只附加 `x-display-currency` 后放行；范围内的验签 / 307 / `x-auth-guard` 诊断逻辑逐行未改，仅把放行处 `NextResponse.next()` 换成附带币种请求头的 `NextResponse.next({ request: { headers } })`。原 middleware 单测 10/10 不变，并新增「/user 未登录仍 307」回归断言。
2. **防伪造**：`x-display-currency` 由 middleware 按国家头计算后**覆盖**客户端自带值。国家头本身的可信度取决于部署层（CDN/边缘需覆盖或剥离客户端注入的 cf-ipcountry 等头），记入部署注意事项；本值只影响展示，不参与扣费（ADR-P005：扣费按账户余额币种 CNY，用当日快照）。
3. **回退读取**：带扩展名的路径（如 slug 含点 `gpt-4.1`）不经 middleware，`readDisplayCurrency` 在缺 `x-display-currency` 时回退直接解析国家头，结果一致。
4. **非法值判定**：国家头须为两位字母（ISO 3166-1 alpha-2），否则视为缺失并看下一个头（覆盖 Cloudflare 的 `T1`、空值、数字、三位码）；`XX`（未知）合法形态但非 CN → USD。CN 判定复用 047 契约 `resolveDisplayCurrency`（HK/MO/TW → USD）。
5. **给 053 的注意**：`getRequestDisplayCurrency()`（lib/currency/server.ts）读 `next/headers`，调用页会转为按请求动态渲染；现 /pricing、/models/[slug] 为 ISR（revalidate=300），053 须改为动态或按币种分缓存，否则 ISR 会把首个访问者的币种缓存给所有人。
6. `scripts/check-docs-facts.mjs`：spec-count 191→192（R10-01）。
7. e2e：未新增；现有 e2e 需 :3000+PG+Redis，本卡未在浏览器复跑（middleware 接线以单测 + 053 的双 IP 截图验证）。
8. task-index：原表无 102 行，按「只追加本卡行」在表尾追加。
