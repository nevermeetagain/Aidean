"use client";

import { useMemo, useState, useEffect } from "react";
import { useApi, publicApiKeys } from "@/hooks/useApi";
import Link from "next/link";
import {
  Rocket, BarChart3, GitCompare, FlaskConical, Cpu, ArrowRight,
  Leaf, Sprout, TreePine, Droplets, Sun, Wind, Flower2, Globe, Shield,
} from "lucide-react";

const CAROUSEL_SLIDES = [
  { src: "/images/banners/reference1.webp", alt: "AI模型性能天梯图", href: "/aidean" },
  { src: "/images/banners/reference2.webp", alt: "模型评测体系", href: "http://36.134.158.50:10001/", external: true },
  { src: "/images/banners/reference3.webp", alt: "数字分身", href: "/sphere/ai-employee" },
  { src: "/images/banners/reference4.webp", alt: "Skill技能", href: "/space/skills" },
];

interface HomeStats { modelCount: number; toolCount: number; solutionCount: number; appCount: number; }

export default function HomeV6() {
  const { data: statsData } = useApi<{ models: { total: number; active: number }; users: { total: number }; tools: { total: number; skills: number; mcps: number; agents: number }; }>(publicApiKeys.stats());
  const stats: HomeStats = useMemo(() => ({ modelCount: statsData?.models?.total ?? 0, toolCount: statsData?.tools?.total ?? 0, solutionCount: statsData?.models?.active ?? 0, appCount: (statsData?.tools?.skills ?? 0) + (statsData?.tools?.mcps ?? 0) + (statsData?.tools?.agents ?? 0), }), [statsData]);
  const fmtCount = (n: number, fallback: string) => (n > 0 ? `${n.toLocaleString()}+` : fallback);

  return (
    <div className="flex flex-col bg-[#FEF3C7] min-h-screen text-[#292524]">
      <section className="relative w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FEF3C7] via-[#FDF6E3] to-[#D1FAE5]" />
        <div className="absolute -top-20 -right-20 h-[400px] w-[400px] rounded-full bg-[#A7F3D0]/30 blur-[80px]" />
        <div className="absolute top-1/2 -left-20 h-[300px] w-[300px] rounded-full bg-[#FDE68A]/30 blur-[60px]" />
        <div className="absolute -bottom-10 right-1/3 h-[250px] w-[250px] rounded-full bg-[#BBF7D0]/20 blur-[50px]" />
        <div className="relative mx-auto max-w-[1920px] px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-[0.55fr_1fr]">
            <div className="flex flex-col items-start">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#059669]/10 px-4 py-1.5 text-sm font-medium text-[#059669]">
                <Sprout className="h-4 w-4" />AI 模型天梯图平台
              </div>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#292524] sm:text-5xl lg:text-6xl">发现最佳<br /><span className="text-[#059669]">AI 模型</span></h1>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-[#78716C]">全面评测、多维度对比，助你快速找到最适合的 AI 解决方案</p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/aidean" className="group inline-flex items-center gap-2 rounded-full bg-[#059669] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#047857] hover:shadow-lg hover:shadow-[#059669]/20"><Rocket className="h-4 w-4" />立即体验<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                <Link href="/compare" className="inline-flex items-center gap-2 rounded-full border-2 border-[#059669]/30 bg-white/70 px-6 py-3 text-sm font-semibold text-[#059669] transition-all hover:border-[#059669] hover:bg-white"><GitCompare className="h-4 w-4" />进入对比</Link>
              </div>
            </div>
            <OrganicCarousel slides={CAROUSEL_SLIDES} />
          </div>
        </div>
      </section>

      <section className="relative w-full border-t border-[#D6D3D1] bg-[#FEF3C7]">
        <div className="mx-auto max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <NatureCard label="覆盖模型" value={fmtCount(stats.modelCount, "200+")} sub="MODELS" icon={<TreePine className="h-5 w-5" />} color="#059669" />
            <NatureCard label="可用工具" value={fmtCount(stats.toolCount, "10万+")} sub="TOOLS" icon={<Leaf className="h-5 w-5" />} color="#0D9488" />
            <NatureCard label="解决方案" value={fmtCount(stats.solutionCount, "1000+")} sub="SOLUTIONS" icon={<Sun className="h-5 w-5" />} color="#D97706" />
            <NatureCard label="专属应用" value={fmtCount(stats.appCount, "3+")} sub="APPS" icon={<Flower2 className="h-5 w-5" />} color="#BE185D" />
          </div>
        </div>
      </section>

      <section className="relative w-full border-t border-[#D6D3D1] bg-[#FDF6E3]">
        <div className="mx-auto max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-center gap-3"><div className="h-px w-12 bg-[#D6D3D1]" /><Leaf className="h-4 w-4 text-[#059669]" /><span className="text-sm font-medium text-[#78716C]">生态探索</span><Leaf className="h-4 w-4 text-[#059669]" /><div className="h-px w-12 bg-[#D6D3D1]" /></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <EcoCard title="模型天梯图" desc="查看大模型性能排名，对比选择最优模型" href="/aidean" icon={<BarChart3 className="h-5 w-5" />} accent="#059669" />
            <EcoCard title="对比评测" desc="多维度对比不同模型，找到最适合的方案" href="/compare" icon={<GitCompare className="h-5 w-5" />} accent="#0D9488" />
            <EcoCard title="公开解决方案" desc="工具应用一键直达，优质方案更快落地" href="/sphere/solutions" icon={<FlaskConical className="h-5 w-5" />} accent="#D97706" />
            <EcoCard title="AI资源" desc="Agent、MCP、Skills资源集合" href="/space" icon={<Cpu className="h-5 w-5" />} accent="#BE185D" />
          </div>
        </div>
      </section>

      <section className="relative w-full border-t border-[#D6D3D1] bg-[#FEF3C7]">
        <div className="mx-auto max-w-[1920px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-center gap-3"><div className="h-px w-12 bg-[#D6D3D1]" /><Sprout className="h-4 w-4 text-[#059669]" /><span className="text-sm font-medium text-[#78716C]">生长优势</span><Sprout className="h-4 w-4 text-[#059669]" /><div className="h-px w-12 bg-[#D6D3D1]" /></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <GrowCard title="统一口径" desc="同一维度、同一展示方式，避免信息噪声。" icon={<Wind className="h-5 w-5" />} accent="#059669" />
            <GrowCard title="多维分析" desc="性能、上下文、速度、价格多维度直观对比。" icon={<BarChart3 className="h-5 w-5" />} accent="#0D9488" />
            <GrowCard title="持续更新" desc="模型迭代快，我们用稳定机制保持榜单可用。" icon={<Droplets className="h-5 w-5" />} accent="#D97706" />
            <GrowCard title="可操作性强" desc="收藏/对比/纠错/测评入口，形成闭环决策。" icon={<Sun className="h-5 w-5" />} accent="#BE185D" />
          </div>
        </div>
      </section>

      <section className="relative w-full border-t border-[#D6D3D1] bg-[#FDF6E3]">
        <div className="mx-auto max-w-[1920px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-center gap-3"><div className="h-px w-12 bg-[#D6D3D1]" /><Flower2 className="h-4 w-4 text-[#059669]" /><span className="text-sm font-medium text-[#78716C]">培育服务</span><Flower2 className="h-4 w-4 text-[#059669]" /><div className="h-px w-12 bg-[#D6D3D1]" /></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <OrganicService title="企业咨询" items={["选型建议与落地路线", "成本评估与预算建议", "评测方案设计"]} phase="发芽期" />
            <OrganicService title="私有化/内网" items={["数据与模型更可控", "内网部署与权限", "合规与审计"]} phase="成长期" />
            <OrganicService title="定制服务" items={["自定义榜单与指标", "行业场景模板", "专属看板与报表"]} phase="成熟期" />
          </div>
        </div>
      </section>

      <OrganicDock />
    </div>
  );
}

function OrganicCarousel({ slides }: { slides: typeof CAROUSEL_SLIDES }) {
  const [active, setActive] = useState(0);
  useEffect(() => { const t = setInterval(() => setActive((v) => (v + 1) % slides.length), 5000); return () => clearInterval(t); }, [slides.length]);
  const slide = slides[active];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-xl shadow-[#059669]/5">
      <div className="relative aspect-[16/9] w-full">
        <img src={slide.src} alt={slide.alt} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#292524]/30 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4"><p className="text-sm font-medium text-white">{slide.alt}</p></div>
      </div>
      <div className="flex items-center justify-between px-4 py-3 bg-white">
        <div className="flex gap-2">{slides.map((_, i) => (<button key={i} onClick={() => setActive(i)} className={`h-2.5 w-2.5 rounded-full transition-colors ${i === active ? "bg-[#059669]" : "bg-[#D6D3D1]"}`} />))}</div>
        <span className="text-xs text-[#78716C]">{active + 1}/{slides.length}</span>
      </div>
    </div>
  );
}

function NatureCard({ label, value, sub, icon, color }: { label: string; value: string; sub: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md" style={{ borderTop: `3px solid ${color}` }}>
      <div className="flex items-center justify-between"><span className="text-xs font-semibold text-[#78716C]">{sub}</span><span style={{ color }}>{icon}</span></div>
      <div className="mt-2 text-3xl font-bold text-[#292524]">{value}</div>
      <div className="mt-1 text-xs text-[#78716C]">{label}</div>
    </div>
  );
}

function EcoCard({ title, desc, href, icon, accent }: { title: string; desc: string; href: string; icon: React.ReactNode; accent: string }) {
  return (
    <Link href={href} className="group block overflow-hidden rounded-2xl bg-white p-5 shadow-sm transition-all hover:shadow-md" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}15`, color: accent }}>{icon}</div>
        <div className="text-sm font-semibold text-[#292524]">{title}</div>
      </div>
      <p className="mt-3 text-sm text-[#78716C]">{desc}</p>
      <div className="mt-3 flex items-center text-sm font-medium" style={{ color: accent }}>立即查看<ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
    </Link>
  );
}

function GrowCard({ title, desc, icon, accent }: { title: string; desc: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm transition-all hover:shadow-md" style={{ borderBottom: `3px solid ${accent}` }}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}15`, color: accent }}>{icon}</div>
      <div className="mt-3 text-sm font-semibold text-[#292524]">{title}</div>
      <div className="mt-1 text-sm text-[#78716C]">{desc}</div>
    </div>
  );
}

function OrganicService({ title, items, phase }: { title: string; items: string[]; phase: string }) {
  return (
    <div className="relative rounded-2xl bg-white p-5 shadow-sm">
      <div className="absolute right-4 top-4 rounded-full bg-[#059669]/10 px-2 py-0.5 text-[10px] font-semibold text-[#059669]">{phase}</div>
      <div className="mt-2 text-sm font-semibold text-[#292524]">{title}</div>
      <ul className="mt-3 space-y-2">{items.map((item) => (<li key={item} className="flex items-start gap-2 text-sm text-[#78716C]"><Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#059669]" />{item}</li>))}</ul>
    </div>
  );
}

function OrganicDock() {
  return (
    <div className="fixed bottom-5 right-5 z-40">
      <div className="flex flex-col gap-2">
        <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#78716C] shadow-md transition-all hover:bg-[#059669] hover:text-white"><Globe className="h-4 w-4" /></button>
        <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#78716C] shadow-md transition-all hover:bg-[#059669] hover:text-white"><GitCompare className="h-4 w-4" /></button>
        <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#78716C] shadow-md transition-all hover:bg-[#059669] hover:text-white"><Shield className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

