// 模型能力入口：四个导航卡（Server Component）。
// S4「可见即可改」：卡片内容（图标名/标题/描述/链接）改由 home.modelEntries 配置驱动，缺省回退原文案。
import Link from "next/link";
import { RevealOnScroll } from "./RevealOnScroll";
import { HomeIcon } from "./HomeIcon";
import { Badge } from "@aidean/ui";
import { HOME_MODEL_ENTRIES_DEFAULT, type HomeCard } from "@aidean/shared";

export function ModelSection({ entries = HOME_MODEL_ENTRIES_DEFAULT }: { entries?: HomeCard[] }) {
  return (
    <RevealOnScroll>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {entries.map(({ icon, title, description, href }, index) => {
          const card = (
            <>
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/10 transition-colors group-hover:bg-primary/15">
                  <HomeIcon name={icon} className="h-5 w-5 text-primary transition-transform group-hover:scale-[1.03]" />
                </span>
                <Badge variant="secondary" className="text-[11px] font-medium tracking-widest text-slate-400">0{index + 1}</Badge>
              </div>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-slate-900">{title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-500">{description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                前往查看
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 translate-x-0 fill-none stroke-current stroke-[1.6] transition-transform group-hover:translate-x-0.5" aria-hidden="true"><path d="M4 2.5L7.5 6 4 9.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </>
          );
          const cls = "group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-sm)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-md)]";
          return href ? (
            <Link key={`${title}-${index}`} href={href} className={cls}>{card}</Link>
          ) : (
            <div key={`${title}-${index}`} className={cls}>{card}</div>
          );
        })}
      </div>
    </RevealOnScroll>
  );
}
