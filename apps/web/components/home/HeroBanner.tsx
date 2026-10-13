// 首屏横幅：主题变量渐变背景 + 主副标题 + 双 CTA。
// 属首屏直渲内容（spec Task 2.3.1 / 2.7.1），不参与滚动渐入，保障 LCP。
// 视觉收口：更克制的氛围层（降低网格对比）、更清晰的 CTA 层级、底部统计条带衔接下一区块。
// S4「可见即可改」：文案（角标/主副标题/双 CTA/统计条）改由 home.hero 配置驱动，缺省回退原文案。
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@aidean/ui";
import { HOME_HERO_DEFAULT, type HomeHero } from "@aidean/shared";

export function HeroBanner({ hero = HOME_HERO_DEFAULT }: { hero?: HomeHero }) {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 72%, var(--accent)) 52%, #0ea5e9 100%)",
      }}
      aria-label="平台首屏简介"
    >
      {/* 冷色氛围层：低对比网格 + 柔光斑，营造产品级质感（纯装饰） */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 78% 68% at 50% 28%, black 42%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 78% 68% at 50% 28%, black 42%, transparent 100%)",
        }}
      />
      <div aria-hidden="true" className="absolute -right-36 -top-36 h-[28rem] w-[28rem] rounded-full bg-white/12 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-48 -left-28 h-[32rem] w-[32rem] rounded-full bg-cyan-300/16 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 py-20 text-center md:px-6 md:py-28">
        {hero.badge ? (
          <Badge className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" aria-hidden="true" />
            {hero.badge}
          </Badge>
        ) : null}

        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-[1.12] tracking-tight text-white [text-shadow:0_2px_24px_rgba(15,23,42,0.18)] md:text-[3.3rem]">
          {hero.title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/85 md:text-[15px]">
          {hero.subtitle}
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href={hero.primaryCta.href}
            className="inline-flex h-[48px] items-center gap-2 rounded-xl bg-white px-7 text-[15px] font-semibold text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.22)]"
          >
            {hero.primaryCta.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href={hero.secondaryCta.href}
            className="inline-flex h-[48px] items-center rounded-xl border border-white/30 bg-white/10 px-7 text-[15px] font-medium text-white backdrop-blur transition hover:bg-white/18"
          >
            {hero.secondaryCta.label}
          </Link>
        </div>

        <div className="mx-auto mt-10 flex max-w-2xl items-center justify-center gap-6 text-white/85 md:mt-12 md:gap-8" aria-label="平台能力要点">
          {hero.stats.map((s, i) => (
            <div key={`${s.label}-${i}`} className="flex items-center gap-6 md:gap-8">
              {i > 0 ? <span aria-hidden="true" className="h-8 w-px bg-white/20" /> : null}
              <div className="text-center">
                <p className="text-sm font-semibold tracking-tight text-white md:text-[13px]">{s.value}</p>
                <p className="mt-0.5 text-[11px] text-white/70">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
