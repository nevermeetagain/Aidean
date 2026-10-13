# 任务清单 redesign-nav-content-pages

> 版本: v4 | 更新: 2026-09-17 | 变更: 收口轮——T1/T2/T3/T5/T6/T8 凭运行取证勾选；构建改判通过；后台保存→前台回读→还原闭环与真实点击导航取证登记；视觉审美判定保留用户
> 前次（v3）：按协调者收窄——仅登记 home/models 14/14 专项与构建失败；勾选仅代表已取证项，其余维持未验收

## L1 阶段 A：合作产品 partners-only（本轮交付，运行验收已取证）

> 目标：/partners 三产品位后台可配置 + SafeImage 强约束；前置：shared 契约先行、不改 Product/迁移；交付物：契约+后台+前台+测试+文档同步。

### Task 4.1 合作内容契约与配置

#### SubTask 4.1.1 共享契约与注册表
- 【目标】: 以 SystemConfig 三键承载合作内容，替代 Product 扩表（勘误），后台可配置学历助手/论文辅导/科研知识库。
- 【范围】: 修改 `packages/shared/src/index.ts`、`schemas/admin.schema.ts`、`constants/admin-config.constants.ts`；新建 `schemas/site-content.schema.ts`。
- 【验收】: PartnerContentSchema 严格校验字段与媒体白名单；ADMIN_CONFIG_KEYS 含三键且旧键规则不变；kind:partner 归一化拒绝非法 JSON/媒体。
- 【验证命令】: `npm --prefix E:/Code/Aidean/packages/shared run typecheck`
- 【产出】: 共享契约 + 注册表三键；41 项测试中契约相关用例通过。

#### SubTask 4.1.2 后台编辑与读写链路
- 【目标】: 管理员经既有 configs API 编辑合作内容并失效前台。
- 【范围】: 修改 `apps/web/app/api/v1/admin/configs/route.ts`（partners revalidate）；新建 `apps/web/components/admin/SiteContentEditor.tsx`；修改 `apps/web/app/(admin)/admin/configs/page.tsx`；修改 `apps/web/prisma/seed.ts`（仅默认声明，未执行）。
- 【验收】: GET 形态不变；PUT 校验→upsert→审计→revalidate /partners；非法键/值 40000；表单描述性中文标签，加载成功前不可保存。
- 【验证命令】: `npm --prefix E:/Code/Aidean/apps/web test -- lib/features/auth/__tests__/admin-configs.spec.ts lib/features/auth/__tests__/site-content.spec.ts`
- 【产出】: SiteContentEditor 表单；configs 15 例通过。
- 【依赖】: SubTask 4.1.1

### Task 4.2 合作产品前台与图片约束

#### SubTask 4.2.1 SafeImage 与 /partners 渲染
- 【目标】: 固定比例/占位展示，缺省与异常不 500、不虚构资质。
- 【范围】: 修改 `apps/web/app/(site)/partners/page.tsx`；新建 `apps/web/components/common/SafeImage.tsx`。
- 【验收】: 三键读取逐项解析；缺失/异常回退默认；enabled=false 隐藏不复活；全关空态；媒体白名单+≤500；square≤200px、其余≤960px；视频 16:9/≤432px/无自动播放；SSR 无 `<video>` 于无视频默认态。
- 【验证命令】: `npm --prefix E:/Code/Aidean/apps/web test -- lib/features/auth/__tests__/site-content.spec.ts`
- 【产出】: site-content.spec.ts 21 例通过（含 SSR 与占位断言）。
- 【依赖】: SubTask 4.1.1

#### SubTask 4.2.2 回归与类型门禁
- 【目标】: 既有 configs/parity 守卫同步新键，不破坏旧键规则。
- 【范围】: 修改 `apps/web/lib/features/auth/__tests__/admin-configs.spec.ts`、`admin-config-seed-parity.spec.ts`（11→14 键）。
- 【验收】: 合计 3 文件 41 测试 PASS；shared 与 web tsc --noEmit 0 错误。
- 【验证命令】: `npm --prefix E:/Code/Aidean/apps/web test -- lib/features/auth/__tests__/admin-configs.spec.ts lib/features/auth/__tests__/site-content.spec.ts lib/features/auth/__tests__/admin-config-seed-parity.spec.ts`
- 【产出】: 41 PASS（configs 15 / parity 5 / site-content 21）；两包 typecheck 0 错误。
- 【依赖】: SubTask 4.2.1

### Task 4.3 运行验收（✅ 收口轮取证）

#### SubTask 4.3.1 构建与浏览器取证
- 【目标】: 证明新源码真实上线的后台编辑→前台回读与显示约束。
- 【范围】: 只读核验当前实现；不改动代码。
- 【验收】: 新构建后 localhost:3000：后台保存→重载 /partners 生效；enabled=false 不复活；图片失败占位；视频可播；375px 无横向溢出；测试数据还原。
- 【验证命令】: Playwright standalone 脚本探测 127.0.0.1:3000（dev，工作树产物）；管理员会话 curl 闭环（登录→PUT→前台回读→还原 PUT）。
- 【产出】: 后台保存→前台回读闭环取证：探针副标题/二维码 URL PUT 后 `/partners`、`/about` SSR 命中，随后还原并复验，测试数据零残留；375/1440px 共 12 组无横向溢出；封面容器 DOM 实测 505×284（16:9）+「图片待补充」文字占位×3。边界：`onError` 图片失败占位与 enabled=false 不复活为单测断言（未注入故障/未真实关闭产品位）；默认配置无视频素材，真实播放未测。完整证据表见 `docs/导航与内容页面验收.md` v1.2。
- 【依赖】: SubTask 4.2.2

## L1 阶段 A（其余需求，✅ 收口轮完成）

> 2026-09-17 收口轮在本工作树全部实装并运行取证，证据表见 `docs/导航与内容页面验收.md` v1.2；「最美观更融洽」的视觉审美判定保留用户确认。

- [x] T1 导航改造（一级「模型」→「资讯 /news」，产品下拉前三项=模型天梯图→模型服务提供商→AideanWiki，页脚锚点，e2e 适配：header-links.spec 1/1；导航 API 与 `lib/navigation.ts` 共用来源；真实点击「资讯」→URL `/news`）
- [x] T2 资讯页（`(site)/news/`：`page.tsx`+`items.ts`+`[slug]/page.tsx`，列表与详情探针 200；内容为站内指南，不伪造行业新闻）
- [x] T3 服务商页 /providers（能力卡+接入步骤+计费透明+CTA；375/1440 无溢出）
- [x] T5 关于页（SystemConfig 新增 `about.contactEmail`/`about.wechatQrUrl`，白名单 14→16 键；`AboutContactEditor` 挂载 /admin/configs，邮箱必填/URL 白名单校验+实时预览；空串渲染实测 200×200「二维码待上传」占位，占位 SVG 文件删除且无引用；#contact 锚点）
- [x] T6 文档页验收（目录/搜索（「密钥」命中）/hash 深链（SSR 已含正文）/375px 运行取证通过）
- [x] T8 天梯图居中美化（/models h1 实测 textAlign=center、左右边距对称 112.5px；原筛选与图表交互不变）
- [x] 文档全景同步（API v1.30 §5.8.2 ↔ API架构 v1.4 §7.2 锚点互引；目录结构 v3.1 补 news//providers/；界面交互 v2.8 §十一；文档索引、验收 v1.2、复核 v1.4 §2.3）

## 验证与归档

- [x] 焦点测试 41 PASS + shared/web typecheck 0 错误（2026-09-17，命令见 SubTask 4.2.2；收口轮已扩至全量 477+55，见下）。
- [x] 聚焦专项 e2e：home.spec.ts + models.spec.ts 14/14 passed（根配置 `--project=web --workers=1`，34.4s，2026-09-17）。
- [x] next build：**通过**（46.4s，收口轮）。前次失败两因均已关闭：about 注册表 email/qrImage 中间态类型错误已收口；`next/dist/pages/_app` 缺文件经 `pnpm install --force --ignore-scripts` 恢复（外部删除者未定位，留观）。
- [x] Playwright/浏览器冒烟与后台编辑取证：6 页 + /admin 守卫探针、后台保存→回读→还原闭环、占位 200×200、居中对称边距、16:9 容器、375/1440 溢出 12 组、header-links 1/1、/docs 搜索、真实点击导航均取证；截图留存 `/tmp/shots/`，视觉审美判定保留用户（当前模型无图像输入，以 DOM 几何+被测交互替代）。
- [x] 全量门禁复跑：apps/web 477 项 + shared 55 项单测、turbo typecheck 0 错误、header-links 1/1、真实点击导航 0 页面错误（2026-09-17 收口轮）。
- [x] 文档全景同步与规格勘误（v4：API/架构/目录/界面/索引/验收/复核均带版本标记与锚点互引，符合铁律 2/3）。
- [x] checklist.md 收口（随 v2 逐项按证据核销；保留项与边界见两份文件末尾）。
