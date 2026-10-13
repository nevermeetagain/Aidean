# Checklist

- [x] ladder/config 读侧存在且被 models SSR 消费（rg 可证消费点：models/page.tsx:11/47/51）
- [x] 无配置/非法配置时 SSR 回退默认值，首屏不被阻塞（实施事实修正：默认 0.1 非 spec 初稿的 5.0，config.ts LADDER_GRANULARITY_DEFAULT=0.1，全捕获回退）
- [x] admin PUT g=2 后首访 /models 初始分度值为 2.0（HTTP 等效 E2E 实证：PUT(2)→SSR 立即 2→还原 0.1→SSR 0.1）
- [x] 客户端切换分度值仍零请求（网络面板无 /api/v1/ladder；LadderBoard useState 本地重排，先前天梯 spec 浏览器取证 + Task 1 核验）
- [x] requireAdminApi 矩阵测试通过（未登录/普通用户/ADMIN/SUPER_ADMIN 四态 + 查无此人/软删/MODERATOR，admin-guard.spec ×7）
- [x] admin 两端点路由级守卫冒烟通过（admin-routes.spec ×9：401/403 信封、放行业务分支、非法 body 40000）
- [x] /oauth/dev/callback 返回 200 并回显 code/state，响应头 no-store（Server Component force-dynamic；探活 200）
- [x] billing 资金路径 ≥3 个新 spec 文件且全绿（hold ×8 / capture ×7 / refund-reconcile ×5 = 20 用例）
- [x] 全量单测通过且数量 ≥ 基线 143+新增（191/191，19 文件，+48）
- [x] tsc --noEmit exit 0
- [x] next build exit 0 且 standalone 含 static/public，:3000 探活全 200（health/models/login/dev-callback）
- [x] 项目状态审计.md v1.1 + API 文档锚点核对完成，spec 三件套全勾（审计 v1.1 含 §六深检记录；API v1.12 补 dev callback；索引 v1.4）
