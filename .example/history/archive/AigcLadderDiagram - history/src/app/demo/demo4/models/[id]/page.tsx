import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUp, ArrowDown, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DEMO_MODELS, getDemoModelById, getVendorColor, getVendorBg, type DemoModel } from "@/lib/demoModels";

const METRICS = [
  { key: "score" as const, label: "综合评分", format: (v: number) => v.toFixed(1), unit: "" },
  { key: "contextK" as const, label: "上下文", format: (v: number) => String(v), unit: "K" },
  { key: "speed" as const, label: "响应速度", format: (v: number) => String(v), unit: "t/s" },
  { key: "price" as const, label: "价格", format: (v: number) => `¥${v}`, unit: "/M" },
  { key: "openSource" as const, label: "开源", format: (v: boolean) => v ? "是" : "否", unit: "" },
];

export default function Page({ params }: { params: { id: string } }) {
  const model = getDemoModelById(params.id);
  if (!model) notFound();

  // Get 5 models: 2 above + current + 2 below
  const sorted = [...DEMO_MODELS].sort((a, b) => b.score - a.score);
  const currentIdx = sorted.findIndex((m) => m.id === model.id);
  const startIdx = Math.max(0, currentIdx - 2);
  const endIdx = Math.min(sorted.length, currentIdx + 3);
  const nearbyModels = sorted.slice(startIdx, endIdx);

  const vendorColor = getVendorColor(model.vendor);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header bar */}
      <header className="sticky top-0 z-50 w-full bg-white shadow-sm border-b border-gray-100">
        <div className="mx-auto flex h-10 w-full items-center justify-between px-4 sm:px-6 lg:px-8 bg-gray-50 text-[11px] text-gray-500">
          <div className="flex items-center gap-3">
            <span>📊 数据更新：2026-04-02</span>
            <span className="hidden sm:inline">📦 覆盖模型：10</span>
            <span className="hidden sm:inline">📐 评分维度：4</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="mailto:164093410@qq.com" className="text-blue-600 hover:underline">纠错</a>
            <span>|</span>
            <button className="hover:text-gray-700">更多榜单 ▾</button>
          </div>
        </div>
        <div className="mx-auto flex h-14 w-full items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <img src="/logo.svg" alt="AigcLadderDiagram" className="h-8 w-8" />
            <div>
              <div className="text-base font-bold text-gray-900 leading-none">AigcLadder</div>
              <div className="text-[10px] text-gray-400 leading-none mt-0.5">AI模型天梯图</div>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {["首页", "模型", "资源", "产品", "文档", "关于"].map((item) => (
              <button
                key={item}
                type="button"
                className={`relative rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  item === "模型" ? "text-blue-600" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {item}
                {item === "模型" && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-blue-600" />
                )}
              </button>
            ))}
          </nav>
          <div className="ml-auto">
            <Link href="/demo/demo4">
              <Button variant="subtle" className="text-xs">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                返回天梯图
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Model Hero */}
      <section className="w-full border-b border-gray-100 bg-white">
        <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
          <div className="w-full flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 ring-1 ring-blue-200">
                Demo4 · 模型详情
              </div>
              <h1 className="mt-3 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight text-slate-900 leading-tight">
                {model.name}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">{model.summary}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button variant="primary" className="text-xs">加入对比</Button>
                <Button variant="subtle" className="text-xs">参与测评</Button>
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

      {/* Comparison Matrix */}
      <section className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">性能对比矩阵</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                排名比 {model.name} 高的前 2 名 + 当前模型 + 排名低的后 2 名
              </p>
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
                  {nearbyModels.map((m, idx) => {
                    const isCurrent = m.id === model.id;
                    const globalRank = sorted.findIndex((x) => x.id === m.id) + 1;
                    const rankDiff = globalRank - (currentIdx + 1);
                    const bgColor = getVendorBg(m.vendor);

                    return (
                      <tr
                        key={m.id}
                        className={`transition-colors ${
                          isCurrent
                            ? "bg-blue-50 ring-2 ring-inset ring-blue-400"
                            : "hover:bg-slate-50"
                        }`}
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
                              href={`/demo/demo4/models/${m.id}`}
                              className={`text-sm font-semibold transition-colors ${
                                isCurrent
                                  ? "text-blue-700 underline underline-offset-2 decoration-blue-400"
                                  : "text-slate-900 hover:text-blue-600"
                              }`}
                            >
                              {m.name}
                            </Link>
                            {isCurrent && (
                              <span className="inline-flex items-center rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                当前
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[10px] text-slate-400">{m.vendor}</div>
                        </td>
                        {METRICS.map((m2) => {
                          const val = m[m2.key as keyof DemoModel];
                          return (
                            <td key={m2.key} className="px-4 py-3">
                              <div className={`text-sm font-semibold tabular-nums ${
                                isCurrent ? "text-blue-700" : "text-slate-900"
                              }`}>
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

      {/* Model Details */}
      <section className="w-full px-4 pb-16 sm:px-6 lg:px-8">
        <div className="w-full">
          <details className="rounded-xl bg-white p-6 ring-1 ring-slate-200 shadow-sm" open>
            <summary className="cursor-pointer text-sm font-semibold text-slate-900">详细参数</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Info title="厂商" value={model.vendor} color={vendorColor} />
              <Info title="开源" value={model.openSource ? "是" : "否"} />
              <Info title="标签" value={model.tags.join(" / ")} />
              <Info title="亮点" value={model.highlights.join(" · ")} />
            </div>
          </details>
        </div>
      </section>
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
