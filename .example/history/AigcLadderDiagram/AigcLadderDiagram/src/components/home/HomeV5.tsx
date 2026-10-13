"use client";

import { useMemo, useState, useEffect } from "react";
import { useApi, publicApiKeys } from "@/hooks/useApi";
import Link from "next/link";
import {
  Rocket,
  BarChart3,
  GitCompare,
  FlaskConical,
  Cpu,
  ArrowRight,
  Ruler,
  Compass,
  HardHat,
  Layers,
  ClipboardList,
  Shield,
  Globe,
  Check,
} from "lucide-react";

const CAROUSEL_SLIDES = [
  { src: "/images/banners/reference1.webp", alt: "AI模型性能天梯图", href: "/aidean" },
  { src: "/images/banners/reference2.webp", alt: "模型评测体系", href: "http://36.134.158.50:10001/", external: true },
  { src: "/images/banners/reference3.webp", alt: "数字分身", href: "/sphere/ai-employee" },
  { src: "/images/banners/reference4.webp", alt: "Skill技能", href: "/space/skills" },
];

interface HomeStats {
  modelCount: number;
  toolCount: number;
  solutionCount: number;
  appCount: number;
}

export default function HomeV5() {
  const { data: statsData } = useApi<{
    models: { total: number; active: number };
    users: { total: number };
    tools: { total: number; skills: number; mcps: number; agents: number };
  }>(publicApiKeys.stats());

  const stats: HomeStats = useMemo(
    () => ({
      modelCount: statsData?.models?.total ?? 0,
      toolCount: statsData?.tools?.total ?? 0,
      solutionCount: statsData?.models?.active ?? 0,
      appCount: (statsData?.tools?.skills ?? 0) + (statsData?.tools?.mcps ?? 0) + (statsData?.tools?.agents ?? 0),
    }),
    [statsData]
  );

  const fmtCount = (n: number, fallback: string) => (n > 0 ? `${n.toLocaleString()}+` : fallback);

  return (
    <div className="flex flex-col bg-[#F8FAFC] min-h-screen text-[#0F172A]">
      {/* ====== Hero: 建筑蓝图纸风 ====== */}
      <section className="relative w-full overflow-hidden">
        {/* 蓝图网格背景 */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `linear-gradient(#93C5FD 1px, transparent 1px), linear-gradient(90deg, #93C5FD 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
        {/* 对角线剖面线 */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, #1E40AF 0, #1E40AF 1px, transparent 0, transparent 50%)`,
            backgroundSize: "20px 20px",
          }}
        />
        {/* 尺寸标注线装饰 */}
        <div className="absolute top-12 left-8 hidden lg:block">
          <div className="h-px w-32 bg-[#1E40AF]/30" />
          <div className="mt-1 font-mono text-xs text-[#1E40AF]/50">1200px</div>
        </div>
        <div className="absolute bottom-12 right-8 hidden lg:block">
          <div className="h-px w-24 bg-[#1E40AF]/30" />
          <div className="mt-1 text-right font-mono text-xs text-[#1E40AF]/50">800px</div>
        </div>

        <div className="relative mx-auto max-w-[1920px] px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-[0.55fr_1fr]">
            <div className="flex flex-col items-start">
              <div className="inline-flex items-center gap-2 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-1.5 text-sm font-medium text-[#1E40AF]">
                <Compass className="h-4 w-4" />
                AI 模型天梯图平台
              </div>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#0F172A] sm:text-5xl lg:text-6xl">
                发现最佳
                <br />
                AI 模型
              </h1>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-[#475569]">
                全面评测、多维度对比，助你快速找到最适合的 AI 解决方案
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/aidean" className="group inline-flex items-center gap-2 rounded-xl bg-[#1E40AF] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#1E3A8A] hover:shadow-lg">
                  <Rocket className="h-4 w-4" />
                  立即体验
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/compare" className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-[#BFDBFE] bg-white px-6 py-3 text-sm font-semibold text-[#1E40AF] transition-all hover:border-[#1E40AF] hover:bg-[#EFF6FF]">
                  <GitCompare className="h-4 w-4" />
                  进入对比
                </Link>
              </div>
            </div>
            <BlueprintCarousel slides={CAROUSEL_SLIDES} />
          </div>
        </div>
      </section>

      {/* ====== Stats: 工程图纸卡片 ====== */}
      <section className="relative w-full border-t-2 border-[#BFDBFE] bg-[#F8FAFC]">
        <div className="mx-auto max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <BlueprintStat label="覆盖模型" value={fmtCount(stats.modelCount, "200+")} sub="MODELS" icon={<Layers className="h-5 w-5" />} />
            <BlueprintStat label="可用工具" value={fmtCount(stats.toolCount, "10万+")} sub="TOOLS" icon={<Ruler className="h-5 w-5" />} />
            <BlueprintStat label="解决方案" value={fmtCount(stats.solutionCount, "1000+")} sub="SOLUTIONS" icon={<ClipboardList className="h-5 w-5" />} />
            <BlueprintStat label="专属应用" value={fmtCount(stats.appCount, "3+")} sub="APPS" icon={<HardHat className="h-5 w-5" />} />
          </div>
        </div>
      </section>

      {/* ====== Quick Actions: 图纸卡片 ====== */}
      <section className="relative w-full border-t-2 border-[#BFDBFE] bg-[#EFF6FF]">
        <div className="mx-auto max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center gap-2">
            <div className="h-px flex-1 bg-[#BFDBFE]" />
            <span className="font-mono text-xs text-[#1E40AF]/60">QUICK ACTIONS</span>
            <div className="h-px flex-1 bg-[#BFDBFE]" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <BlueprintCard title="模型天梯图" desc="查看大模型性能排名，对比选择最优模型" href="/aidean" icon={<BarChart3 className="h-5 w-5" />} code="A-001" />
            <BlueprintCard title="对比评测" desc="多维度对比不同模型，找到最适合的方案" href="/compare" icon={<GitCompare className="h-5 w-5" />} code="A-002" />
            <BlueprintCard title="公开解决方案" desc="工具应用一键直达，优质方案更快落地" href="/sphere/solutions" icon={<FlaskConical className="h-5 w-5" />} code="A-003" />
            <BlueprintCard title="AI资源" desc="Agent、MCP、Skills资源集合" href="/space" icon={<Cpu className="h-5 w-5" />} code="A-004" />
          </div>
        </div>
      </section>

      {/* ====== Why Choose Us: 技术参数面板 ====== */}
      <section className="relative w-full border-t-2 border-[#BFDBFE] bg-[#F8FAFC]">
        <div className="mx-auto max-w-[1920px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center gap-2">
            <div className="h-px flex-1 bg-[#BFDBFE]" />
            <span className="font-mono text-xs text-[#1E40AF]/60">ADVANTAGES</span>
            <div className="h-px flex-1 bg-[#BFDBFE]" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SpecPanel title="统一口径" desc="同一维度、同一展示方式，避免信息噪声。" icon={<Layers className="h-5 w-5" />} spec="精度: 99.9%" />
            <SpecPanel title="多维分析" desc="性能、上下文、速度、价格多维度直观对比。" icon={<BarChart3 className="h-5 w-5" />} spec="维度: 12+" />
            <SpecPanel title="持续更新" desc="模型迭代快，我们用稳定机制保持榜单可用。" icon={<ClipboardList className="h-5 w-5" />} spec="频率: 每日" />
            <SpecPanel title="可操作性强" desc="收藏/对比/纠错/测评入口，形成闭环决策。" icon={<Ruler className="h-5 w-5" />} spec="闭环: 完整" />
          </div>
        </div>
      </section>

      {/* ====== Services: 工程实施清单 ====== */}
      <section className="relative w-full border-t-2 border-[#BFDBFE] bg-[#EFF6FF]">
        <div className="mx-auto max-w-[1920px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center gap-2">
            <div className="h-px flex-1 bg-[#BFDBFE]" />
            <span className="font-mono text-xs text-[#1E40AF]/60">SERVICES</span>
            <div className="h-px flex-1 bg-[#BFDBFE]" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <BlueprintService title="企业咨询" items={["选型建议与落地路线", "成本评估与预算建议", "评测方案设计"]} phase="Phase 1" />
            <BlueprintService title="私有化/内网" items={["数据与模型更可控", "内网部署与权限", "合规与审计"]} phase="Phase 2" />
            <BlueprintService title="定制服务" items={["自定义榜单与指标", "行业场景模板", "专属看板与报表"]} phase="Phase 3" />
          </div>
        </div>
      </section>

      {/* ====== Dock ====== */}
      <BlueprintDock />
    </div>
  );
}

/* ========== 子组件 ========== */

function BlueprintCarousel({ slides }: { slides: typeof CAROUSEL_SLIDES }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((v) => (v + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = slides[active];
  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-[#BFDBFE] bg-white shadow-lg">
      {/* 工程图边框装饰 */}
      <div className="absolute -top-3 left-4 bg-[#F8FAFC] px-2 font-mono text-xs text-[#1E40AF]/60">FIG. 0.{active + 1}</div>
      <div className="relative aspect-[16/9] w-full">
        <img src={slide.src} alt={slide.alt} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/40 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-sm font-medium text-white">{slide.alt}</p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[#BFDBFE] px-4 py-2 bg-white">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} className={`h-2 w-2 rounded-full transition-colors ${i === active ? "bg-[#1E40AF]" : "bg-[#BFDBFE]"}`} />
          ))}
        </div>
        <span className="font-mono text-xs text-[#475569]">{active + 1}/{slides.length}</span>
      </div>
    </div>
  );
}

function BlueprintStat({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-[#BFDBFE] bg-white p-4 transition-all hover:border-[#1E40AF] hover:shadow-md">
      <div className="absolute -right-2 -top-2 font-mono text-4xl font-bold text-[#BFDBFE]/30">{sub}</div>
      <div className="relative">
        <div className="flex items-center gap-2 text-[#1E40AF]">{icon}<span className="text-xs font-semibold">{sub}</span></div>
        <div className="mt-2 text-3xl font-bold text-[#0F172A]">{value}</div>
        <div className="mt-1 text-xs text-[#475569]">{label}</div>
      </div>
    </div>
  );
}

function BlueprintCard({ title, desc, href, icon, code }: { title: string; desc: string; href: string; icon: React.ReactNode; code: string }) {
  return (
    <Link href={href} className="group relative block overflow-hidden rounded-xl border-2 border-[#BFDBFE] bg-white p-5 transition-all hover:border-[#1E40AF] hover:shadow-md">
      <div className="absolute -right-3 -top-3 font-mono text-3xl font-bold text-[#BFDBFE]/20">{code}</div>
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#1E40AF]">{icon}</div>
          <div className="text-sm font-semibold text-[#0F172A]">{title}</div>
        </div>
        <p className="mt-3 text-sm text-[#475569]">{desc}</p>
        <div className="mt-3 flex items-center text-sm font-medium text-[#1E40AF]">
          立即查看<ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

function SpecPanel({ title, desc, icon, spec }: { title: string; desc: string; icon: React.ReactNode; spec: string }) {
  return (
    <div className="relative rounded-xl border-2 border-[#BFDBFE] bg-white p-5 transition-all hover:border-[#1E40AF]">
      <div className="absolute right-3 top-3 font-mono text-xs text-[#EA580C] font-semibold">{spec}</div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#1E40AF]">{icon}</div>
      <div className="mt-3 text-sm font-semibold text-[#0F172A]">{title}</div>
      <div className="mt-1 text-sm text-[#475569]">{desc}</div>
    </div>
  );
}

function BlueprintService({ title, items, phase }: { title: string; items: string[]; phase: string }) {
  return (
    <div className="relative rounded-xl border-2 border-[#BFDBFE] bg-white p-5">
      <div className="absolute left-0 top-0 rounded-br-lg bg-[#1E40AF] px-2 py-0.5 font-mono text-[10px] text-white">{phase}</div>
      <div className="mt-4 text-sm font-semibold text-[#0F172A]">{title}</div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-[#475569]">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1E40AF]" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BlueprintDock() {
  return (
    <div className="fixed bottom-5 right-5 z-40">
      <div className="flex flex-col gap-2">
        <DockBtn icon={<Globe className="h-4 w-4" />} label="收藏" />
        <DockBtn icon={<GitCompare className="h-4 w-4" />} label="对比" />
        <DockBtn icon={<Shield className="h-4 w-4" />} label="客服" />
      </div>
    </div>
  );
}

function DockBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-[#BFDBFE] bg-white text-[#475569] transition-all hover:border-[#1E40AF] hover:text-[#1E40AF] hover:shadow-md">
      {icon}
    </button>
  );
}

