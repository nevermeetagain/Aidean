import Link from "next/link";
import { Fragment } from "react";

import { filterNavByFeatureFlags, NAV_ITEMS, type NavItem } from "../../lib/navigation";
import { getFeatureFlags } from "../../lib/features/flags/service";
import { ThemeSwitcher } from "../common/ThemeSwitcher";
import { HeaderSession } from "./HeaderSession";
import { MobileNav } from "./MobileNav";
import { GlobalSearch } from "./GlobalSearch";

/**
 * 顶部导航单项（server 组件，零客户端 JS）：
 * 无子项渲染平链接；有子项渲染纯 CSS 下拉——group-hover / group-focus-within 展开，
 * 默认 opacity-0 + pointer-events-none（防透明层劫持悬停），展开时恢复指针事件。
 *
 * 导航交互优化（2026-09-28）：
 * - transition duration 150ms → 75ms：下拉出现/消失更快，消除"黏滞感"
 * - pt-2 → pt-1：缩小触发区与面板间的桥接垫层，减少鼠标滑过间隙时的闪烁
 * - 增加 translate-y-1 → translate-y-0：轻微位移动画，视觉反馈更跟手
 */
function NavEntry({ item }: { item: NavItem }) {
  if (!item.children) {
    return (
      <Link
        href={item.href}
        className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-primary"
      >
        {item.label}
      </Link>
    );
  }
  return (
    <div className="group relative">
      <Link
        href={item.href}
        aria-haspopup="true"
        className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-primary"
      >
        {item.label}
        {/* 装饰性下拉箭头（随触发链接同色） */}
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className="h-3 w-3 fill-none stroke-current stroke-[1.5] transition-transform duration-75 group-hover:rotate-180"
        >
          <path d="M2.5 4.5L6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      {/* pt-1 垫层桥接触发区与面板，保证悬停移动不断链 */}
      <div className="pointer-events-none absolute left-0 top-full z-10 pt-1 opacity-0 translate-y-1 transition-all duration-75 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0">
        <div className="min-w-[10rem] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {item.children.map((child, i) => {
            const prev = item.children![i - 1];
            // #71 分组渲染：group 变化处插入组头（非链接、role=presentation 不抢焦点/Tab 链路）
            const groupHead =
              child.group && prev?.group !== child.group ? (
                <div
                  role="presentation"
                  className="px-3 pt-2 pb-0.5 text-[11px] font-medium tracking-wide text-slate-400"
                >
                  {child.group}
                </div>
              ) : null;
            return (
              <Fragment key={child.key}>
                {groupHead}
                <Link
                  href={child.href}
                  className="block rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary"
                >
                  {child.label}
                </Link>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * 站点头部（M-PERF B2 配套改造后全静态化）。
 * 登录态原在 RSC 内经 getSession()→cookies() 读取，这使渲染树携带动态 API：
 * /models/[slug] ISR 化后触发「static→dynamic at runtime」硬错误（Next 14 非 PPR
 * 对 cookies 无 Suspense 动态洞机制）。现登录态整体迁至客户端槽位 HeaderSession
 * （挂载后探测 /api/v1/auth/me），本组件零请求态动态 API，可进任意静态/ISR 壳。
 *
 * TASK-018 功能开关驱动的导航隐藏：本组件读 getFeatureFlags()（unstable_cache tag
 * feature-flags，DB 读缓存、非 cookies()/headers 等请求态 API）——与 B2 静态化不冲突：
 * unstable_cache 属 ISR 兼容数据读（各页本就如此取数），构建期 DB 缺失由 fail-open 兜底不崩；
 * 后台开关 PATCH 走 revalidateTag("feature-flags")，令承载本头部的页面在下一请求刷新，前台即时生效。
 */
export async function SiteHeader() {
  const navItems = filterNavByFeatureFlags(NAV_ITEMS, await getFeatureFlags());
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
      <div className="flex h-[64px] w-full items-center justify-between gap-6 px-4 md:px-6">
        {/* 品牌 logo：水墨手写体（用户设计稿生成，透明底；见 docs/assets/Aidean文字设计.svg） */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Aidean 首页">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/aidean-logo.png"
            alt="Aidean"
            width={103}
            height={28}
            className="h-7 w-auto"
          />
          <span className="hidden text-[11px] font-semibold tracking-[0.2em] text-slate-400 md:inline">AIDEAN</span>
        </Link>

        {/* 桌面端八项导航（首页+资讯+产品/价格/文档/路线图/合作/关于；产品下拉含天梯图/服务商/云服务天梯图/产品）。
            UX-01（EVD-UX-01 §6）：断点 md→xl——768/1024 展开八项+搜索会横向溢出 103px、lg 在 1024 逐字竖排，
            故 <1280 统一走 MobileNav 抽屉。UX-14：容器全宽 + px-4/6 留白（UI §2.4 M-WIDE，与正文同口径）。 */}
        <nav aria-label="主导航" className="hidden items-center gap-0.5 xl:flex">
          {navItems.map((item) => (
            <NavEntry key={item.key} item={item} />
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          {/* 桌面端顶栏搜索（TASK-034，唯一搜索入口：桌面此处 / 移动端 MobileNav 抽屉内） */}
          <div className="hidden xl:block">
            <GlobalSearch variant="desktop" />
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1.5 shadow-sm sm:flex">
            <ThemeSwitcher />
          </div>
          <HeaderSession />
          {/* 抽屉导航（<1280px，UX-01）：替换此前 aria-hidden 装饰汉堡占位，提供可用导航；
              与桌面端共用同一按开关过滤后的 navItems（TASK-018，单一真源，client 端不二次取数）。 */}
          <MobileNav items={navItems} />
        </div>
      </div>
    </header>
  );
}
