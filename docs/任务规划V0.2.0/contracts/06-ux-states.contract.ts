// > 版本: v0.2 | 更新: 2026-10-14 | 变更: V0.2.0 复核沿用 V0.1.0 冻结稿；⑥价格表主价统一 ¥ 状态
// ============================================================================
// 契约⑥ UX States —— 本规划触及的核心界面五态（空/加载/错误/无权限/成功）。
// 每态必须带 data-testid（e2e 断言锚），文案为中文（ADR-0006 i18n 收敛为默认中文）。
// 视觉约束：需求文档 §五.1 永远浅色、多套浅色主题；组件优先复用 @aidean/ui（packages/ui/src/components/ui/*）。
// ============================================================================

export type UxState = "empty" | "loading" | "error" | "forbidden" | "success";

export interface ScreenStates {
  screen: string;
  route: string;
  task: string;
  states: Record<UxState, { testid: string; copy: string; behavior: string }>;
}

export const SCREENS: ScreenStates[] = [
  {
    screen: "功能关闭态（全站通用）",
    route: "受 FEATURE_GATES 控制的页面",
    task: "TASK-018",
    states: {
      empty: { testid: "-", copy: "-", behavior: "不适用" },
      loading: { testid: "-", copy: "-", behavior: "RSC 服务端判定，无客户端加载态" },
      error: { testid: "feature-check-error", copy: "暂时无法确认功能状态", behavior: "开关读取失败时 fail-open（见 ADR-P002），仅记录日志" },
      forbidden: { testid: "feature-disabled", copy: "该功能暂未开放", behavior: "HTTP 403 页面态 + 返回首页按钮；导航入口同时隐藏" },
      success: { testid: "-", copy: "-", behavior: "正常渲染原页面" },
    },
  },
  {
    screen: "后台 · 功能开关",
    route: "/admin/feature-flags",
    task: "TASK-018",
    states: {
      empty: { testid: "flags-empty", copy: "暂无功能开关（请运行种子）", behavior: "表格占位" },
      loading: { testid: "flags-loading", copy: "加载中…", behavior: "AdminDataTable 骨架" },
      error: { testid: "flags-error", copy: "加载失败，请重试", behavior: "内联 role=status + 重试按钮" },
      forbidden: { testid: "flags-forbidden", copy: "无权限", behavior: "RSC 无 admin.configs.read → redirect /admin" },
      success: { testid: "flags-saved", copy: "已保存，前台即时生效", behavior: "开关切换后内联提示；ConfirmDialog 二次确认关闭核心开关（gateway.chat）" },
    },
  },
  {
    screen: "收藏按钮",
    route: "/models/[slug]、天梯卡片",
    task: "TASK-023",
    states: {
      empty: { testid: "fav-toggle", copy: "收藏", behavior: "空心星" },
      loading: { testid: "fav-pending", copy: "-", behavior: "按钮 disabled + aria-busy，乐观更新" },
      error: { testid: "fav-error", copy: "收藏失败", behavior: "回滚乐观态 + toast" },
      forbidden: { testid: "fav-login", copy: "登录后收藏", behavior: "未登录点击跳 /login?redirect=当前页" },
      success: { testid: "fav-active", copy: "已收藏", behavior: "实心星" },
    },
  },
  {
    screen: "控制台 · 我的收藏",
    route: "/user/console（收藏 Tab）",
    task: "TASK-023",
    states: {
      empty: { testid: "favs-empty", copy: "还没有收藏，去天梯图看看", behavior: "CTA 跳 /models" },
      loading: { testid: "favs-loading", copy: "加载中…", behavior: "列表骨架" },
      error: { testid: "favs-error", copy: "加载失败，请重试", behavior: "重试按钮" },
      forbidden: { testid: "favs-disabled", copy: "收藏功能暂未开放", behavior: "favorites.enabled=false 时 Tab 隐藏；直链显示此态" },
      success: { testid: "favs-list", copy: "-", behavior: "分页列表，目标下线项置灰并可删除" },
    },
  },
  {
    screen: "后台 · 限时优惠",
    route: "/admin/prices（优惠子表）",
    task: "TASK-029",
    states: {
      empty: { testid: "promo-empty", copy: "暂无限时优惠", behavior: "新建按钮" },
      loading: { testid: "promo-loading", copy: "加载中…", behavior: "骨架" },
      error: { testid: "promo-error", copy: "保存失败：<服务端 message>", behavior: "Dialog 内联错误（窗口重叠/时间非法）" },
      forbidden: { testid: "promo-readonly", copy: "只读", behavior: "无 admin.models.write 时隐藏写操作" },
      success: { testid: "promo-saved", copy: "已保存，价格页即时生效", behavior: "刷新子表" },
    },
  },
  {
    screen: "前台价格徽标",
    route: "/pricing、/models/[slug]",
    task: "TASK-029",
    states: {
      empty: { testid: "-", copy: "-", behavior: "无优惠不渲染徽标" },
      loading: { testid: "-", copy: "-", behavior: "RSC 直出" },
      error: { testid: "-", copy: "-", behavior: "解析失败回落 isCurrent 价，不显示徽标" },
      forbidden: { testid: "-", copy: "-", behavior: "不适用（公开）" },
      success: { testid: "price-promo-badge", copy: "限时优惠 · 截至 <日期>", behavior: "原价划线 + 优惠价；价格为 0 显示「限时免费」" },
    },
  },
  {
    screen: "顶栏全局搜索",
    route: "全站 SiteHeader / MobileNav",
    task: "TASK-034",
    states: {
      empty: { testid: "search-no-hit", copy: "没有找到相关结果", behavior: "下拉面板内提示" },
      loading: { testid: "search-loading", copy: "搜索中…", behavior: "防抖 250ms 后发请求，旧请求 AbortController 取消" },
      error: { testid: "search-error", copy: "搜索暂不可用", behavior: "面板内提示，不弹窗" },
      forbidden: { testid: "-", copy: "-", behavior: "不适用（公开）" },
      success: { testid: "search-results", copy: "-", behavior: "按 模型/产品/资讯 分组；↑↓ 选择、Enter 跳转、Esc 关闭" },
    },
  },
];

/** v0.2 增补（TASK-053）：价格表主价统一 ¥/M；原币非 CNY 时必须并列展示官方原价注记；不可归一行显示「价格待核」而非 0 或空白 */
export const PRICING_CURRENCY_DISPLAY = {
  primary: "¥{normalized} / M Tokens",
  sourceNote: "官方 {symbol}{sourcePrice} / {unitLabel}",
  unnormalizable: "价格待核",
  testids: { cell: "price-cell", note: "price-source-note", pending: "price-pending" },
} as const;
