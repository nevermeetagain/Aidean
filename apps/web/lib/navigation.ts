import { productCategoryLabel } from "./product-label";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  /**
   * 二级子项（仅产品等需要下拉的一级项使用；href 可为页内锚点）。
   * 桌面端由 SiteHeader 以纯 CSS hover/focus-within 下拉呈现，保持 server 组件。
   */
  children?: readonly NavItem[];
  /**
   * #71 二级分组头（仅 children 项上有意义，顶层项禁用）：非链接的分组标签
   * （特供/开源/合作）。SiteHeader 按连续同 group 值渲染组头；省略 = 平铺不分组。
   */
  group?: string;
}

/**
 * 八项主导航（顺序为权威契约，与 /api/v1/system/navigation 保持一致，顺序不可调整）。
 * 首页为首位项（用户要求点击返回首页）；天梯图不再作为一级入口，改由「资讯 /news」承接一级浏览；
 * 产品项含二级子项（add-subplatform-showcase-pages + #71 中文命名与二级分类）：
 * 前两位 = 模型天梯图 / 模型服务提供商——主站服务而非产品，不进分类组、绑定不变（管理者 2026-09-28 裁决）；
 * 其后按二级分类分组（group 值唯一来源 lib/product-label.ts，新增分类只需改 PRODUCT_CATEGORY_LABELS）：
 * 特供（信源引擎机器人 AideanBot，slug=wechatrag 生态旧名 WeChatRag，映射登记于
 * docs/specs/add-subplatform-showcase-pages/spec.md）、开源（自动化舰队引擎 AideanFleet）、
 * 合作（独立知识百科 AideanWiki、论文审查助手 AideanThesis）、其它（技能云 SkillsCloud，
 * category 为空，与 /products 的「其它」组归口一致）。
 * 下拉 label 用纯中文名（下拉空间紧凑）；介绍页/列表页用双语（lib/product-label.ts productLabel）。
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: "home", label: "首页", href: "/" },
  { key: "news", label: "资讯", href: "/news" },
  {
    key: "products",
    label: "产品",
    href: "/products",
    children: [
      { key: "products-ladder", label: "模型天梯图", href: "/models" },
      { key: "products-providers", label: "模型服务提供商", href: "/providers" },
      { key: "products-wechatrag", label: "信源引擎机器人", href: "/products/wechatrag", group: productCategoryLabel("OFFERING") },
      { key: "products-aideanfleet", label: "自动化舰队引擎", href: "/products/aideanfleet", group: productCategoryLabel("OPEN_SOURCE") },
      { key: "products-aideanwiki", label: "独立知识百科", href: "/products/aideanwiki", group: productCategoryLabel("PARTNER") },
      { key: "products-aideanthesis", label: "论文审查助手", href: "/products/aideanthesis", group: productCategoryLabel("PARTNER") },
      { key: "products-skillscloud", label: "技能云", href: "/products/skillscloud", group: productCategoryLabel(null) },
    ],
  },
  { key: "pricing", label: "价格", href: "/pricing" },
  { key: "docs", label: "文档", href: "/docs" },
  { key: "roadmap", label: "路线图", href: "/roadmap" },
  { key: "partners", label: "合作", href: "/partners" },
  { key: "about", label: "关于", href: "/about" },
];
