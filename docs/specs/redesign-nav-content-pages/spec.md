# 导航与内容页面改版 Spec

> change-id: `redesign-nav-content-pages` | 语言: 中文 | 版本: v3 | 创建: 2026-09-17 | 更新: 2026-09-17

> 批准记录：用户 2026-09-17 六点指示（①/models 居中美化 ②/partners 后台可配置合作产品 ③/about 关键信息可配置+联系方式+二维码+显示约束 ④/docs 飞书样式 ⑤导航「模型」→「资讯」 ⑥产品下拉=天梯图+服务商）；后续用户与协调者多轮收窄为 **partners-only 本轮交付**，本版按实际实现修正 v1 错误假设。继承 [开发流程](../../governance/开发流程.md) 四层级六字段。

## 状态

- **已实现并静态核验**：仅「合作产品后台可配置」「图片显示强制约束（SafeImage）」——41 项 Vitest 通过 + shared/web 类型检查通过；浏览器/构建/上线验收仍待协调者执行，未宣告完成。
- **未开工**：导航改版、/news、/providers、/about、/models 居中美化。
- **父级代实现、仅 tsc 通过、无运行证据**：/docs。

## v1 勘误（正确假设以本版为准）

- v1「Product 表扩列 coverUrl/mediaJson + 迁移 + /admin/products 配置」**错误**：`/products` 读取全部 ACTIVE Product，混入合作行会污染平台产品页。实际采用 SystemConfig 隔离三键 `partners.education` / `partners.paper` / `partners.research`，无 schema/迁移改动，`/admin/products` 不承载合作内容。
- v1 「API 接口文档改 products 契约字段」不成立；实际新增 §5.8.1 [合作内容配置契约](../../architecture/API接口文档.md#partner-content-api)。
- SafeImage 实际 API：必填 `alt`；可选 `src`、`ratio=video|square|photo`、`fit=cover|contain`、`className`、`placeholder`；square 上限 200px、其余 960px；原生 `<img>`，无服务端抓取/优化。媒体 URL 白名单 http(s)（无凭据）或 `/images/`、`/media/` 本地路径，后缀限图片 PNG/JPEG/WebP/GIF/AVIF、视频 MP4/WebM，≤500 字符；后缀校验不代表 MIME/体积/远端可用性验证。
- v1 「回退静态三项」实况：内容缺失/异常回退对应默认资料（不虚构资质/奖项）；**合法 enabled=false 不复活**；全关闭呈现空态。
- v1 「/docs 六节文档中心」由协调者另行实现，仅有类型检查证据；本 spec 的文档页 Requirement 未按其取证验收。

## 为什么（Why）

合作/关于/文档页原为空壳占位；本次仅交付 /partners 合作产品展示与后台配置。选用 SystemConfig 而非扩 Product：见《[合作产品内容配置](../../product/design/合作产品内容配置.md)》范围与决策。

## 变更清单（本版实际落地）

- 契约：`packages/shared` 新增 `schemas/site-content.schema.ts`（内容/媒体校验、PARTNER_DEFAULTS、parsePartnerContent）；`admin.schema.ts` ADMIN_CONFIG_KEYS +3 并放宽 configValue 上限至 10000；`constants/admin-config.constants.ts` 注册 partners 组（kind:partner 归一化）；`index.ts` 导出。
- 后台：`components/admin/SiteContentEditor.tsx` 结构化中文表单（含 enabled、封面、多图、notes、视频），挂载于 `(admin)/admin/configs/page.tsx`；经既有 GET/PUT `/api/v1/admin/configs`，成功 revalidate `/partners`。
- 前台：`(site)/partners/page.tsx` 读三键渲染；`components/common/SafeImage.tsx` 固定比例/占位；邮箱 591547726@qq.com 当前硬编码于页脚文案（关于页配置化未做）。
- seed：仅补三键默认声明（未执行；seed 有破坏性 deleteMany，禁止当上线命令）。
- 测试：`lib/features/auth/__tests__/site-content.spec.ts`（21 例）+ 既有 configs/parity 两套同步（合计 41 PASS）。
- BREAKING：无。configs 既有响应形态与旧 11 键规则不变。

## ADDED Requirements（State: 已实现/待验收）

### Requirement: 合作产品后台可配置（State: 代码+单测完成，运行验收待补）
合作内容 SHALL 经 SystemConfig 三键配置，字段 enabled/title/subtitle/description/coverUrl/images(≤6)/notes/videoUrl，严格 schema 校验，SafeImage 固定容器渲染；DB 缺失/查询失败回退默认资料且页面不 500；enabled=false 保持隐藏。

#### Scenario: 配置生效（待浏览器取证）
- **WHEN** 管理员在 /admin/configs 保存某产品新封面并重载 /partners
- **THEN** 对应卡片显示新封面且不撑破布局（旧 standalone 响应不作为证据）。

### Requirement: 图片显示强制约束（State: 组件+单测完成；浏览器宽窄屏取证待补）
凡后台配置 URL 的图片 SHALL 经 SafeImage：固定比例容器、object-fit、失败文字占位；URL 白名单+长度≤500；不代理/抓取任意服务端 URL。

#### Scenario: 超大图防御（待取证）
- **WHEN** 配置 4000×3000 大图
- **THEN** 显示仍为容器尺寸，无横向滚动/布局位移。

## ADDED Requirements（未实现，保留原编号待后续 change-id 或本规格续轮）

### Requirement: 关于页关键信息可配置（State: 未开工）
/about 联系方式（邮箱默认 591547726@qq.com、二维码占位、#contact）读 SystemConfig，含默认回退。**v1 的 about.contactEmail/about.wechatQrUrl 两键设计未经实装，届时以当轮契约为准。**

### Requirement: 导航信息架构（State: 未开工）
一级导航「模型」→「资讯 /news」、产品下拉三项、页脚联系锚点——均未改动，现状仍为原导航。

### Requirement: 资讯与文档不留空（State: /news 未开工；/docs 协调者实现、仅 tsc、无运行证据）

## v3 证据修订（2026-09-17，协调者指示文档代理仅记录，不改代码）

- 导航/资讯/服务商/文档/模型居中等页面已按实现方报告落地（news 数据源 `items.ts`、providers 静态、docs 六篇+搜索+hash、models 居中）；这些为**实现声明**，运行/视觉验收未完成（截图工具无法向模型提供图像）。
- /about 两键 `about.contactEmail` / `about.wechatQrUrl` **实现中**：shared 注册表已见 16 键（`packages/shared/src/constants/admin-config.constants.ts` 文档代理只读核对），但完成确认未收到，生产构建因该 email 规则类型不匹配**失败**（协调者报告）——此前 tsc/vitest 475 通过的证据不覆盖此新断面。
- 聚焦专项：根配置 `--project=web --workers=1` home.spec.ts + models.spec.ts **14/14 passed（34.4s）**——本轮唯一新增正向 e2e 证据。
- 全量 e2e 仍为 26/27/5（auth/SSO）；auth 重跑间歇（6 项 5/1），api-auth-contract 的 Cookie 试改已还原、无认证变更保留；嵌套 e2e 中断 8 failures。全量回归与发布门禁均未通过。
- 证据页：[导航与内容页面验收](../../archive/导航与内容页面验收.md)。API 文档 16 键同步**挂起**，待 about 实现确认。

## 非目标

- 图片上传/文件存储/MIME 与体积服务端校验（仅 URL 后缀+长度白名单）。
- 资讯后台管理、移动端汉堡菜单功能化。
- 不触碰 markup_rate/token_multiplier 输出；不修改导航/新闻/docs 代码与根任务。
