// 产品矩阵：产品卡（Server Component）。
// add-subplatform-showcase-pages：改读库（与 /products 同查询），消灭此前硬编码数组与 Product 表的双源；
// 卡片整卡链至统一模板介绍页 /products/[slug]；DB 不可用回退静态底稿。
// #73 站点级归类排序：产品按「分类组序 → 组内 sortOrder」排（与导航下拉、/products 分组一致，
// Bot→Fleet→Wiki→Thesis）；天梯图与模型服务提供商是主站服务、不入 Product 表，天然不在本区块。
import Link from "next/link";
import { MessagesSquare, Package, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { prisma } from "../../lib/db/prisma";
import { productLabel, productCategoryRank } from "../../lib/product-label";
import { PRODUCT_FALLBACK } from "../../lib/product-fallback";
import { RevealOnScroll } from "./RevealOnScroll";
import { Badge } from "@aidean/ui";

type BadgeTone = "success" | "secondary" | "muted";

interface Product {
  slug: string;
  name: string;
  displayName: string | null;
  category: string | null;
  sortOrder: number;
  badge: string | null;
  tagline: string | null;
  bullets: string[];
}

const BADGE_CLS: Record<BadgeTone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15",
  secondary: "bg-primary/10 text-primary",
  muted: "border border-slate-200 bg-transparent text-slate-500",
};

/** 状态徽标三档语义（与 /products/[slug] 模板同一配色契约） */
function toneOf(badge: string | null): BadgeTone {
  if (!badge) return "muted";
  if (badge.includes("上线")) return "success";
  if (badge.includes("规划") || badge.includes("早期")) return "muted";
  return "secondary";
}

const ICONS: Record<string, LucideIcon> = { aideanwiki: MessagesSquare, wechatrag: MessagesSquare, skillscloud: Sparkles };

/** DB 不可用时底稿（#71 统一源 lib/product-fallback.ts，与 seed §6 同步契约） */
const FALLBACK: Product[] = PRODUCT_FALLBACK.map((f) => ({
  slug: f.slug,
  name: f.name,
  displayName: f.displayName,
  category: f.category,
  sortOrder: f.sortOrder,
  badge: f.badge,
  tagline: f.tagline,
  bullets: f.benefits.slice(0, 2),
}));

export async function ProductSection() {
  let items: Product[] = [];
  try {
    const rows = await prisma.product.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      select: {
        slug: true,
        name: true,
        displayName: true,
        category: true,
        sortOrder: true,
        badge: true,
        tagline: true,
        benefits: true,
      },
    });
    items = rows.map((p) => ({
      slug: p.slug,
      name: p.name,
      displayName: p.displayName,
      category: p.category,
      sortOrder: p.sortOrder,
      badge: p.badge,
      tagline: p.tagline,
      bullets: (Array.isArray(p.benefits) ? p.benefits.filter((x): x is string => typeof x === "string") : []).slice(0, 2),
    }));
  } catch {
    items = [];
  }
  if (items.length === 0) items = FALLBACK;
  // #73 站点级归类排序：分类组序优先，组内按 sortOrder 升序
  items.sort((a, b) => {
    const rank = productCategoryRank(a.category) - productCategoryRank(b.category);
    return rank !== 0 ? rank : a.sortOrder - b.sortOrder;
  });

  return (
    <RevealOnScroll>
      <div className="grid gap-5 md:grid-cols-3">
        {items.map(({ slug, name, displayName, badge, tagline, bullets }) => {
          const Icon = ICONS[slug] ?? Package;
          const tone = toneOf(badge);
          return (
            <Link
              key={slug}
              href={`/products/${slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-sm)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/15 hover:shadow-[var(--shadow-md)]"
            >
              <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-primary/25 to-transparent" aria-hidden="true" />
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/10">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </span>
                  {badge ? (
                    <Badge variant={tone === "success" ? "success" : "secondary"} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CLS[tone]}`}>
                      {badge}
                    </Badge>
                  ) : null}
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-primary">{productLabel({ name, displayName })}</h3>
                {tagline ? <p className="mt-2 text-sm leading-relaxed text-slate-500">{tagline}</p> : null}
                {bullets.length > 0 ? (
                  <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                    {bullets.map((line) => (
                      <li key={line} className="flex gap-2 text-sm leading-relaxed text-slate-500">
                        <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </RevealOnScroll>
  );
}
