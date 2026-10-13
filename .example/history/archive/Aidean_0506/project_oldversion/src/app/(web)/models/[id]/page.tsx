"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUp, ArrowDown, Minus, Bookmark, GitCompare, Headphones } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DEMO_MODELS, getDemoModelById, getVendorColor, getVendorBg, type DemoModel } from "@/lib/config/demoModels";
import { useApi } from "@/hooks/useApi";

const METRICS = [
  { key: "score" as const, label: "综合评分", format: (v: number) => v.toFixed(1), unit: "" },
  { key: "contextK" as const, label: "上下文", format: (v: number) => String(v), unit: "K" },
  { key: "speed" as const, label: "响应速度", format: (v: number) => String(v), unit: "t/s" },
  { key: "price" as const, label: "价格", format: (v: number) => `¥${v}`, unit: "/M" },
  { key: "openSource" as const, label: "开源", format: (v: boolean) => (v ? "是" : "否"), unit: "" },
];

interface LadderModel extends Omit<DemoModel, 'type' | 'protocol'> {
  type: string;
  protocol: string;
  slug?: string;
  modelCode?: string;
  parameterCount?: string;
  contextLength?: number;
  maxOutputTokens?: number;
  isMultiModal?: boolean;
  isReasoning?: boolean;
  isCodingOptimized?: boolean;
  officialUrl?: string;
  docsUrl?: string;
  githubUrl?: string;
  paperUrl?: string;
  publishedAt?: string | null;
  nameCn?: string;
  nameEn?: string;
  vendorColor?: string;
  vendorLogo?: string;
  vendorCode?: string;
  scores?: {
    official: number; actual: number; review: number; selfTest: number;
    reasoning: number; coding: number; math: number; multilingual: number;
    creativity: number; instruction: number; safety: number; efficiency: number;
    value: number; composite: number;
  } | null;
  priceInfo?: { input: number; output: number; cache: number | null; currency: string } | null;
}

export default function Page({ params }: { params: { id: string } }) {
  // SWR: 从API获取真实模型数据
  const { data: apiModel, isLoading: modelLoading } = useApi<LadderModel>(`/models/${params.id}`);
  // SWR: 获取天梯图数据用于对比矩阵
  const { data: ladderData } = useApi<{ items: LadderModel[]; vendors: string[]; tags: string[]; total: number }>(`/models/ladder?kind=default&limit=100`);

  const model: LadderModel = apiModel ?? getDemoModelById(params.id) ?? {
    id: params.id, name: "未知模型", vendor: "未知" as any, type: "对话",
    protocol: "API", score: 0, contextK: 0, speed: 0, price: 0,
    openSource: false, tags: [], summary: "", highlights: [],
  };

  // 使用API数据排序，无数据时降级到DEMO_MODELS
  const ladderItems: LadderModel[] = (ladderData?.items?.length ?? 0) > 0 ? ladderData!.items : DEMO_MODELS as LadderModel[];
  const sorted = [...ladderItems].sort((a, b) => (b.score ?? b.scores?.composite ?? 0) - (a.score ?? a.scores?.composite ?? 0));
  const currentIdx = sorted.findIndex((m) => m.id === model.id || m.modelCode === (apiModel as any)?.modelCode);
  const startIdx = Math.max(0, currentIdx - 2);
  const endIdx = Math.min(sorted.length, currentIdx + 3);
  const nearbyModels = sorted.slice(startIdx, endIdx);

  const vendorColor = (apiModel as any)?.vendorColor ?? getVendorColor(model.vendor);

  if (modelLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="text-slate-500">加载中...</div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="w-full border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1920px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-3">
                <Link href="/models" className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  返回天梯图
                </Link>
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 ring-1 ring-blue-200">
                  模型详情
                </span>
              </div>
              <h1 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight text-slate-900 leading-tight">
                {model.name}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">{model.summary}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button variant="primary" className="text-xs">
                  加入对比
                </Button>
                <Button variant="subtle" className="text-xs">
                  参与测评
                </Button>
              </div>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-4 lg:w-[600px]">
              <KpiCard label="综合评分" value={model.score.toFixed(1)} unit="" />
              <KpiCard label="上下文" value={String(model.contextK)} unit="K" />
              <KpiCard label="响应速度" value={String(model.speed)} unit="t/s" />
              <KpiCard label="价格" value={`¥${model.price}`} unit="/M" />
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-6">
        <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">性能对比矩阵</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">排名比 {model.name} 高的前 2 名 + 当前模型 + 排名低的后 2 名</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> 当前模型
              </span>
              <span>↕ 上下滑动查看更多</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 w-[48px]">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 min-w-[180px]">模型</th>
                    {METRICS.map((m) => (
                      <th key={m.key} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 min-w-[100px]">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {nearbyModels.map((m) => {
                    const isCurrent = m.id === model.id;
                    const globalRank = sorted.findIndex((x) => x.id === m.id) + 1;
                    const rankDiff = globalRank - (currentIdx + 1);
                    const bgColor = getVendorBg(m.vendor as any);

                    return (
                      <tr
                        key={m.id}
                        className={`transition-colors ${isCurrent ? "bg-blue-50 ring-2 ring-inset ring-blue-400" : "hover:bg-slate-50"}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-mono font-bold text-slate-700">{globalRank}</span>
                            {rankDiff < 0 ? (
                              <ArrowUp className="h-3 w-3 text-green-500" />
                            ) : rankDiff > 0 ? (
                              <ArrowDown className="h-3 w-3 text-red-500" />
                            ) : (
                              <Minus className="h-3 w-3 text-slate-400" />
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ring-1 ring-black/10 ${bgColor}`} />
                            <Link
                              href={`/models/${m.id}`}
                              className={`text-sm font-semibold transition-colors ${
                                isCurrent ? "text-blue-700 underline underline-offset-2 decoration-blue-400" : "text-slate-900 hover:text-blue-600"
                              }`}
                            >
                              {m.name}
                            </Link>
                            {isCurrent && (
                              <span className="inline-flex items-center rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white">当前</span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[10px] text-slate-400">{m.vendor}</div>
                        </td>

                        {METRICS.map((m2) => {
                          const val = m[m2.key as keyof DemoModel];
                          return (
                            <td key={m2.key} className="px-4 py-3">
                              <div className={`text-sm font-semibold tabular-nums ${isCurrent ? "text-blue-700" : "text-slate-900"}`}>
                                {m2.format(val as never)}
                                {m2.unit && <span className="text-[10px] font-normal text-slate-400 ml-0.5">{m2.unit}</span>}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full pb-16">
        <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
          <details className="rounded-xl bg-white p-6 ring-1 ring-slate-200 shadow-sm" open>
            <summary className="cursor-pointer text-sm font-semibold text-slate-900">详细参数</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Info title="厂商" value={model.vendor} color={vendorColor} />
              <Info title="开源" value={model.openSource ? "是" : "否"} />
              <Info title="标签" value={model.tags?.join(" / ") ?? "-"} />
              <Info title="亮点" value={model.highlights?.join(" · ") ?? "-"} />
            </div>
          </details>
        </div>
      </section>

      <div className="fixed bottom-6 right-6 z-50">
        <div className="w-[72px] overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-lg">
          <DockButton label="收藏" icon={<Bookmark className="h-4 w-4" />} />
          <DockButton label="对比" icon={<GitCompare className="h-4 w-4" />} />
          <DockButton label="客服" icon={<Headphones className="h-4 w-4" />} />
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
        {unit && <span className="text-xs text-slate-400">{unit}</span>}
      </div>
    </div>
  );
}

function Info({ title, value, color }: { title: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="text-xs font-medium text-slate-500">{title}</div>
      <div className="mt-1.5 flex items-center gap-2">
        {color && <div className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: color }} />}
        <span className="text-sm font-semibold text-slate-900">{value}</span>
      </div>
    </div>
  );
}

function DockButton({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <button type="button" className="flex w-full flex-col items-center gap-1 px-2 py-2 text-[10px] text-slate-600 hover:bg-slate-50">
      {icon}
      <span>{label}</span>
    </button>
  );
}
