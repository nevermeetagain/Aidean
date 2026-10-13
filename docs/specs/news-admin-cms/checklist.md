# 资讯后台化验收清单

> 版本: v1.1 | 更新: 2026-09-18 | 变更: 收口轮——C1–C4 全部取证并勾选；证据明细见《验收复核-20260917》§2.4

## C1 需求1：随时编辑 + 免费模型合集置顶
- [x] 后台存在 /admin/news 编辑页，可新建/修改/删除任意资讯。
- [x] 《免费模型合集》在列表最前（pinned），且后台可随时改标题/正文/置顶状态。
- [x] 修改后前台无需重启即见（force-dynamic + revalidate）。

## C2 需求2：分类
- [x] 列表可按 热门/AI/硬件/软件 等分类过滤（?cat=），非法分类回退全部。
- [x] 每篇展示所属分类；分类白名单在 shared 定义并有校验。

## C3 需求3：Markdown→HTML，编辑态仍为 Markdown
- [x] 库中只存 markdown；详情 SSR 输出 HTML（无未解析的原始标记）。
- [x] 后台编辑器载入既有文章时 textarea 内容为原始 markdown（往返无损）。
- [x] `[]()` 兼容：URL 含括号（平衡/失衡）、URL 含 []、角括号、全角括号写法均可解析为链接。
- [x] XSS：script/img-onerror/javascript:/iframe 全部被剥离。

## C4 回归与治理
- [x] 全量单测、typecheck、build 通过；既有 4 篇资讯内容不丢失（迁入 markdown 正文）。
- [x] 无遗留风险（新表 only）；未运行破坏性的全量 seed；测试数据清理。
- [x] API/架构锚点互引 + 目录/UI/索引/术语表同步，版本标记齐全；未提交未推送。

## 已知偏差（登记）
- `(site)` 路由组流式渲染（`loading.tsx` Suspense 壳）使 HTTP 状态码恒 200：删除/草稿直达时以 scoped `not-found.tsx` 视口内容判定 404，与站点既有 `/models/[slug]` 行为一致；`generateMetadata` 阶段抛 `notFound()` 保证不输出幽灵标题 metadata。
