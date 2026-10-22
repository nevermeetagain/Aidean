// 一级路由占位页壳：面包屑 + H1 中文标题 + 占位说明（Server Component）。
// 供 app/(site)/ 下七个一级路由复用，后续深化时由各页替换 children。
// 视觉（UI 重构）：文档式平铺页头 → 产品化页头卡——白卡 + 冷色氛围层（网格纹理 + 柔光斑）
// + 面包屑胶囊 + 主色竖条标题锚点；props 契约不变，七个调用点零改动。
import Link from "next/link";
import type { ReactNode } from "react";

interface PagePlaceholderProps {
  /** 面包屑与 H1 共用的页面名 */
  title: string;
  description: string;
  children?: ReactNode;
}

export function PagePlaceholder({ title, description, children }: PagePlaceholderProps) {
  return (
    <main className="px-4 pb-8 pt-0 md:px-6 md:pb-10">
      {/* 产品化页头卡：负外边距让卡片吃满内容区宽度，内部再补回内边距；顶部零间距与导航栏贴合 */}
      <section className="relative -mx-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-sm)] md:-mx-6">
        {/* 冷色氛围层（纯装饰）：右上柔光斑 + 细网格 */}
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
          <nav aria-label="面包屑" className="text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1">
              <Link href="/" className="transition-colors hover:text-primary">
                首页
              </Link>
              <span aria-hidden="true" className="text-slate-300">
                /
              </span>
              <span aria-current="page" className="font-medium text-slate-700">
                {title}
              </span>
            </span>
          </nav>

          <div className="mt-5 flex items-start gap-3.5">
            {/* 主色竖条：标题视觉锚点（品牌色相随主题变体） */}
            <span
              aria-hidden="true"
              className="mt-1.5 h-9 w-1 shrink-0 rounded-full bg-gradient-to-b from-primary to-accent md:h-11"
            />
            <div>
              {/* UX-15（EVD-UX-01，UI §2.3 刻度上限 32px）：页面 H1 移动 24 / 桌面 32，原 md:text-4xl=36px 越界 */}
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[32px] md:leading-tight">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 md:text-[15px]">
                {description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {children ? <div className="mt-10">{children}</div> : null}
    </main>
  );
}
