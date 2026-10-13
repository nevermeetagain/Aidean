# 资讯后台化（news-admin-cms）规格

> 版本: v1 | 更新: 2026-09-17 | 变更: 初版——需求来自用户 2026-09-17 三点要求，批准后开工

## 需求（用户原话锚定）

1. 「资讯列表里，我需要随时调整《免费模型合集》，并始终置顶。所以后台要有个编辑页。」
2. 「资讯列表需要分类。热门/AI/硬件/软件等等。」
3. 「资讯详情页我需要后台我用 markdown 写好，后面你自己换成 html，但我重新编辑时还是 markdown。注意兼容像 "()[]" 链接的写法。」

## 设计与边界

- **D1 存储**：新建 `NewsItem` 表（slug 唯一/title/summary/category/contentMarkdown/pinned/status/publishedAt），不复用 SystemConfig——长文 Markdown 与 JSON 键值模型不匹配，且需逐篇原子编辑与审计。迁移 `20260917150000_add_news_item`；`NewsStatus { DRAFT PUBLISHED }`。
- **D2 置顶**：`pinned=true` 恒排最前（列表与详情延伸阅读同规则）；允许多篇置顶，按 publishedAt 次序。《免费模型合集》以 pinned 种子入库，后台随时可改。
- **D3 分类**：共享常量 `NEWS_CATEGORIES = 热门/AI/硬件/软件/平台动态/功能更新/功能指引`（z.enum 校验；扩充=改一行常量，白名单防脏分类）。列表页 `?cat=` 过滤（SSR 读取，服务端校验，非法值=全部），分类 chips 呈现。
- **D4 Markdown**：库内**只存 Markdown**；前台 SSR 端 `marked`(gfm,breaks) → 链接归一化 → `sanitize-html` 白名单净化 → HTML 注入；后台编辑器 textarea 载入的永远是原始 Markdown（重新编辑仍是 Markdown）。链接兼容：自动将含 `()[]`、空格或全角 `（）` 的链接目标包为 `<...>`；`]（url）` 全角括号归一为半角；XSS 剥离（script/事件属性/javascript:/非白名单 img 域）。
- **D5 前台回退**：DB 空/异常回退静态底稿（`lib/features/news/static-articles.ts` 为唯一底稿源，seed 与回退共用）；详情页 DRAFT 与未知 slug 均 404；两页 force-dynamic（随改随生效）。
- **D6 后台**：`/admin/news`（NewsManager：列表+新建/编辑表单+markdown 预览+删除确认）；API `/api/v1/admin/news` GET/POST、`/[id]` PATCH/DELETE，`requireAdminApi` + 审计 + `revalidatePath("/news")`。
- **边界**：不引入图片上传（沿用 URL 白名单）；预览为客户端 marked 未净化渲染（仅管理员本机可见）；分类白名单代码级扩充；不改认证、不动既有资讯之外的表。

## 验收（证据分层）

- 单测：markdown 链接边界（平衡括号/失衡括号/角括号/全角/URL 内含 []）+ XSS 净化 + 路由 CRUD 校验 + 列表置顶/分类过滤 SSR + 详情 markdown→HTML。
- 门禁：全量单测、turbo typecheck、next build。
- 运行时：登录后台 PUT 编辑→前台详情出现新 HTML→重开编辑器回读仍是原始 Markdown→删除测试数据；种子 5 篇入库复验。
- 文档：API/架构互引锚点、目录/API/界面/索引同步、本规格收口。
