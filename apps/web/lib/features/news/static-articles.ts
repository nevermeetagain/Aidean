/**
 * @deprecated S7（finalize-admin-ia-and-ops-gaps B3/Q2）起前台不再以此兜底渲染（repository 改纯 DB 真源）；
 * 官方文章已迁入 NewsItem 并归入「官方公告」类别，后台 NewsManager 可直接编辑。本文件仅保留作 prisma/seed-official-news.ts 迁库底稿（历史只读）。
 *
 * 资讯静态草稿源（news-admin-cms D5）：
 * - 数据库不可用或表内无已发布条目时，前台列表/详情以此兜底渲染（S7 已移除）；
 * - `prisma/seed-official-news.ts` 幂等种子与 contentMarkdown 字段共用本文件（单一真源）。
 * 内容仅陈述站内事实；《免费模型合集》为置顶固定入口，随运营在后台随时更新。
 */
import type { NewsCategory } from "@aidean/shared";

export interface StaticNewsArticle {
  slug: string;
  title: string;
  summary: string;
  category: NewsCategory;
  /** 业务日 YYYY-MM-DD（种子写入 publishedAt 当日 00:00:00Z 之前的展示日期按原值渲染）。 */
  publishedAt: string;
  pinned: boolean;
  contentMarkdown: string;
}

/** @deprecated S7 起仅供 prisma/seed-official-news.ts 迁库底稿；前台读层已不引用（见 repository 纯 DB 真源）。 */
export const STATIC_NEWS_ARTICLES: readonly StaticNewsArticle[] = [
  {
    slug: "free-model-collection",
    title: "免费模型合集：站内免费入口一览",
    summary:
      "汇总在 Aidean 获取免费模型与免费额度的全部站内入口：控制台免费额度板块、调用测试台 free 池、价格页免费档说明，随运营进度持续更新。",
    category: "热门",
    publishedAt: "2026-09-17",
    pinned: true,
    contentMarkdown: `本合集汇总站内所有「免费」相关入口，作为置顶固定条目随运营进度持续更新。具体可用的免费模型清单与额度以各板块实时展示为准，本文不承诺固定型号或数值。

## 免费额度（配额）在哪里看

登录进入 [用户控制台](/user/console?tab=quotas) 的「免费额度」板块，可查看当前账号各档位的免费用量与刷新周期；未开通任何付费档位的账号也有对应档位的免费用量可查。

## 哪些模型可以免费试调用

[调用测试台](/user/console?tab=playground) 的模型候选来自 free 池：处于免费额度覆盖范围内的模型会直接出现在候选列表中，选择后即可发起非流式与流式试调用，并展示延迟与花费明细。

## 免费与付费如何分档

[价格页](/pricing) 说明各套餐档位的计费口径与免费档边界；免费额度的计量规则与计费规则一致，用尽后按价格页口径转入对应档位的计费。

## 想按性能挑模型

[模型天梯](/ladder) 提供性能维度对比，可先选定目标性能档位，再回控制台确认该模型当前是否在 free 池内。

> 提示：免费池范围与额度会随运营调整，以站内实时展示为准；如发现列表与实际不符，请通过「关于我们」页的联系邮箱反馈。`,
  },
  {
    slug: "console-tab-workspace",
    title: "控制台改版：五板块标签式工作区上线",
    summary:
      "模型配置、免费额度、平台密钥、自有密钥与调用测试台合并为一个标签式工作区，点击切换、草稿保留，专业版/通用版切换右置。",
    category: "功能更新",
    publishedAt: "2026-09-17",
    pinned: false,
    contentMarkdown: `控制台现已改为标签式工作区：模型配置、免费额度、平台密钥、自有密钥与调用测试台五个板块同屏切换，其余板块保持挂载，编辑中的草稿不会因为切换而丢失。

## 通用版 / 专业版切换

「模型配置」板块标题行右侧提供通用版 / 专业版切换：

- **通用版**：按四个档位绑定模型，适合快速配置；
- **专业版**：按具体模型维护 1~99 优先级，适合精细控制。

两种形态共享底层路由配置，切换即时生效。

## 深链与键盘导航

- 地址栏支持 ?tab= 深链直达任一板块（如 \`/user/console?tab=playground\` 打开调用测试台）；
- 键盘用户可用左右方向键、Home/End 在标签间移动。`,
  },
  {
    slug: "partners-products",
    title: "合作页新增合作产品介绍区",
    summary:
      "合作页新增学历助手、论文辅导、科研知识库三个合作产品展示位，内容由后台统一配置，封面与展示图按固定比例呈现。",
    category: "平台动态",
    publishedAt: "2026-09-17",
    pinned: false,
    contentMarkdown: `合作页（/partners）新增合作产品介绍区，当前包含三个展示位：**学历助手、论文辅导、科研知识库**。每个产品位支持封面、标题、小标题、描述、多张展示图、补充说明与视频介绍。

## 内容全部后台可配

以上内容均由管理员在后台（/admin/configs → 合作产品内容）统一配置；关闭某个产品位的展示开关后，前台不再出现该产品，也不会回退显示默认内容。

## 图片视频按固定比例呈现

所有图片与视频均以固定比例容器呈现：封面 16:9、展示图 4:3，不论来源尺寸如何都不会撑破版式；加载失败时显示占位底色而非空白破图。媒体链接仅接受 http(s) 或站内 \`/images/\`、\`/media/\` 安全路径。`,
  },
  {
    slug: "docs-center-online",
    title: "文档中心改版：左侧目录 + 全文搜索",
    summary:
      "文档中心提供快速开始、账号与等级、密钥管理、网关接入、计费与用量、常见问题六个章节，支持关键词过滤与深链直达。",
    category: "功能指引",
    publishedAt: "2026-09-16",
    pinned: false,
    contentMarkdown: `文档中心（/docs）改版为左侧目录 + 右侧正文的阅读布局，共六个章节：快速开始、账号与等级、密钥管理、网关接入、计费与用量、常见问题。

## 目录过滤与深链

- 目录支持关键词过滤，搜索范围覆盖章节标题与正文；
- 每篇文章末尾提供对应功能入口（如控制台、价格页）的一键直达；
- URL hash 与目录联动，例如 \`/docs#gateway\` 可直达「网关接入」章节，方便在协作中引用具体位置。`,
  },
  {
    slug: "ladder-granularity-config",
    title: "天梯图性能轴颗粒度支持后台配置",
    summary:
      "管理员可在后台配置性能轴分隔颗粒值（如 0.1），同分模型按档位并排呈现，无需发版即可调整展示密度。",
    category: "功能指引",
    publishedAt: "2026-09-15",
    pinned: false,
    contentMarkdown: `模型性能天梯图的性能轴分隔颗粒值改为后台可配置（系统配置 → \`ladder_score_granularity\`）。

## 效果示例

例如设置为 **0.1** 时，98.9 与 98.8 分的模型将各占一档；设置更大数值则同档并排。

## 生效方式

颗粒度为纯呈现层状态：切换只改变矩阵档位密度，不发起网络请求；服务端默认值兜底，配置变更后前台下次渲染即生效。`,
  },
];
