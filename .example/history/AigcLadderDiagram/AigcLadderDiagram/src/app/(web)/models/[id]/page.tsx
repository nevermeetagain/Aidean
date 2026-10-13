"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bookmark,
  GitCompare,
  Headphones,
  Minus,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DEMO_MODELS, getDemoModelById, getVendorColor, getVendorBg, type DemoModel } from "@/lib/config/demoModels";
import { useLadderStore } from "@/stores";

type SectionId = "overview" | "matrix" | "benchmarks" | "examples" | "params";

const SECTION_ITEMS: { id: SectionId; label: string }[] = [
  { id: "overview", label: "模型概览" },
  { id: "matrix", label: "性能对比" },
  { id: "benchmarks", label: "基准测试" },
  { id: "examples", label: "测评示例" },
  { id: "params", label: "详细参数" },
];

const METRICS = [
  { key: "score" as const, label: "综合评分", format: (v: number) => v.toFixed(1), unit: "" },
  { key: "contextK" as const, label: "上下文", format: (v: number) => String(v), unit: "K" },
  { key: "speed" as const, label: "响应速度", format: (v: number) => String(v), unit: "t/s" },
  { key: "price" as const, label: "价格", format: (v: number) => `${v}`, unit: "/M" },
  { key: "openSource" as const, label: "开源", format: (v: boolean) => (v ? "是" : "否"), unit: "" },
];

interface LadderModel extends Omit<DemoModel, "type" | "protocol"> {
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
    official: number;
    actual: number;
    review: number;
    selfTest: number;
    reasoning: number;
    coding: number;
    math: number;
    multilingual: number;
    creativity: number;
    instruction: number;
    safety: number;
    efficiency: number;
    value: number;
    composite: number;
  } | null;
  priceInfo?: { input: number; output: number; cache: number | null; currency: string } | null;
}

interface LadderListResponse {
  items: LadderModel[];
  vendors: string[];
  tags: string[];
  total: number;
}

interface BenchmarkItem {
  id: string;
  benchmarkType: string;
  benchmarkSubType?: string | null;
  sourceName?: string | null;
  totalScore?: number | null;
  scorePercentile?: number | null;
  testDate?: string | null;
  createdAt?: string;
}

interface BenchmarksResponse {
  items: BenchmarkItem[];
  total: number;
}

interface EvaluationItem {
  id: string;
  title: string;
  prompt?: string | null;
  createdAt: string;
  user?: {
    id: string;
    nickname?: string | null;
    email?: string | null;
  } | null;
  evaluationModels?: Array<{
    modelId: string;
    model?: {
      id: string;
      nameDisplay: string;
      modelCode?: string | null;
    } | null;
  }>;
}

interface EvaluationsResponse {
  items: EvaluationItem[];
  pagination?: { total: number; page: number; limit: number; totalPages: number };
}

interface FavoriteListResponse {
  items: Array<{ id: string; refType: string; refId: string }>;
  total: number;
}

async function readPublicData<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`/api/v1${path}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const payload: unknown = await response.json();

    if (payload && typeof payload === "object" && "success" in payload && "data" in payload) {
      return (payload as { data: T }).data;
    }

    return payload as T;
  } catch {
    return null;
  }
}

export default function Page({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [apiModel, setApiModel] = useState<LadderModel | null>(null);
  const [ladderData, setLadderData] = useState<LadderListResponse | null>(null);
  const [benchmarks, setBenchmarks] = useState<BenchmarkItem[]>([]);
  const [evaluationExamples, setEvaluationExamples] = useState<EvaluationItem[]>([]);
  const [modelLoading, setModelLoading] = useState(true);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarksOpen, setBenchmarksOpen] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const addToCompare = useLadderStore((state) => state.addToCompare);

  useEffect(() => {
    let cancelled = false;

    async function loadPageData() {
      setModelLoading(true);

      const [modelData, ladderListData] = await Promise.all([
        readPublicData<LadderModel>(`/models/${params.id}`),
        readPublicData<LadderListResponse>("/models/ladder?kind=default&limit=100"),
      ]);

      if (cancelled) return;

      setApiModel(modelData);
      setLadderData(ladderListData);
      setModelLoading(false);
    }

    void loadPageData();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const model: LadderModel =
    apiModel ??
    getDemoModelById(params.id) ?? {
      id: params.id,
      name: "未知模型",
      vendor: "未知" as any,
      type: "对话",
      protocol: "API",
      score: 0,
      contextK: 0,
      speed: 0,
      price: 0,
      openSource: false,
      tags: [],
      summary: "",
      highlights: [],
    };

  const ladderItems: LadderModel[] = (ladderData?.items?.length ?? 0) > 0 ? ladderData!.items : (DEMO_MODELS as LadderModel[]);
  const sorted = [...ladderItems].sort((a, b) => (b.score ?? b.scores?.composite ?? 0) - (a.score ?? a.scores?.composite ?? 0));
  const currentIdx = sorted.findIndex((m) => m.id === model.id || m.modelCode === (apiModel as any)?.modelCode);
  const startIdx = Math.max(0, currentIdx - 2);
  const endIdx = Math.min(sorted.length, currentIdx + 3);
  const nearbyModels = sorted.slice(startIdx, endIdx);

  const modelIdForRelation = apiModel?.id || model.id;
  const vendorColor = (apiModel as any)?.vendorColor ?? getVendorColor(model.vendor);

  const selectedModel = {
    id: model.id,
    name: model.name,
    vendor: String(model.vendor),
    score: Number(model.score ?? model.scores?.composite ?? 0),
  };

  useEffect(() => {
    let cancelled = false;

    async function loadBenchmarksAndExamples() {
      const [benchmarksData, evaluationsData] = await Promise.all([
        readPublicData<BenchmarksResponse>(`/models/${modelIdForRelation}/benchmarks?limit=20`),
        readPublicData<EvaluationsResponse>("/evaluations?page=1&limit=30"),
      ]);

      if (cancelled) return;

      setBenchmarks(benchmarksData?.items || []);

      const examples = (evaluationsData?.items || []).filter((item) =>
        (item.evaluationModels || []).some((entry) => entry.modelId === modelIdForRelation)
      );
      setEvaluationExamples(examples.slice(0, 6));
    }

    if (modelIdForRelation) {
      void loadBenchmarksAndExamples();
    }

    return () => {
      cancelled = true;
    };
  }, [modelIdForRelation]);

  useEffect(() => {
    const sectionElements = SECTION_ITEMS.map((item) => document.getElementById(item.id)).filter(Boolean) as HTMLElement[];
    if (sectionElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) {
          setActiveSection(visible.target.id as SectionId);
        }
      },
      {
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0.15, 0.4, 0.8],
      }
    );

    sectionElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [modelIdForRelation, modelLoading]);

  useEffect(() => {
    let cancelled = false;

    async function loadFavoriteStatus() {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsFavorite(false);
        return;
      }

      const response = await fetch("/api/v1/favorites", {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        setIsFavorite(false);
        return;
      }
      const payload = await response.json();
      const favoritesData: FavoriteListResponse | null =
        payload && typeof payload === "object" && "data" in payload
          ? (payload.data as FavoriteListResponse)
          : (payload as FavoriteListResponse);
      if (cancelled) return;

      const exists = (favoritesData?.items || []).some(
        (item) => item.refType === "MODEL" && item.refId === modelIdForRelation
      );
      setIsFavorite(exists);
    }

    if (modelIdForRelation) {
      void loadFavoriteStatus();
    }

    return () => {
      cancelled = true;
    };
  }, [modelIdForRelation]);

  const sectionMap = useMemo(
    () =>
      SECTION_ITEMS.reduce<Record<SectionId, string>>((acc, item) => {
        acc[item.id] = item.label;
        return acc;
      }, {} as Record<SectionId, string>),
    []
  );

  const paramRows = useMemo(
    () => [
      { label: "模型名称", value: model.name || "-" },
      { label: "厂商", value: String(model.vendor || "-") },
      { label: "模型类型", value: model.type || "-" },
      { label: "协议类型", value: model.protocol || "-" },
      { label: "参数规模", value: model.parameterCount || "-" },
      { label: "上下文长度", value: model.contextLength ? String(model.contextLength) : model.contextK ? `${model.contextK}K` : "-" },
      { label: "最大输出", value: model.maxOutputTokens ? String(model.maxOutputTokens) : "-" },
      { label: "是否开源", value: model.openSource ? "是" : "否" },
      { label: "标签", value: model.tags?.length ? model.tags.join(" / ") : "-" },
      { label: "官方地址", value: model.officialUrl || "-" },
      { label: "文档地址", value: model.docsUrl || "-" },
      { label: "仓库地址", value: model.githubUrl || "-" },
      { label: "论文地址", value: model.paperUrl || "-" },
    ],
    [model]
  );

  const handleAddToCompare = () => {
    const added = addToCompare(selectedModel);
    if (!added) {
      window.alert("对比列表已满，请先移除部分模型");
      return;
    }
    router.push("/compare");
  };

  const handleGoToEvaluation = () => {
    const added = addToCompare(selectedModel);
    if (!added) {
      window.alert("测评列表已满，请先移除部分模型");
      return;
    }
    router.push("/evaluation");
  };

  const handleToggleFavorite = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    setFavoriteLoading(true);
    try {
      const method = isFavorite ? "DELETE" : "POST";
      const response = await fetch("/api/v1/favorites", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          refType: "MODEL",
          refId: modelIdForRelation,
          note: `模型详情收藏：${model.name}`,
        }),
      });

      if (!response.ok) {
        throw new Error("收藏操作失败");
      }

      setIsFavorite((prev) => !prev);
    } catch {
      window.alert("收藏操作失败，请稍后重试");
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleOpenBenchmarks = async () => {
    setBenchmarksOpen(true);
    if (benchmarks.length > 0 || benchmarkLoading) return;

    setBenchmarkLoading(true);
    try {
      const data = await readPublicData<BenchmarksResponse>(`/models/${modelIdForRelation}/benchmarks?limit=20`);
      setBenchmarks(data?.items || []);
    } finally {
      setBenchmarkLoading(false);
    }
  };

  const scrollToSection = (id: SectionId) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (modelLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="w-full border-b border-slate-200 bg-white" id="overview">
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
              <h1 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight text-slate-900 leading-tight">{model.name}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">{model.summary}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button variant="primary" className="text-xs" onClick={handleAddToCompare}>
                  加入对比
                </Button>
                <Button variant="subtle" className="text-xs" onClick={handleGoToEvaluation}>
                  参与测评
                </Button>
                <Button variant="subtle" className="text-xs" onClick={handleOpenBenchmarks}>
                  查看基准测试
                </Button>
                <Button
                  variant={isFavorite ? "primary" : "subtle"}
                  className="text-xs"
                  onClick={handleToggleFavorite}
                  disabled={favoriteLoading}
                >
                  {favoriteLoading ? "处理中..." : isFavorite ? "取消收藏" : "加入收藏"}
                </Button>
              </div>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-4 lg:w-[600px]">
              <KpiCard label="综合评分" value={model.score.toFixed(1)} unit="" />
              <KpiCard label="上下文" value={String(model.contextK)} unit="K" />
              <KpiCard label="响应速度" value={String(model.speed)} unit="t/s" />
              <KpiCard label="价格" value={`${model.price}`} unit="/M" />
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-6">
        <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6">
          <aside className="hidden lg:block">
            <div className="sticky top-20 rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 px-2 text-xs font-semibold text-slate-500">页面目录</div>
              <nav className="space-y-1">
                {SECTION_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                      activeSection === item.id
                        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <div className="space-y-6">
            <section id="matrix" className="scroll-mt-24">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">性能对比矩阵</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">排名比 {model.name} 高的前 2 名 + 当前模型 + 排名低的后 2 名</p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500" /> 当前模型
                  </span>
                  <span> 上下滑动查看更多</span>
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
                          <tr key={m.id} className={`transition-colors ${isCurrent ? "bg-blue-50 ring-2 ring-inset ring-blue-400" : "hover:bg-slate-50"}`}>
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

                            {METRICS.map((metric) => {
                              const val = m[metric.key as keyof DemoModel];
                              return (
                                <td key={metric.key} className="px-4 py-3">
                                  <div className={`text-sm font-semibold tabular-nums ${isCurrent ? "text-blue-700" : "text-slate-900"}`}>
                                    {metric.format(val as never)}
                                    {metric.unit && <span className="text-[10px] font-normal text-slate-400 ml-0.5">{metric.unit}</span>}
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
            </section>

            <section id="benchmarks" className="scroll-mt-24 rounded-xl bg-white p-6 ring-1 ring-slate-200 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">基准测试</h2>
              <p className="mt-1 text-xs text-slate-500">共 {benchmarks.length} 条记录，点击上方查看基准测试可弹窗查看完整列表。</p>
              <div className="mt-4 space-y-2">
                {benchmarks.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    <span className="font-semibold">{item.benchmarkType}</span>
                    {item.benchmarkSubType ? <span className="ml-1 text-slate-500">/ {item.benchmarkSubType}</span> : null}
                    <span className="ml-2 text-slate-500">{item.sourceName || "未知来源"}</span>
                    <span className="ml-2 font-medium text-slate-800">{Number(item.totalScore || 0).toFixed(1)}</span>
                  </div>
                ))}
                {benchmarks.length === 0 ? <div className="text-xs text-slate-500">暂无基准测试数据</div> : null}
              </div>
            </section>

            <section id="examples" className="scroll-mt-24 rounded-xl bg-white p-6 ring-1 ring-slate-200 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">测评示例</h2>
              <p className="mt-1 text-xs text-slate-500">展示历史测评中包含当前模型的样例，支持快速进入测评页继续对比。</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {evaluationExamples.map((item) => (
                  <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <h3 className="text-sm font-medium text-slate-900 line-clamp-1">{item.title || "未命名测评"}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{item.prompt || "该测评未填写提示词内容"}</p>
                    <div className="mt-2 text-[11px] text-slate-500">{new Date(item.createdAt).toLocaleString("zh-CN")}</div>
                  </article>
                ))}
                {evaluationExamples.length === 0 ? <div className="text-xs text-slate-500">暂无包含当前模型的历史测评示例</div> : null}
              </div>
            </section>

            <section id="params" className="scroll-mt-24 rounded-xl bg-white p-6 ring-1 ring-slate-200 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">详细参数</h2>
              <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-slate-200">
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {paramRows.map((row, index) => (
                      <tr key={row.label} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <th className="w-44 border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold text-slate-500">
                          {row.label}
                        </th>
                        <td className="border-b border-slate-200 px-4 py-3 text-slate-800">
                          {row.label === "厂商" && vendorColor ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: vendorColor }} />
                              <span>{row.value}</span>
                            </span>
                          ) : (
                            row.value
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </section>

      <div className="fixed bottom-6 right-6 z-50">
        <div className="w-[72px] overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-lg">
          <DockButton href="/user/favorites" label="收藏" icon={<Bookmark className="h-4 w-4" />} />
          <DockButton href="/compare" label="对比" icon={<GitCompare className="h-4 w-4" />} />
          <DockButton href="/products/consulting" label="客服" icon={<Headphones className="h-4 w-4" />} />
        </div>
      </div>

      {benchmarksOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{sectionMap.benchmarks} - {model.name}</h3>
                <p className="text-xs text-slate-500">共 {benchmarks.length} 条记录</p>
              </div>
              <button
                type="button"
                onClick={() => setBenchmarksOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="关闭基准测试弹窗"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-5">
              {benchmarkLoading ? (
                <div className="text-sm text-slate-500">加载中...</div>
              ) : benchmarks.length === 0 ? (
                <div className="text-sm text-slate-500">暂无基准测试记录</div>
              ) : (
                <div className="space-y-2">
                  {benchmarks.map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="text-sm font-semibold text-slate-900">
                        {item.benchmarkType}
                        {item.benchmarkSubType ? <span className="ml-1 text-slate-500">/ {item.benchmarkSubType}</span> : null}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        来源：{item.sourceName || "未知来源"}  时间：
                        {item.testDate ? new Date(item.testDate).toLocaleDateString("zh-CN") : "-"}
                      </div>
                      <div className="mt-1 text-xs text-slate-700">
                        总分：{Number(item.totalScore || 0).toFixed(2)}  百分位：{Number(item.scorePercentile || 0).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
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

function DockButton({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex w-full flex-col items-center gap-1 px-2 py-2 text-[10px] text-slate-600 hover:bg-slate-50">
      {icon}
      <span>{label}</span>
    </Link>
  );
}
