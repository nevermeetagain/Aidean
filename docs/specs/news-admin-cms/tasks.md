# 任务清单 news-admin-cms

> 版本: v1.1 | 更新: 2026-09-18 | 变更: 收口轮——全部任务已取证并勾选；证据汇总见《验收复核-20260917》§2.4

## T1 依赖与数据层
- [x] T1.1 安装 `marked@12` + `sanitize-html`（apps/web，含 @types）。
- [x] T1.2 `NewsItem` 模型 + `NewsStatus` 枚举 + 迁移 + `prisma generate`。
  - 验证:`prisma migrate dev`；回滚=down migration 不需（新表，删表即净）。实落 `20260917150000_add_news_item`。
- [x] T1.3 shared：`NEWS_CATEGORIES` + `AdminNewsCreateSchema/AdminNewsPatchSchema` + index 导出；shared 单测过（56/56）。

## T2 Markdown 渲染管道
- [x] T2.1 `lib/features/news/normalize.ts` + `markdown.ts`：归一化链接目标（`()[]`/空格/全角）+ marked(gfm,breaks) + sanitize-html 白名单（img 域走 isSafeMediaUrl 口径）。
- [x] T2.2 单测：链接边界用例≥6、XSS 用例≥4、常用元素往返（markdown.spec.ts，news 全套 36/36）。

## T3 后台 API 与页面
- [x] T3.1 `/api/v1/admin/news` GET/POST、`[id]` PATCH/DELETE（requireAdminApi、zod 校验、审计、revalidatePath）。
- [x] T3.2 `/admin/news` 页 + `NewsManager`（列表/表单/预览/删除确认/置顶与状态下拉）+ 侧边栏「资讯管理」。
- [x] T3.3 路由单测（mock prisma/session/audit；admin-news.spec.ts）。

## T4 前台
- [x] T4.1 `/news`：force-dynamic、pinned 置顶卡、分类 chips + `?cat=` 过滤、空态、DB 失败回退静态底稿。
- [x] T4.2 `/news/[slug]`：force-dynamic、markdown→HTML 渲染正文（`.news-content` 样式）、DRAFT/未知 404、延伸阅读（分类优先）。
  - 偏差登记：`(site)` 组 `loading.tsx` 流式壳致 HTTP 码恒 200（站点既有行为，同 `/models/[slug]`）；404 以 scoped `not-found.tsx` 视口内容为准，`generateMetadata` 阶段抛出保 metadata 不发幽灵标题。
- [x] T4.3 `static-articles.ts` 唯一底稿源（原 4 篇 + 免费模型合集，markdown 形态）。

## T5 数据与门禁
- [x] T5.1 `prisma/seed-news.ts` 独立幂等入口（seed.ts 内调用 + 可单跑；绝不跑全量 seed）。实落 5 条。
- [x] T5.2 全量单测 + turbo typecheck + next build 全绿（web 530/530 · shared 56/56 · tsc 双包 · 生产构建含 /news、/admin/news、admin API 路由）。

## T6 运行时取证与文档
- [x] T6.1 真实 HTTP 验收脚本 20/20 ALL PASS：登录→POST 测试文章（`()[]`/全角链接/`<script>` 注入）→列表/分类/置顶命中→前台 HTML 断言→GET 回读逐字相等→PATCH 置顶恒首位→DELETE 清理→删除后详情渲染 404 视图→匿名 401。测试数据零残留，脚本已删。
- [x] T6.2 文档同步：API接口文档 §5.8.3(v1.32)、API架构设计方案 §7.3(v1.5)、目录结构 §十(v3.2)、界面交互 §十二(v2.9)、术语表 NewsItem/资讯分类(v1.8)、文档索引(v1.29)、验收复核 §2.4(v1.5)、经验教训 事故1(v1.1)；本清单收口。
