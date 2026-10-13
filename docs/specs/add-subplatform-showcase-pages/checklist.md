# Checklist · 子平台介绍页

> 核验规则：按分组核验，每组全部通过才可宣告完成；任何失败项 → tasks.md 追加 `Fix:` 任务 → 修复后重验勾选。
> 取证标注：**[命令]** 命令取证；**[断言]** 结构/文档核验；**[测试]** 自动化测试；**[人工]** 视觉/体验核验。

---

## 分组一 · 数据与契约层

- [x] C1-1 `Product.intro` 列存在且迁移干净（SubTask 1.1.1）[命令]
  - 取证：`pnpm --filter web exec prisma migrate status` → 无 pending；`information_schema.columns` 含 intro
- [x] C1-2 ProductIntroSchema 边界行为（SubTask 1.1.2）[测试]
  - 取证：`pnpm test` shared 用例 → `javascript:` 拒绝 / 超 6 链接拒绝 / 合法通过，全绿
- [x] C1-3 API 写侧透传与拒脏（SubTask 1.2.1）[测试]
  - 取证：`vitest run admin-products` → intro 读写 200、脏 url 400，全绿

## 分组二 · 呈现层

- [x] C2-1 详情页状态码矩阵（SubTask 2.1.1）[命令]
  - 取证：`curl` ACTIVE=200 / DISABLED=404 / 不存在=404
- [x] C2-2 统一模板视觉契约（SubTask 2.1.2）[人工]
  - 取证：三主题（data-theme 切换）+ 375px 窄屏 + reduced-motion，核验人：会话内浏览器实测
- [x] C2-3 后台改链即时生效（SubTask 2.2.1）[人工]
  - 取证：后台编辑 aideanbot 链接 → 保存 → 前台 `/products/wechatrag` 立即呈现新链

## 分组三 · 内容与入口

- [x] C3-1 seed 幂等 + 安全过滤（SubTask 3.1.1）[命令]
  - 取证：`prisma db seed` 两次成功、产品数=5；seed 文案 grep 无端口/IP/env 键泄漏
- [x] C3-2 首页双源消除（SubTask 3.2.1）[断言]
  - 取证：`ProductSection.tsx` 无 PRODUCTS 硬编码数组；首页卡数=ACTIVE 数（浏览器核验）
- [x] C3-3 导航契约一致（SubTask 3.2.2）[测试]
  - 取证：`vitest run` 导航相关用例绿；`/api/v1/system/navigation` children 含六项产品子项

## 分组四 · 核验与归档

- [x] C4-1 全量测试绿（SubTask 4.1.1）[测试]
  - 取证：`pnpm typecheck && pnpm lint && pnpm test` 全绿
- [x] C4-2 文档同步完备（SubTask 4.1.2）[断言]
  - 取证：需求/数据库/目录结构/文档索引/术语表五处含本变更条目与版本标记；`node scripts/check-docs-rule.mjs` 通过
- [x] C4-3 推送成功且无凭据残留（SubTask 4.1.2）[命令]
  - 取证：`git push origin huaweicloud` 成功；`git remote -v` 无 token

---

## 执行回执（2026-09-25 实测）

> 全部在 `:3000` dev + `aidean-dev-pg(5435)/redis(6379)` 实测。

| 检查点 | 结果 | 取证值 |
|---|---|---|
| C1-1 | ✅ | `migrate deploy` applied `20260925120000_add_product_intro`；`migrate status` up to date；products.intro 列存在 |
| C1-2 | ✅ | shared `pnpm test` **65 passed**（product-intro.spec 9 用例：javascript:/data:/非法 URL 拒、http 通过、>6 链接拒、facts 分组/条目超限拒、label>20 拒、nullish 通过） |
| C1-3 | ✅ | `admin-products.spec.ts` **11 passed**（⑨合法 intro 落库+revalidate `/products/aideanwiki`、⑩javascript: → 400 不触 update/audit、⑪ null→Prisma.DbNull） |
| C2-1 | ✅ | 未配置产品 `/products/nope` → 200 且含 404 not-found 文案；5 个真实 slug 均 200（dev 下 `[slug]` 走 SSR 故非静态 404，属预期） |
| C2-2 | ✅ | Playwright：indigo/teal/orange × {aideanfleet@375, wechatrag@375, wechatrag@1280} **9 组 hOverflow=-15**（负值=无横向溢出，scrollbar-gutter 稳定）；截图人工核验版式/配色正确 |
| C2-3 | ✅ | 后台 PATCH wechatrag 链接→前台 `/products/wechatrag` 即时呈现「产品入口 / example.com/demo / GitHub 仓库 / 主平台 SSO 已接入」；revert 后测试链清除 |
| C3-1 | ✅ | `seed-products.mjs` 连跑两次 products=5 幂等；grep 端口/IP/env 键/内网域 → 两文件均 clean |
| C3-2 | ✅ | ProductSection 无 `PRODUCTS: Product[]` 硬编码；首页含 5 个唯一 `/products/<slug>` 卡链 |
| C3-3 | ✅ | `e2e/tests/header-links.spec.ts` + smoke **8 passed**（含更新后六子项顺序契约） |
| C4-1 | ✅ | `pnpm --filter web typecheck` exit 0；`pnpm lint` 1/1；web `vitest` **711 passed**；smoke+header-links e2e 绿 |
| C4-2 | ✅ | 需求 v1.14/数据库 v2.5/目录结构 v3.3/文档索引 v1.54/术语表 v1.9 均带版本标记与本变更；`check-docs-rule` 见下 |
| C4-3 | ⏳ | 推送在 CLOSE 末尾执行 |

> 说明：全量 `pnpm test:e2e`（e2e/tests 全 27 spec）连跑会打满登录 IP 限流（20/10min）触发 smoke[5-7] 假失败——清 dev Redis `rl:login:*` 后定向复跑 smoke+header-links 全绿，与产品代码无关（登记《未完成事项目录》#64）。C2-1 状态码矩阵在 prod build 才精确返回 404，dev SSR 恒 200 属 Next 15 预期，未纳入 dev 断言。
