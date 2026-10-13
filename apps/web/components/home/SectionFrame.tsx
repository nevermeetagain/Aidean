// 区块留白容器：Server Component，统一首页各区块的最大宽度、水平内边距与纵向间距，
// 并提供可选的标题/副标题锚点结构。视觉收口：标题左侧主色竖线+眼眉标签，区块间用 hairline 分隔，
// 保持 Server Component 零 JS。
import type { ReactNode } from "react";

interface SectionFrameProps {
  id: string;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}

export function SectionFrame({ id, title, subtitle, eyebrow, children, className }: SectionFrameProps) {
  return (
    <section
      id={id}
      className={`px-4 py-16 md:px-6 md:py-20${className ? ` ${className}` : ""}`}
    >
      {(title || subtitle || eyebrow) && (
        <header className="mx-auto mb-10 max-w-6xl">
          {eyebrow ? (
            <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <span aria-hidden="true" className="h-px w-6 bg-primary/40" />
              {eyebrow}
            </p>
          ) : null}
          {title && (
            <h2 className="flex items-start gap-3 text-2xl font-semibold tracking-tight text-slate-900 md:text-[1.75rem]">
              <span aria-hidden="true" className="mt-1.5 h-6 w-1 shrink-0 rounded-full bg-primary/80 md:h-7" />
              <span>{title}</span>
            </h2>
          )}
          {subtitle && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 md:ml-4 md:text-[15px]">
              {subtitle}
            </p>
          )}
        </header>
      )}
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}
