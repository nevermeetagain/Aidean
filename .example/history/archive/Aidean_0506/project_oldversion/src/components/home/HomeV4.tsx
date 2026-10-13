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
  Terminal,
  Zap,
  Target,
  RefreshCw,
  MousePointer,
  ChevronRight,
  Activity,
  Database,
  Globe,
  Shield,
} from "lucide-react";

const CAROUSEL_SLIDES = [
  { src: "/images/banners/reference1.webp", alt: "AI模型性能天梯图", href: "/models" },
  { src: "/images/banners/reference2.webp", alt: "模型评测体系", href: "http://36.134.158.50:10001/", external: true },
  { src: "/images/banners/reference3.webp", alt: "数字分身", href: "/products/ai-employee" },
  { src: "/images/banners/reference4.webp", alt: "Skill技能", href: "/resources/skills" },
];

interface HomeStats {
  modelCount: number;
  toolCount: number;
  solutionCount: number;
  appCount: number;
}

export default function HomeV4() {
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
    <div className="flex flex-col bg-[#0A0A0F] min-h-screen text-[#E2E8F0]">
      {/* ====== Hero: 终端控制台风 ====== */}
      <section className="relative w-full overflow-hidden">
        {/* 网格背景 */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(0,240,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        {/* 光晕装饰 */}
        <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-[#00F0FF]/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-[#7C3AED]/5 blur-[100px]" />

        <div className="relative mx-auto max-w-[1920px] px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-[0.55fr_1fr]">
            {/* 左侧文案 */}
            <div className="flex flex-col items-start">
              <div className="inline-flex items-center gap-2 rounded-lg bg-[#00F0FF]/10 px-4 py-1.5 text-sm font-medium text-[#00F0FF] ring-1 ring-[#00F0FF]/30">
                <Terminal className="h-4 w-4" />
                AI 模型天梯图平台
              </div>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                <TypewriterText text="发现最佳 AI 模型" />
              </h1>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-[#94A3B8]">
                全面评测、多维度对比，助你快速找到最适合的 AI 解决方案
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/models"
                  className="group inline-flex items-center gap-2 rounded-xl bg-[#00F0FF] px-6 py-3 text-sm font-semibold text-[#0A0A0F] transition-all hover:bg-[#00F0FF]/90 hover:shadow-[0_0_30px_rgba(0,240,255,0.3)]"
                >
                  <Rocket className="h-4 w-4" />
                  立即体验
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/compare"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#1E293B] bg-[#111118] px-6 py-3 text-sm font-semibold text-[#E2E8F0] transition-all hover:border-[#00F0FF]/50 hover:bg-[#1E293B]"
                >
                  <GitCompare className="h-4 w-4" />
                  进入对比
                </Link>
              </div>
            </div>

            {/* 右侧轮播 */}
            <div className="relative">
              <CyberCarousel slides={CAROUSEL_SLIDES} />
            </div>
          </div>
        </div>
      </section>

      {/* ====== Stats: 终端窗口风 ====== */}
      <section className="relative w-full border-t border-[#1E293B] bg-[#0A0A0F]">
        <div className="mx-auto max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <TerminalWindow label="MODELS" value={fmtCount(stats.modelCount, "200+")} sub="覆盖模型" icon={<Database className="h-4 w-4" />} />
            <TerminalWindow label="TOOLS" value={fmtCount(stats.toolCount, "10万+")} sub="可用工具" icon={<Zap className="h-4 w-4" />} />
            <TerminalWindow label="SOLUTIONS" value={fmtCount(stats.solutionCount, "1000+")} sub="解决方案" icon={<Target className="h-4 w-4" />} />
            <TerminalWindow label="APPS" value={fmtCount(stats.appCount, "3+")} sub="专属应用" icon={<Cpu className="h-4 w-4" />} />
          </div>
        </div>
      </section>

      {/* ====== Quick Actions: 代码卡片风 ====== */}
      <section className="relative w-full border-t border-[#1E293B] bg-[#111118]">
        <div className="mx-auto max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center gap-2 text-sm font-medium text-[#00F0FF]">
            <ChevronRight className="h-4 w-4" />
            <span className="font-mono">quick_actions.py</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CodeCard title="模型天梯图" desc="查看大模型性能排名，对比选择最优模型" href="/models" icon={<BarChart3 className="h-5 w-5" />} code="ladder.py" />
            <CodeCard title="对比评测" desc="多维度对比不同模型，找到最适合的方案" href="/compare" icon={<GitCompare className="h-5 w-5" />} code="compare.py" />
            <CodeCard title="公开解决方案" desc="工具应用一键直达，优质方案更快落地" href="/products/solutions" icon={<FlaskConical className="h-5 w-5" />} code="solutions.py" />
            <CodeCard title="AI资源" desc="Agent、MCP、Skills资源集合" href="/resources" icon={<Cpu className="h-5 w-5" />} code="resources.py" />
          </div>
        </div>
      </section>

      {/* ====== Why Choose Us: 数据面板风 ====== */}
      <section className="relative w-full border-t border-[#1E293B] bg-[#0A0A0F]">
        <div className="mx-auto max-w-[1920px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center gap-2 text-sm font-medium text-[#7C3AED]">
            <ChevronRight className="h-4 w-4" />
            <span className="font-mono">advantages.json</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DataPanel title="统一口径" desc="同一维度、同一展示方式，避免信息噪声。" icon={<Activity className="h-5 w-5" />} accent="#00F0FF" />
            <DataPanel title="多维分析" desc="性能、上下文、速度、价格多维度直观对比。" icon={<BarChart3 className="h-5 w-5" />} accent="#7C3AED" />
            <DataPanel title="持续更新" desc="模型迭代快，我们用稳定机制保持榜单可用。" icon={<RefreshCw className="h-5 w-5" />} accent="#00F0FF" />
            <DataPanel title="可操作性强" desc="收藏/对比/纠错/测评入口，形成闭环决策。" icon={<MousePointer className="h-5 w-5" />} accent="#7C3AED" />
          </div>
        </div>
      </section>

      {/* ====== Services: 系统日志风 ====== */}
      <section className="relative w-full border-t border-[#1E293B] bg-[#111118]">
        <div className="mx-auto max-w-[1920px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center gap-2 text-sm font-medium text-[#00F0FF]">
            <ChevronRight className="h-4 w-4" />
            <span className="font-mono">services.log</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <LogEntry title="企业咨询" items={["选型建议与落地路线", "成本评估与预算建议", "评测方案设计"]} timestamp="2026-04-24T10:00:00Z" />
            <LogEntry title="私有化/内网" items={["数据与模型更可控", "内网部署与权限", "合规与审计"]} timestamp="2026-04-24T10:01:00Z" />
            <LogEntry title="定制服务" items={["自定义榜单与指标", "行业场景模板", "专属看板与报表"]} timestamp="2026-04-24T10:02:00Z" />
          </div>
        </div>
      </section>

      {/* ====== Dock ====== */}
      <CyberDock />
    </div>
  );
}

/* ========== 子组件 ========== */

function TypewriterText({ text }: { text: string }) {
  const [display, setDisplay] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setDisplay(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(timer);
    }, 80);
    return () => clearInterval(timer);
  }, [text]);

  useEffect(() => {
    const blink = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(blink);
  }, []);

  return (
    <span className="font-mono">
      {display}
      <span className={`inline-block w-[3px] h-[1em] bg-[#00F0FF] ml-1 align-middle ${showCursor ? "opacity-100" : "opacity-0"}`} />
    </span>
  );
}

function CyberCarousel({ slides }: { slides: typeof CAROUSEL_SLIDES }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((v) => (v + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = slides[active];
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#1E293B] bg-[#111118] shadow-[0_0_40px_rgba(0,240,255,0.05)]">
      <div className="flex items-center gap-2 border-b border-[#1E293B] bg-[#0A0A0F] px-4 py-2">
        <div className="h-3 w-3 rounded-full bg-red-500/80" />
        <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
        <div className="h-3 w-3 rounded-full bg-green-500/80" />
        <span className="ml-2 font-mono text-xs text-[#94A3B8]">preview.exe</span>
      </div>
      <div className="relative aspect-[16/9] w-full">
        <img src={slide.src} alt={slide.alt} className="h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="font-mono text-sm text-[#00F0FF]">{slide.alt}</p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[#1E293B] px-4 py-2">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} className={`h-2 w-2 rounded-full transition-colors ${i === active ? "bg-[#00F0FF]" : "bg-[#1E293B]"}`} />
          ))}
        </div>
        <span className="font-mono text-xs text-[#94A3B8]">{active + 1}/{slides.length}</span>
      </div>
    </div>
  );
}

function TerminalWindow({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#1E293B] bg-[#111118] p-4 transition-all hover:border-[#00F0FF]/30 hover:shadow-[0_0_20px_rgba(0,240,255,0.05)]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-[#94A3B8]">{label}</span>
        <span className="text-[#00F0FF]">{icon}</span>
      </div>
      <div className="mt-2 font-mono text-3xl font-bold text-white">{value}</div>
      <div className="mt-1 font-mono text-xs text-[#94A3B8]">{sub}</div>
    </div>
  );
}

function CodeCard({ title, desc, href, icon, code }: { title: string; desc: string; href: string; icon: React.ReactNode; code: string }) {
  return (
    <Link href={href} className="group block rounded-xl border border-[#1E293B] bg-[#0A0A0F] p-5 transition-all hover:border-[#00F0FF]/30 hover:shadow-[0_0_20px_rgba(0,240,255,0.05)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00F0FF]/10 text-[#00F0FF]">{icon}</div>
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="font-mono text-xs text-[#94A3B8]">{code}</div>
        </div>
      </div>
      <p className="mt-3 text-sm text-[#94A3B8]">{desc}</p>
      <div className="mt-3 flex items-center text-sm font-medium text-[#00F0FF]">
        立即查看
        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function DataPanel({ title, desc, icon, accent }: { title: string; desc: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="rounded-xl border border-[#1E293B] bg-[#111118] p-5 transition-all hover:border-[#1E293B] hover:bg-[#0A0A0F]">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}15`, color: accent }}>
        {icon}
      </div>
      <div className="mt-3 text-sm font-semibold text-white">{title}</div>
      <div className="mt-1 text-sm text-[#94A3B8]">{desc}</div>
    </div>
  );
}

function LogEntry({ title, items, timestamp }: { title: string; items: string[]; timestamp: string }) {
  return (
    <div className="rounded-xl border border-[#1E293B] bg-[#0A0A0F] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        <span className="font-mono text-xs text-[#94A3B8]">{timestamp}</span>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-[#94A3B8]">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CyberDock() {
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
    <button className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#1E293B] bg-[#111118] text-[#94A3B8] transition-all hover:border-[#00F0FF]/50 hover:text-[#00F0FF] hover:shadow-[0_0_15px_rgba(0,240,255,0.15)]">
      {icon}
    </button>
  );
}
