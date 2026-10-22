
# UI 设计文档

> 版本: v1.7 | 更新: 2026-10-22 | 变更: **UX-FIX-E 文档对齐（EVD-UX-01 §8 第 1–3 条，以 main 代码为真）**——§2.2 默认主题定稿为青绿 teal；§2.3 字号刻度补 12px「辅助」档；§2.4 写明 `rounded-lg`=16px，M-WIDE 补「页头/页脚同宽」验收读数。前次（v1.6 | 2026-09-29）：**文档树重组轮**——双横幅合一（L1 占位线 v0.7.1 并入本线）+ 迁移至 docs/product/design/。前次（v1.5 | 2026-09-07）：§1 标签栏图标定稿——favicon.ico/icon.png 替换为"A"字标黑底白墨版（用户手绘 A 提取），accent-icon 留用口径更新

> 视觉语言与设计令牌。交互规则见《界面交互文档》，分工：本文档管"看起来怎样"，交互文档管"用起来怎样"。

## 1. 设计语言

- **品牌 logo（2026-08-30 定稿，2026-09-07 重制）**：用户手绘水墨 "Aidean" 字标，素材源 `docs/assets/Aidean文字设计.svg`（2048 描摹矢量）。已去米色背景与 AI 生成水印。header 横版 `public/aidean-logo.png`（791×296 @2x，透明底，墨迹完整含 A 尾扫，四周 8% 呼吸边距；提取口径：lum<160 实心墨体、160–188 软边、≥188 全透明，中性墨 RGB40——原用户资产底缘墨迹截断 93% 密度已证实，故重提取）；SiteHeader 显示 h-8（32px，墨迹约 27px）。favicon `app/favicon.ico`（16/32/48 PNG-in-ICO）+ `app/icon.png`（512）**已定稿（2026-09-07）**：从 header 字标干净资产（列密度定位窗口 [16,252] + 连通域滤弧线/飞溅 33→1 域）提取完整手绘 "A"，白墨化后合成黑底（#020202）居中，aspect 0.977；16px 可读；候选素材（`docs/` 下 4 张）经像素取证均不适 favicon（全字标/水印/纸底），黑底白字全标转用 OG 卡素材。；`app/apple-icon.png`（180 全字）、分享卡 `app/opengraph-image.png`（1200×630 宣纸底 #F8F3E5 全字）暂沿用。口径：小尺寸用 "A" 特写保辨识度，大尺寸用全字水墨；logo 在浅色底上直接使用墨色原稿，不做主题色染色。

- **结构参考**：[SiliconFlow](https://siliconflow.cn/)（首页区块节奏、滚动渐入、导航信息架构）+ [Canva 中国](https://www.canva.cn/)（banner 视觉与产品引导式长页）+ [Figma](https://www.figma.com/)（工具平台的多级菜单与留白）。
- **信息密度**：继承快科技 CPU 天梯图的"扫一眼即对比"；数据优先、克制现代、以表格与图表为主体，不做营销式大图堆砌。
- **基调**：永远浅色，不提供深色模式。

## 2. 设计令牌（Tailwind）

### 2.1 色彩

| 令牌 | 用途 |
|---|---|
| `primary` | 品牌主色：链接、主按钮、榜单高亮、当前排名 |
| `background` / `foreground` | 页面底 / 主文字（**仅浅色**） |
| `muted` / `muted-foreground` | 次要面 / 次要文字 |
| `card` / `border` | 卡片（模型站卡片、详情面板）/ 分隔线 |
| `accent` | 价格、评分等数据强调 |
| `success` / `warning` / `destructive` | 可用率/好评率的三档状态色、操作反馈 |
| 排名色阶 | 天梯图名次区段色（如 1-3 / 4-10 / 11+ 渐进），用 `accent` 的透明度阶梯，不引入额外色板 |

### 2.2 多套浅色主题

- 主题切换 = **多套浅色主题（不同主色色相）**间切换，如 青绿 teal（**默认**）/ 靛蓝 indigo / 暖橙 orange；背景/表面永远浅色。**默认主题定稿（2026-10-22，UX-FIX-E，以代码为真）**：默认 = teal——`app/globals.css` `:root` `--primary: #0f766e`（teal-700）/ `--accent: #14b8a6`，`stores/uiStore.ts` `theme` 初值 `"teal"`；原「靛蓝（默认）」口径作废。
- 实现：CSS 变量按主题命名空间分组（`[data-theme="indigo"|"teal"|"orange"]`），`primary`/`accent` 及其透明度阶梯随主题切换；状态色（success/warning/destructive）跨主题不变。
- 主题状态存 `uiStore`，切换即时生效、持久化到 localStorage；`next-themes` 类方案的 `dark` 分支移除。

### 2.3 字体与排版

- 中文：系统栈（PingFang / Microsoft YaHei / Noto Sans CJK）；英文/数字：Inter 或系统等宽。
- 数据（价格、评分、排名）统一 `tabular-nums`，保证表格与柱状图数字对齐。
- 刻度：13/14/16/20/24/32，正文 14，页面标题 24–32（H1 上限 32px，UX-15）。
- **辅助档 12px（2026-10-22，UX-FIX-E）**：12（Tailwind `text-xs`）列为**辅助**档，仅用于标签/徽章/表格注释/时间戳/面包屑等辅助信息，不得用于正文与标题；本条只修文档口径，不新增字号令牌、不改代码。

### 2.4 间距、圆角与留白

- 间距基于 4px 栅格（Tailwind 默认）。
- 卡片圆角 `rounded-lg`（**= 16px**，取 `app/globals.css` `--radius-lg: 16px`），按钮/标签 `rounded-md`，头像/徽章 `rounded-full`。
- **正文容器（2026-09-03 修订，M-WIDE）**：~~banner 之下的首页区块及内容页正文统一 `max-w-6xl~7xl mx-auto px-6`~~ → **全站全宽 `w-full` + 少量留白 `px-4 md:px-6`**（16/24px），header/footer 同口径。修订原因：大屏（≥1920px）居中容器两侧留白超 600px，天梯排行表列多需横向信息密度（对齐快科技天梯图形态）。文本段落块内部维持 `max-w-2xl/3xl` 自约束保证行可读性，不受容器全宽影响。**验收读数（2026-10-22 补，UX-14）**：页头 `SiteHeader` 与页脚 `SiteFooter` 外层容器均为 `w-full px-4 md:px-6`，与正文同宽——1440 宽下页头、页脚、正文左右留白一致（各 24px），不得出现页头/页脚居中 `max-w-*` 而正文全宽（或反之）的宽度跳变。

## 3. 首页布局与滚动加载

- **区块顺序**：菜单栏 → banner → 平台介绍 → 模型 → 产品 → 路线图 → 合作 → 关于（关于置底）。
- **进场动画（2026-09-03 修订，M-PERF A3）**：~~各区块内容随滚动进入视口渐显（IntersectionObserver）~~ → **纯 CSS 进场即播**：元素渲染即播放 200ms `fade-up`（`.reveal-in`，见 `globals.css`），SSR 输出即为可见态。修订原因：① 首屏内容此前被 `opacity-0` 包裹需等 hydration 点亮，感知延迟大；② IO `threshold 0.15` 存在「超高 section 永久不可见」边界缺陷。代价：滚动触发渐入语义移除；`prefers-reduced-motion: reduce` 用户静态呈现（CSS 媒体查询）。首屏直接渲染保证 LCP 的原则不变；重数据区块（天梯图）滚动到近视口再取数不变。
- **合作 logo 墙**：多行横向滚动（CSS `@keyframes` 平移循环），奇数行右→左、偶数行左→右；列表内容复制一份实现无缝循环；`hover` 暂停（`animation-play-state: paused`）；logo 灰度化，hover 恢复品牌色。

## 4. 核心组件规范

| 组件 | 要点 |
|---|---|
| LadderRankingTable 天梯排行表（2026-09-03 M-LADDER 重写，替代 LadderMatrixTable 档位矩阵） | 快科技式连续排行：一行=一个模型/站点，rank 徽章 Top3 强调（1 号实底/2-3 浅底）；列=排名/模型(Link slug)/厂商徽章(品牌色点)/综合分/价格（models）或响应速度+在线率（stations）；行 hover 高亮；支持"表格 / 柱状图"视图切换 |
| PriceBarChart 价格柱状图 | ECharts；横轴站点名、纵轴价格（¥/M Tokens）；输入/输出/缓存命中三系列；由低到高排序 |
| StationCard 模型站卡片 | 网格布局（参考 ai-bot.cn，非一行一个）；右下角"官网"按钮外链 |
| ModelDetailTabs 详情多 Tab | Tab1 详情 / Tab2 站点及资费；Tab 切换不刷新页面 |
| FilterBar 筛选栏 | 筛选即生效，图表与列表联动立即更新 |
| ScoreBadge 评分徽章 | 总分 + 四类分（官方/实测/口碑/自测）悬浮明细 |
| PartnerMarquee 合作 logo 墙 | 多行交替方向循环滑动；见 §3 |
| CoreInfoCard 核心信息卡 | 控制台余额/等级/用量卡片；背景流动模糊渐变动效，见 §7 |

## 5. 图表规范（ECharts）

- 统一封装 `EChart` 组件：主题随浅色主题令牌切换、响应式 resize、`tabular-nums`。
- 价格柱状图占比约束：在模型站 Tab 中高度受限且可折叠隐藏（需求口径）。
- 评分类可用雷达图（四类分）或堆叠柱。

## 6. 图标

lucide-react（沿用旧依赖），线性风格，尺寸 16/20/24。

## 7. 流动模糊渐变特效（控制台核心信息）

> 需求来源（AE 制作思路转译为 Web 实现）：多个大小/颜色不同的椭圆 + 模糊 + 旋转动画构成层次；波形变形椭圆垫底；预合成截半拼接制造错落感；位移/旋转动画 + 高斯模糊柔化 + 湍流置换强化动态；调透明度做循环。

### 7.1 视觉构成（与 AE 步骤一一对应）

| AE 步骤 | Web 对应 |
|---|---|
| 1–3. 多个椭圆、不同颜色/大小、模糊 + 旋转 | 多个绝对定位的圆角块（`border-radius: 50%`），各自 `filter: blur()` + `rotate` 无限动画，颜色取主题 `primary/accent` 的透明度变体 |
| 4–5. 波形变形椭圆垫底 | 底层椭圆叠加 SVG `feTurbulence + feDisplacementMap`（湍流置换）做有机形变 |
| 6–7. 预合成截半 + 拼接错落感 | 容器 `overflow: hidden` 裁切椭圆出边缘，只露一半；两组错位排布 |
| 8. 位移 + 旋转动画 | `@keyframes` 组合 `translate + rotate`，各层速度/方向错开 |
| 9. 高斯模糊柔化边缘 | `filter: blur(40–80px)` |
| 10. 湍流置换强化动态 | SVG filter 动画（`<animate>` baseFrequency）或 Canvas 备选 |
| 11. 透明度循环 | 关键帧 `opacity 0.5→0.8→0.5` 无限循环 |

### 7.2 实现与约束

- **推荐方案**：纯 CSS keyframes + 少量 SVG filter（feTurbulence）；比 Lottie/Canvas 依赖少、可随主题令牌换色。Lottie 仅在美术精修动效交付后作为替代。
- **性能**：容器 `will-change: transform`、动画只动 `transform/opacity`（合成层）；椭圆数量 ≤ 5；单卡片动效层独立，不与列表滚动同层。
- **降级**：`@media (prefers-reduced-motion: reduce)` 停止动画，保留静态渐变背景。
- **应用范围**：仅控制台核心信息卡（余额/等级/用量）；不用于天梯图、表格等数据密集区。
- 文字对比度：动效层置于文字之下（`z-index` 分层），保证前景文字满足对比度（≥4.5:1）。

## 8. 组件库分层

- `src/components/ui/`：原子组件（button/input/…，shadcn 风格自建）。
- `src/components/common/`：通用复合组件（DataTable、EChart、ConfirmDialog、SearchBar…）。
- `src/components/ladder/`、`admin/`、`layout/`、`resources/`：业务组件。

> 教训继承：旧体系组件多版本并存（11 个首页、4 个登录页）。新项目**一个组件只留一个版本**，迭代靠 git 历史，不留 V1~V7 副本。
