// 共享产品化页头卡（M4 风格对齐）：从 PagePlaceholder 的页头语言提炼为可复用、**令牌化（暗色安全）** 的展示组件。
// - 供 /user/console、/user/balance 等用户区页复用，与 /news、/pricing（PagePlaceholder）同构观感；
// - 全部走 CSS 变量语义类（bg-card/border-border/text-foreground/text-muted-foreground/bg-muted），
//   随 html[data-theme] 暗色自动翻转，消除旧内联 hero 的 bg-white/text-slate-900 硬编码隐患；
// - children 插槽：在标题下方渲染页头内附加内容（如控制台三项核心指标 / 兑换入口），保留其 testid 与特效。
import Link from "next/link";
import type { ReactNode } from "react";

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeroProps {
  title: string;
  description?: string;
  /** 面包屑（含首页），末项为当前页 */
  crumbs: Crumb[];
  /** 标题卡内附加内容（如核心指标卡、兑换入口） */
  children?: ReactNode;
}

export function PageHero({ title, description, crumbs, children }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)]">
      {/* 冷色氛围层（纯装饰）：右上柔光斑 + 细网格，参数对齐 PagePlaceholder（opacity 0.45） */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.45]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(ellipse 70% 70% at 60% 20%, black 25%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 60% 20%, black 25%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative px-6 py-10 md:px-10 md:py-12">
        <nav aria-label="面包屑" className="text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1">
            {crumbs.map((c, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1.5">
                  {i > 0 && (
                    <span aria-hidden="true" className="text-muted-foreground/60">
                      /
                    </span>
                  )}
                  {c.href && !isLast ? (
                    <Link href={c.href} className="transition-colors hover:text-primary">
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current={isLast ? "page" : undefined} className={isLast ? "font-medium text-foreground" : ""}>
                      {c.label}
                    </span>
                  )}
                </span>
              );
            })}
          </span>
        </nav>

        <div className="mt-5 flex items-start gap-3.5">
          {/* 主色竖条：标题视觉锚点（品牌色相随主题变体） */}
          <span aria-hidden="true" className="mt-1.5 h-9 w-1 shrink-0 rounded-full bg-gradient-to-b from-primary to-accent md:h-11" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h1>
            {description && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">{description}</p>
            )}
          </div>
        </div>

        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </section>
  );
}
