"use client";

/**
 * 站点页脚（v1.9 改版）：
 * - 布局：三栏（产品/资源/公司）收入单一包裹容器，共占整体宽度 50% 并水平居中，
 *   消除原先三栏铺满全宽导致的过大间隔；窄屏（<sm）退化为全宽纵向堆叠；
 * - 天梯页隐藏（v1.9 需求：所有天梯图不要有底部信息栏）：/models 与 /ladder 不渲染页脚。
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PRODUCT_FALLBACK } from "../../lib/product-fallback";
import { productLabel } from "../../lib/product-label";

interface FooterLink {
  label: string;
  href: string;
}

// #72 页脚产品列改走统一底稿 + 中文显示名（#71 收口后此处曾是第 5 份硬编码清单，
// 与顶部导航双语口径割裂）。bilingual=false 与导航同口径：页脚空间紧凑取纯中文。
const PRODUCT_LINKS: readonly FooterLink[] = PRODUCT_FALLBACK.map((f) => ({
  label: productLabel({ name: f.name, displayName: f.displayName }, { bilingual: false }),
  href: `/products/${f.slug}`,
}));

const RESOURCE_LINKS: readonly FooterLink[] = [
  { label: "文档", href: "/docs" },
  { label: "公告", href: "/announcements" },
  { label: "API", href: "#" },
];

const COMPANY_LINKS: readonly FooterLink[] = [
  { label: "关于", href: "/about" },
  { label: "合作", href: "/partners" },
  { label: "联系", href: "/about#contact" },
];

/** 天梯图页面（无底部信息栏）：/models 模型天梯、/ladder 云服务天梯 */
const LADDER_PATHS = ["/models", "/ladder"];

function FooterColumn({ title, links }: { title: string; links: readonly FooterLink[] }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</h3>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-slate-600 transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const pathname = usePathname();
  if (LADDER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  return (
    <footer className="border-t border-slate-200 bg-slate-50/60">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        {/* 三栏共占整体宽度 50% 居中（窄屏退化全宽堆叠） */}
        <div className="mx-auto flex w-full flex-col gap-10 sm:w-1/2 sm:min-w-80 sm:flex-row sm:justify-between">
          <FooterColumn title="产品" links={PRODUCT_LINKS} />
          <FooterColumn title="资源" links={RESOURCE_LINKS} />
          <FooterColumn title="公司" links={COMPANY_LINKS} />
        </div>
      </div>
      <div className="border-t border-slate-200/60 py-4 text-center text-xs text-slate-400">
        © 2026 Aidean · AI 模型与云服务天梯图
      </div>
    </footer>
  );
}
