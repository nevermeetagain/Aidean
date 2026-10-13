// 首页：区块化长页（Task 2.3；Phase 1 迁入 (site) 组）。
// 渲染顺序：HeroBanner → PlatformIntro → ModelSection → ProductSection
//          → RoadmapSection → PartnerMarquee(合作) → AboutSection。
// SiteHeader / SiteFooter 已由 (site)/layout.tsx 提供，此处不重复；
// 除 HeroBanner 直渲首屏外，各区块经 RevealOnScroll 滚动渐入。
import { AboutSection } from "../../components/home/AboutSection";
import { HeroBanner } from "../../components/home/HeroBanner";
import { ModelSection } from "../../components/home/ModelSection";
import { PartnerMarquee } from "../../components/home/PartnerMarquee";
import { PlatformIntro } from "../../components/home/PlatformIntro";
import { ProductSection } from "../../components/home/ProductSection";
import { RevealOnScroll } from "../../components/home/RevealOnScroll";
import { RoadmapSection } from "../../components/home/RoadmapSection";
import { SectionFrame } from "../../components/home/SectionFrame";
import { getHomeContent } from "../../lib/features/home/config";
import { pickBannerAnnouncement } from "../../lib/features/announcements/repository";
import AnnouncementBanner from "../../components/common/AnnouncementBanner";

// 首页 ISR（2026-09-28）：RoadmapSection 异步读 system_configs（roadmap.milestones），
// 与 /partners 同口径 revalidate=300；后台保存 roadmap 组键时 revalidatePath("/") 即时失效。
export const revalidate = 300;

export default async function HomePage() {
  // S4「可见即可改」：首屏/价值点/模型入口三区块文案由 home.* 配置驱动（DB 不可用回退原文案）。
  // S7.4 公告消费闭环：首条有效公告作首页横幅（无则不渲染；跟随首页 revalidate，至多 5 分钟延迟）。
  const [{ hero, valuePoints, modelEntries, marquee, aboutBody }, banner] = await Promise.all([
    getHomeContent(),
    pickBannerAnnouncement(),
  ]);
  return (
    <main>
      {banner ? <AnnouncementBanner title={banner.title} href="/announcements" /> : null}
      <HeroBanner hero={hero} />

      <SectionFrame
        id="platform-intro"
        eyebrow="Why Aidean"
        title="为什么选择 Aidean"
        subtitle="把「选哪个模型、去哪家平台调」的两道决策题，压成一次扫视的成本。"
      >
        <PlatformIntro cards={valuePoints} />
      </SectionFrame>

      <div aria-hidden="true" className="mx-auto max-w-6xl px-4 md:px-6"><div className="h-px bg-slate-200/70" /></div>

      <SectionFrame
        id="home-models"
        eyebrow="Model Ladder"
        title="模型能力入口"
        subtitle="从天梯图总览到逐维度对比，模型侧的四条常用路径。"
      >
        <ModelSection entries={modelEntries} />
      </SectionFrame>

      <SectionFrame
        id="home-products"
        eyebrow="Product Matrix"
        title="产品矩阵"
        subtitle="选型之外，Aidean 也在把大模型的落地工具链补齐。"
        className="bg-slate-50/60"
      >
        <ProductSection />
      </SectionFrame>

      <SectionFrame
        id="home-roadmap"
        eyebrow="Roadmap"
        title="产品路线图"
        subtitle="当前进展与阶段性目标，每一步都公开可查。"
      >
        <RoadmapSection />
      </SectionFrame>

      <SectionFrame
        id="partners"
        eyebrow="Ecosystem"
        title="合作生态"
        subtitle="与算力厂商、研究机构与开发者社区共建开放生态。"
        className="bg-white/40"
      >
        <RevealOnScroll>
          <PartnerMarquee names={marquee} />
        </RevealOnScroll>
      </SectionFrame>

      <SectionFrame id="about" eyebrow="About" title="关于我们">
        <AboutSection body={aboutBody} />
      </SectionFrame>
    </main>
  );
}
