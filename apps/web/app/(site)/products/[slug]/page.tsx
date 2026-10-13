// /products/[slug] —— 产品统一模板介绍页（add-subplatform-showcase-pages → enrich-subplatform-intro-pages v2 三层重构 #70）。
// 所有 ACTIVE 产品共用同一模板，按「介绍内容三层模型」区块序渲染：
//   页头（身份层：徽标+简介+受众+产品入口 CTA）
//   → 解决什么问题（价值层 problems 对照卡）→ 如何使用（流程层 workflow 步骤）
//   → 核心能力（benefits 条目卡）→ 生态互通与安全承诺（决策层双列）
//   → 平台信息（facts 分组表）→ 相关链接 → 返回矩阵。
// v2 区块（audience/problems/workflow/promises/ecosystem）任一缺省即零渲染（无空壳区块契约不变）；
// intro=null 或 v1（存量零迁移）时按旧四区块降级。
// 数据口径与 /products 一致：ACTIVE + 未软删，ISR 300s，管理端 PATCH/DELETE 经 revalidatePath 即时生效。
// 样式契约：仅 @aidean/ui + lucide-react + CSS 令牌类（三主题 data-theme 不破版）；外链 noopener。
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, ExternalLink, Lightbulb, Network, ShieldCheck } from "lucide-react";
import { ProductIntroSchema, type ProductIntro } from "@aidean/shared";

import { prisma } from "../../../../lib/db/prisma";
import { productLabel } from "../../../../lib/product-label";
import { PagePlaceholder } from "../../../../components/common/PagePlaceholder";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const rows = await prisma.product.findMany({ where: { deletedAt: null, status: "ACTIVE" }, select: { slug: true } });
    return rows.map((r) => ({ slug: r.slug }));
  } catch {
    return [];
  }
}

interface PageProduct {
  name: string;
  displayName: string | null;
  tagline: string | null;
  description: string | null;
  badge: string | null;
  benefits: string[];
  intro: ProductIntro | null;
}

async function loadProduct(slug: string): Promise<PageProduct | null> {
  try {
    const p = await prisma.product.findFirst({ where: { slug, deletedAt: null, status: "ACTIVE" } });
    if (!p) return null;
    const introParsed = p.intro === null ? null : ProductIntroSchema.safeParse(p.intro);
    return {
      name: p.name,
      displayName: p.displayName,
      tagline: p.tagline,
      description: p.description,
      badge: p.badge,
      benefits: Array.isArray(p.benefits) ? (p.benefits.filter((x): x is string => typeof x === "string") as string[]) : [],
      // 库内脏数据静默降级为 null（模板按未配置渲染），写侧已由 zod 强校验
      intro: introParsed?.success ? introParsed.data : null,
    };
  } catch {
    return null;
  }
}

/** 状态徽标三档语义（与首页 ProductSection 同一配色契约）：已上线=emerald / 进行=primary / 规划=描边灰 */
function badgeCls(badge: string): string {
  if (badge.includes("上线")) return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15";
  if (badge.includes("规划") || badge.includes("早期")) return "border border-slate-200 bg-transparent text-slate-500";
  return "bg-primary/10 text-primary";
}

/** 决策层清单列（ecosystem/promises 共用版式；缺列零渲染） */
function TrustColumn({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        {icon}
        {title}
      </h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-2 text-sm leading-relaxed text-slate-600">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await loadProduct(slug);
  if (!p) return { title: "产品不存在" };
  return {
    title: `${productLabel(p)} · 产品介绍`,
    description: p.tagline ?? p.description?.slice(0, 120) ?? `${productLabel(p)} 产品介绍`,
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const intro = product.intro;
  const heroLinks = intro?.links.filter((l) => l.kind === "product") ?? [];
  const sideLinks = intro?.links.filter((l) => l.kind !== "product") ?? [];
  const ecosystem = intro?.ecosystem ?? [];
  const promises = intro?.promises ?? [];

  return (
    <PagePlaceholder
      title={productLabel(product)}
      description={product.tagline ?? "Aidean 产品矩阵成员，当前定位与能力要点见下。"}
    >
      <div className="space-y-6">
        {/* 身份层：徽标 + 简介 + 受众 + 产品入口 CTA */}
        <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          {product.badge ? (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeCls(product.badge)}`}>
              {product.badge}
            </span>
          ) : null}
          {product.description ? (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">{product.description}</p>
          ) : null}
          {intro?.audience ? (
            <p className="mt-4 max-w-3xl rounded-lg bg-muted/50 px-4 py-2.5 text-sm leading-relaxed text-slate-600 ring-1 ring-inset ring-[var(--border)]">
              <span className="font-medium text-slate-800">为这样的人而建：</span>
              {intro.audience}
            </p>
          ) : null}
          {heroLinks.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-3">
              {heroLinks.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
                >
                  {l.label}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ))}
            </div>
          ) : null}
        </section>

        {/* 价值层：解决什么问题（痛点 → 解法对照卡） */}
        {intro && intro.problems && intro.problems.length > 0 ? (
          <section aria-labelledby="problems-h">
            <h2 id="problems-h" className="text-lg font-semibold tracking-tight text-slate-900">它解决什么问题</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {intro.problems.map((p) => (
                <article
                  key={p.problem}
                  className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition duration-200 hover:border-primary/15 hover:shadow-[var(--shadow-md)]"
                >
                  <p className="text-sm font-medium leading-relaxed text-slate-800">{p.problem}</p>
                  <p className="flex items-start gap-2 border-t border-dashed border-[var(--border)] pt-3 text-sm leading-relaxed text-slate-600">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{p.solution}</span>
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {/* 流程层：如何使用（编号步骤） */}
        {intro?.workflow ? (
          <section aria-labelledby="flow-h">
            <h2 id="flow-h" className="text-lg font-semibold tracking-tight text-slate-900">如何使用</h2>
            {intro.workflow.title ? (
              <p className="mt-1.5 text-sm text-slate-500">{intro.workflow.title}</p>
            ) : null}
            <ol className="mt-4 max-w-3xl space-y-3">
              {intro.workflow.steps.map((s, i) => (
                <li key={`${i}-${s}`} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/10">
                    {i + 1}
                  </span>
                  <p className="pt-1 text-sm leading-relaxed text-slate-700">{s}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* 核心能力（benefits 条目卡） */}
        {product.benefits.length > 0 ? (
          <section aria-labelledby="cap-h">
            <h2 id="cap-h" className="text-lg font-semibold tracking-tight text-slate-900">核心能力</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {product.benefits.map((b) => (
                <article
                  key={b}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-sm)] transition duration-200 hover:border-primary/15 hover:shadow-[var(--shadow-md)]"
                >
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/10">
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  </span>
                  <p className="text-sm leading-relaxed text-slate-600">{b}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {/* 决策层：生态互通与安全承诺（双列，缺列不渲染） */}
        {ecosystem.length > 0 || promises.length > 0 ? (
          <section aria-labelledby="trust-h">
            <h2 id="trust-h" className="text-lg font-semibold tracking-tight text-slate-900">生态与承诺</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {ecosystem.length > 0 ? (
                <TrustColumn
                  icon={<Network className="h-4 w-4 text-primary" aria-hidden="true" />}
                  title="生态互通"
                  items={ecosystem}
                />
              ) : null}
              {promises.length > 0 ? (
                <TrustColumn
                  icon={<ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />}
                  title="安全与承诺"
                  items={promises}
                />
              ) : null}
            </div>
          </section>
        ) : null}

        {/* 平台信息（facts 分组表；条目用用户语言，技术栈堆砌不再入库） */}
        {intro && intro.facts.length > 0 ? (
          <section aria-labelledby="facts-h">
            <h2 id="facts-h" className="text-lg font-semibold tracking-tight text-slate-900">平台信息</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {intro.facts.map((g) => (
                <div key={g.group} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-800">{g.group}</h3>
                  <dl className="mt-3 space-y-2">
                    {g.items.map((it) => (
                      <div key={`${g.group}-${it.label}`} className="flex items-start justify-between gap-4 text-sm">
                        <dt className="shrink-0 text-slate-500">{it.label}</dt>
                        <dd className="text-right font-medium text-slate-800">{it.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* 相关链接（仓库/文档/其他；产品入口已在上方 CTA） */}
        {sideLinks.length > 0 ? (
          <section aria-labelledby="links-h">
            <h2 id="links-h" className="text-lg font-semibold tracking-tight text-slate-900">相关链接</h2>
            <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-sm">
              {sideLinks.map((l) => (
                <li key={l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-slate-600 transition-colors hover:bg-muted/60 hover:text-primary"
                  >
                    {l.label}
                    <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回产品矩阵
        </Link>
      </div>
    </PagePlaceholder>
  );
}
