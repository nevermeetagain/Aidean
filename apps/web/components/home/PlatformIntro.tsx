// 平台介绍：三列价值点卡片（Server Component）。
// S4「可见即可改」：卡片内容（图标名/标题/描述）改由 home.valuePoints 配置驱动，缺省回退原文案。
import { RevealOnScroll } from "./RevealOnScroll";
import { HomeIcon } from "./HomeIcon";
import { HOME_VALUE_POINTS_DEFAULT, type HomeCard } from "@aidean/shared";

export function PlatformIntro({ cards = HOME_VALUE_POINTS_DEFAULT }: { cards?: HomeCard[] }) {
  return (
    <RevealOnScroll>
      <div className="grid gap-5 md:grid-cols-3">
        {cards.map(({ icon, title, description }, index) => (
          <article
            key={`${title}-${index}`}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-sm)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-md)]"
          >
            <span aria-hidden="true" className="absolute right-0 top-0 h-20 w-20 rounded-bl-[2rem] bg-primary/[0.04] transition-colors group-hover:bg-primary/[0.07]" />
            <div className="relative mb-4 flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/10 transition-colors group-hover:bg-primary/15">
                <HomeIcon name={icon} className="h-[22px] w-[22px] text-primary" />
              </span>
              <span className="text-[11px] font-semibold tracking-[0.14em] text-slate-300">0{index + 1}</span>
            </div>
            <h3 className="relative text-[15px] font-semibold tracking-tight text-slate-900">{title}</h3>
            <p className="relative mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
          </article>
        ))}
      </div>
    </RevealOnScroll>
  );
}
