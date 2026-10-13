// /products —— 产品矩阵（SubTask 2.4.2 + add-subplatform-showcase-pages）。
// 读库渲染（ACTIVE 按 sortOrder 升序；管理端 PATCH/DELETE 后 revalidatePath 即时生效），
// 空表回退静态底稿（lib/product-fallback.ts 统一源，#71 收口三份拷贝）。
// 区块仍带 id=slug 锚点（兼容历史外链 /products#aideanwiki）；#71 按二级分类分组渲染。
import Link from "next/link";

import { prisma } from "../../../lib/db/prisma";
import { productLabel, productCategoryLabel, productCategoryRank, PRODUCT_CATEGORY_ORDER } from "../../../lib/product-label";
import { PRODUCT_FALLBACK } from "../../../lib/product-fallback";
import { PagePlaceholder } from "../../../components/common/PagePlaceholder";

// 缓存策略（2026-09-23 性能改造）：原 force-dynamic 使每次进入都完整 SSR 且 Link 预取失效。
// 改 ISR（与 /models、/ladder 同口径）；管理端 PATCH/DELETE 已调 revalidatePath("/products") 即时生效。
export const revalidate = 300;

interface ProductCard {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  category: string | null;
  sortOrder: number;
  badge: string | null;
  tagline: string | null;
  description: string | null;
  benefits: string[];
}

export default async function ProductsPage() {
  let products: ProductCard[] = [];
  try {
    const rows = await prisma.product.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    products = rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      displayName: p.displayName,
      category: p.category,
      sortOrder: p.sortOrder,
      badge: p.badge,
      tagline: p.tagline,
      description: p.description,
      benefits: Array.isArray(p.benefits)
        ? (p.benefits.filter((x): x is string => typeof x === "string") as string[])
        : [],
    }));
  } catch {
    products = [];
  }

  const items = products.length > 0
    ? products
    : PRODUCT_FALLBACK.map((f, i) => ({ id: `fallback-${i}`, ...f }));

  // #73 站点级归类排序：先按「分类组序 → 组内 sortOrder」排一次，
  // 页面描述句与下方分组渲染共用同一顺序（否则描述句会按 sortOrder 把 Wiki 排到 Bot 之前）。
  const ordered = [...items].sort((a, b) => {
    const rank = productCategoryRank(a.category) - productCategoryRank(b.category);
    return rank !== 0 ? rank : a.sortOrder - b.sortOrder;
  });

  // #71 按二级分类分组（组序：特供→开源→合作→其它；组内保持 sortOrder）
  const groups = PRODUCT_CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: productCategoryLabel(cat),
    items: ordered.filter((p) => (p.category ?? null) === (cat ?? null)),
  })).filter((g) => g.items.length > 0);

  return (
    <PagePlaceholder
      title="产品"
      description={`${ordered.map((p) => productLabel(p)).join(" / ")} 组成的产品矩阵：各产品当前定位与权益要点见下，点击「查看详情」进入统一介绍页。`}
    >
      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.category ?? "other"} className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">{g.label}</h2>
            <div className="space-y-4">
              {g.items.map((p) => (
                <div
                  key={p.id}
                  id={p.slug}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-bold text-foreground">{productLabel(p)}</h3>
                    {p.badge ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        {p.badge}
                      </span>
                    ) : null}
                  </div>
                  {p.tagline ? <p className="mt-3 text-sm leading-relaxed text-slate-500">{p.tagline}</p> : null}
                  {p.description ? <p className="mt-2 text-sm leading-relaxed text-slate-500">{p.description}</p> : null}
                  {p.benefits.length > 0 ? (
                    <ul className="mt-3 space-y-1.5">
                      {p.benefits.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm text-slate-600">
                          <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <Link href={`/products/${p.slug}`} className="mt-4 inline-block text-sm font-medium text-primary transition-opacity hover:opacity-80">
                    查看详情 →
                  </Link>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PagePlaceholder>
  );
}
