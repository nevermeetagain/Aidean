"use client";

import { useMemo } from "react";
import { useApi, publicApiKeys } from "@/hooks/useApi";
import { HomeCarousel } from "@/components/home/HomeCarousel";
import Link from "next/link";
import { Rocket, BarChart3, GitCompare, ArrowRight, ArrowUpRight, Layers, Sparkles } from "lucide-react";

const CAROUSEL_SLIDES = [
  { src: "/images/banners/reference1.webp", alt: "", href: "/aidean" },
  { src: "/images/banners/reference2.webp", alt: "", href: "http://36.134.158.50:10001/", external: true },
  { src: "/images/banners/reference3.webp", alt: "", href: "/sphere/ai-employee" },
  { src: "/images/banners/reference4.webp", alt: "", href: "/space/skills" },
];

export default function HomeB() {
  const { data: statsData } = useApi<{
    models: { total: number; active: number };
    tools: { total: number; skills: number; mcps: number; agents: number };
  }>(publicApiKeys.stats());

  const stats = useMemo(() => ({
    modelCount: statsData?.models?.total ?? 0,
    toolCount: statsData?.tools?.total ?? 0,
  }), [statsData]);

  const fmtCount = (n: number, fallback: string) => (n > 0 ? `${n.toLocaleString()}+` : fallback);

  return (
    <div className="min-h-screen bg-white">
      {/* HERO - Editorial 鏉傚織椋庯細宸︽枃鍙冲浘婧㈠嚭 */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-[1920px]">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* 宸︿晶鏂囨鍖?- 瓒呭ぇ鐣欑櫧 */}
            <div className="flex flex-col justify-center px-4 py-24 sm:px-8 lg:px-16 lg:py-40">
              <div className="text-sm font-medium tracking-[0.2em] text-slate-400 uppercase">Aidean Magazine</div>
              <h1 className="mt-8 text-6xl font-light tracking-tight text-slate-900 sm:text-7xl lg:text-8xl">
                鍙戠幇
                <br />
                <span className="font-semibold italic">最佳</span>
                <br />
                AI 妯″瀷
              </h1>
              <p className="mt-8 max-w-md text-lg leading-relaxed text-slate-500">
                鍏ㄩ潰璇勬祴銆佸缁村害瀵规瘮锛屽姪浣犲揩閫熸壘鍒版渶閫傚悎鐨?AI 瑙ｅ喅鏂规
              </p>
              <div className="mt-10 flex items-center gap-6">
                <Link href="/aidean" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 underline underline-offset-4 transition-colors hover:text-indigo-600">
                  绔嬪嵆浣撻獙 <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/compare" className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900">
                  杩涘叆瀵规瘮 <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* 搴曢儴鏁版嵁鏉?*/}
              <div className="mt-16 flex gap-12 border-t border-slate-100 pt-8">
                <div>
                  <div className="text-2xl font-light text-slate-900">{fmtCount(stats.modelCount, "200+")}</div>
                  <div className="mt-1 text-xs tracking-wide text-slate-400 uppercase">瑕嗙洊妯″瀷</div>
                </div>
                <div>
                  <div className="text-2xl font-light text-slate-900">{fmtCount(stats.toolCount, "10涓?")}</div>
                  <div className="mt-1 text-xs tracking-wide text-slate-400 uppercase">鍙敤宸ュ叿</div>
                </div>
              </div>
            </div>

            {/* 鍙充晶杞挱鍥?- 鍥剧墖鍚戝彸婧㈠嚭 */}
            <div className="relative lg:-mr-20">
              <div className="h-[60vh] lg:h-[90vh]">
                <HomeCarousel slides={CAROUSEL_SLIDES} autoPlay autoPlayInterval={5000} className="h-full rounded-l-3xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 妯悜闀挎潯鎺ㄨ崘 - 鏉傚織鐩綍椋庢牸 */}
      <section className="border-t border-slate-100 bg-slate-50/50 py-24">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex items-end justify-between">
            <h2 className="text-3xl font-light tracking-tight text-slate-900">
              鏈湡<span className="font-semibold">鎺ㄨ崘</span>
            </h2>
            <span className="text-sm text-slate-400">04 / 2026</span>
          </div>

          <div className="space-y-4">
            <MagazineRow number="01" title="模型天梯图" desc="性能 · 性价比 · 开源 · 移动端" href="/aidean" />
            <MagazineRow number="02" title="对比评测" desc="多维度直观比较不同模型" href="/compare" />
            <MagazineRow number="03" title="公开解决方案" desc="工具应用一键直达" href="/sphere/solutions" />
            <MagazineRow number="04" title="AI 资源中心" desc="Agent · MCP · Skills 资源聚合" href="/space" />
          </div>
        </div>
      </section>

      {/* 鍥炬枃绌挎彃 - 闈炲绉?*/}
      <section className="py-24">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12">
            <div className="lg:col-span-5 lg:col-start-2">
              <div className="text-sm font-medium tracking-[0.2em] text-slate-400 uppercase">Tutorial</div>
              <h3 className="mt-4 text-4xl font-light tracking-tight text-slate-900">
                如何读懂<span className="font-semibold">性能天梯图</span>
              </h3>
              <p className="mt-6 text-lg leading-relaxed text-slate-500">
                鍏堢湅缁村害锛屽啀鐪嬪樊璺濄€傚叆闂ㄦ寚鍗楀府浣犵悊瑙ｈ瘎鍒嗙淮搴︺€佺瓫閫夐€昏緫鍜岃嚜瀹氫箟鎺掑簭鍏紡銆?              </p>
              <Link href="/docs/help" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 underline underline-offset-4">
                闃呰鏁欑▼ <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="lg:col-span-5">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
                <img src="/images/banners/reference1.webp" alt="鏁欑▼" className="h-full w-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 搴曢儴鏋佺畝鏁版嵁 */}
      <section className="border-t border-slate-100 bg-white py-24">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            <EditorialStat value="1,248+" label="瑕嗙洊妯″瀷" />
            <EditorialStat value="10x" label="瀵规瘮鏁堢巼" />
            <EditorialStat value="4 维" label="评分体系" />
            <EditorialStat value="鍏嶈垂/浠樿垂" label="閫忔槑杈圭晫" />
          </div>
        </div>
      </section>
    </div>
  );
}

function MagazineRow({ number, title, desc, href }: { number: string; title: string; desc: string; href: string }) {
  return (
    <Link href={href} className="group flex items-center justify-between border-b border-slate-200 py-6 transition-colors hover:border-slate-400">
      <div className="flex items-center gap-8">
        <span className="text-sm font-light text-slate-300">{number}</span>
        <span className="text-xl font-medium text-slate-900 transition-colors group-hover:text-indigo-600">{title}</span>
      </div>
      <div className="flex items-center gap-6">
        <span className="hidden text-sm text-slate-400 sm:block">{desc}</span>
        <ArrowUpRight className="h-5 w-5 text-slate-300 transition-all group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-slate-900" />
      </div>
    </Link>
  );
}

function EditorialStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-light tracking-tight text-slate-900">{value}</div>
      <div className="mt-2 text-xs tracking-[0.15em] text-slate-400 uppercase">{label}</div>
    </div>
  );
}

