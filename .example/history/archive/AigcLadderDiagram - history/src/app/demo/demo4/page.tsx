"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Bookmark, GitCompare, Headphones, Check, ChevronDown } from "lucide-react";

import { DemoHeaderV4 } from "@/components/demo/DemoHeaderV4";
import { LadderScoreTable } from "@/components/demo/LadderScoreTable";

import {
  DEMO_MODELS,
  DEMO_VENDORS,
  DEMO_TAGS,
  getVendorColor,
  type DemoVendor,
} from "@/lib/demoModels";

import { PRO_TYPES, PROTOCOLS } from "@/components/demo/DemoFilterPanel";

type SortKey = "score" | "contextK" | "speed" | "price";
type FilterTab = "vendors" | "types" | "protocols" | "tags" | "openSource";
type AppVersion = "pro" | "app";

const PAGE_SIZE = 50;
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "vendors", label: "模型商" },
  { key: "types", label: "类型" },
  { key: "protocols", label: "协议" },
  { key: "tags", label: "标签" },
  { key: "openSource", label: "开源" },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "score", label: "推理基准得分" },
  { key: "contextK", label: "上下文长度" },
  { key: "speed", label: "响应速度" },
  { key: "price", label: "价格" },
];

const APP_SCENARIOS = [
  { key: "general", label: "通用助手", sub: ["文案创作", "知识问答", "翻译", "摘要"] },
  { key: "coding", label: "编程开发", sub: ["Vibe Coding", "代码生成", "Debug", "API开发"] },
  { key: "reasoning", label: "深度推理", sub: ["数学推理", "逻辑分析", "科学计算", "长文本推理"] },
  { key: "agent", label: "智能体", sub: ["工具调用", "RAG", "自动化", "多步任务"] },
  { key: "content", label: "内容创作", sub: ["AIGC", "角色扮演", "营销文案", "剧本创作"] },
  { key: "multimodal", label: "多模态", sub: ["图像生成", "图像编辑", "视觉理解", "视频生成"] },
  { key: "voice", label: "语音交互", sub: ["语音合成", "语音识别", "语音翻译"] },
  { key: "enterprise", label: "企业应用", sub: ["客服", "数据分析", "文档处理", "知识库"] },
];

const APP_TYPES = ["通用助手", "编程开发", "深度推理", "智能体", "内容创作", "多模态", "语音交互", "企业应用"] as const;

function getAppCategoryFromModelType(type: string): (typeof APP_TYPES)[number] {
  switch (type) {
    case "代码":
      return "编程开发";
    case "推理":
      return "深度推理";
    case "语音":
      return "语音交互";
    case "多模态":
    case "视觉":
      return "多模态";
    case "对话":
    default:
      return "通用助手";
  }
}

export default function Page() {
  const [query, setQuery] = useState("");
  const [appVersion, setAppVersion] = useState<AppVersion>("pro");
  const [vendors, setVendors] = useState<Set<DemoVendor>>(new Set(DEMO_VENDORS));
  const [types, setTypes] = useState<Set<string>>(new Set(PRO_TYPES));
  const [protocols, setProtocols] = useState<Set<string>>(new Set(PROTOCOLS));
  const [tags, setTags] = useState<Set<string>>(new Set(DEMO_TAGS));
  const [openSource, setOpenSource] = useState<boolean | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeTab, setActiveTab] = useState<FilterTab>("vendors");
  const [sortOpen, setSortOpen] = useState(false);
  const [appScenario, setAppScenario] = useState("all");
  const [appSubScenario, setAppSubScenario] = useState<string | null>(null);

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEMO_MODELS.filter((r) => {
      const matchesQuery = q.length === 0 || r.name.toLowerCase().includes(q) || r.vendor.toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q));
      const matchesVendor = vendors.has(r.vendor);
      const typeKey = appVersion === "pro" ? r.type : getAppCategoryFromModelType(r.type);
      const matchesType = types.size === 0 || types.has(typeKey);

      const vendorProtocol = r.vendor === "OpenAI" ? "openai" : r.vendor === "Anthropic" ? "anthropic" : "其他";
      const matchesProtocol = protocols.size === 0 || protocols.has(vendorProtocol);
      const matchesTags = tags.size === 0 || Array.from(tags).some((t) => r.tags.includes(t));
      const matchesOpenSource = openSource === null || r.openSource === openSource;
      return matchesQuery && matchesVendor && matchesType && matchesProtocol && matchesTags && matchesOpenSource;
    }).sort((a, b) => b[sortKey] - a[sortKey]);
  }, [query, vendors, types, protocols, tags, openSource, sortKey, appVersion]);

  const visibleRows = rows.slice(0, visibleCount);
  const hasMore = visibleCount < rows.length;

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (!hasMore) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
        setVisibleCount((c) => Math.min(c + PAGE_SIZE, rows.length));
      }
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [hasMore, rows.length]);

  const resetAndFilter = () => setVisibleCount(PAGE_SIZE);

  const toggleVendor = (v: DemoVendor) => { setVendors((prev) => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); resetAndFilter(); return n; }); };
  const selectAllVendors = () => { setVendors(new Set(DEMO_VENDORS)); resetAndFilter(); };
  const clearAllVendors = () => { setVendors(new Set()); resetAndFilter(); };

  const toggleType = (t: string) => { setTypes((prev) => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); resetAndFilter(); return n; }); };
  const selectAllTypes = () => { setTypes(new Set(appVersion === "pro" ? PRO_TYPES : APP_TYPES)); resetAndFilter(); };
  const clearAllTypes = () => { setTypes(new Set()); resetAndFilter(); };

  const toggleProtocol = (p: string) => { setProtocols((prev) => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); resetAndFilter(); return n; }); };
  const selectAllProtocols = () => { setProtocols(new Set(PROTOCOLS)); resetAndFilter(); };
  const clearAllProtocols = () => { setProtocols(new Set()); resetAndFilter(); };

  const toggleTag = (t: string) => { setTags((prev) => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); resetAndFilter(); return n; }); };
  const selectAllTags = () => { setTags(new Set(DEMO_TAGS)); resetAndFilter(); };
  const clearAllTags = () => { setTags(new Set()); resetAndFilter(); };

  const setSort = (k: SortKey) => { setSortKey(k); setSortOpen(false); resetAndFilter(); };

  const getTabCount = (tab: FilterTab): [number, number] => {
    switch (tab) {
      case "vendors": return [vendors.size, DEMO_VENDORS.length];
      case "types": return [types.size, appVersion === "pro" ? PRO_TYPES.length : APP_TYPES.length];
      case "protocols": return [protocols.size, PROTOCOLS.length];
      case "tags": return [tags.size, DEMO_TAGS.length];
      case "openSource": return [openSource === null ? 3 : 1, 3];
    }
  };

  const currentSortLabel = SORT_OPTIONS.find((s) => s.key === sortKey)?.label || "推理基准得分";

  // Active filter items for each tab
  const activeFilterItems = useMemo(() => {
    const items: string[] = [];
    if (appVersion === "pro") {
      PRO_TYPES.forEach((t) => { if (types.has(t)) items.push(t); });
    } else {
      APP_TYPES.forEach((t) => { if (types.has(t)) items.push(t); });
    }
    return items;
  }, [appVersion, types]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <DemoHeaderV4 searchQuery={query} onSearchChange={setQuery} />

      {/* Banner */}
      <section className="relative overflow-hidden bg-white border-b border-gray-100">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute -left-44 top-[-240px] h-[640px] w-[640px] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.10),rgba(59,130,246,0))]" />
        </div>
        <div className="relative w-full px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <h1 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight text-slate-900 leading-tight inline-block">
                大模型性能天梯图
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                扫一眼对比模型，做出更好的选择。
              </p>
            </div>
            <div className="hidden sm:flex flex-col gap-1.5 text-sm text-slate-500 ml-8 shrink-0 border-l border-gray-200 pl-6">
              <span>数据更新：2026-04-02</span>
              <span>覆盖模型：{DEMO_MODELS.length}</span>
              <span>评分维度：4</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter + Table */}
      <section className="w-full px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-xl bg-white ring-1 ring-slate-200 shadow-sm overflow-visible">
          {/* Row 1: Version Toggle + Filter Tabs + Sort Dropdown */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {/* Version Toggle */}
              <div className="flex rounded-xl overflow-hidden ring-2 ring-blue-600 shrink-0">
                <button
                  type="button"
                  onClick={() => { setAppVersion("pro"); setTypes(new Set(PRO_TYPES)); resetAndFilter(); }}
                  className={`px-6 py-2.5 text-base font-bold transition-all ${appVersion === "pro" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                >
                  专业版
                </button>
                <button
                  type="button"
                  onClick={() => { setAppVersion("app"); setTypes(new Set(APP_TYPES)); resetAndFilter(); }}
                  className={`px-6 py-2.5 text-base font-bold transition-all ${appVersion === "app" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                >
                  应用版
                </button>
              </div>

              <div className="h-8 w-px bg-gray-200 shrink-0" />

              {/* Filter Tabs */}
              <div className="flex items-center gap-1">
                {FILTER_TABS.map((tab) => {
                  const [count, total] = getTabCount(tab.key);
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-3 py-2 rounded-lg text-base font-medium transition-all ${
                        activeTab === tab.key
                          ? "bg-slate-800 text-white shadow-sm"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {tab.label}
                      <span className={`ml-1 text-[11px] ${activeTab === tab.key ? "text-slate-300" : "text-gray-400"}`}>
                        {count}/{total}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sort Dropdown */}
            <div ref={sortRef} className="relative shrink-0" style={{ zIndex: 60 }}>
              <select
                aria-label="排序方式"
                className="sr-only"
                value={sortKey}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-base font-medium text-gray-700 transition-all ring-1 ring-gray-200"
              >
                <span>{currentSortLabel}</span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-white ring-1 ring-gray-200 shadow-xl py-1" style={{ zIndex: 70 }}>
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSort(opt.key)}
                      className={`w-full text-left px-4 py-2.5 text-base transition-colors flex items-center justify-between ${
                        sortKey === opt.key
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {sortKey === opt.key && <Check className="h-4 w-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Filter List */}
          <div className="px-4 py-3">
            {activeTab === "vendors" && (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={selectAllVendors} className="px-3 py-2 rounded-lg text-base font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 ring-1 ring-blue-200 shrink-0">全选</button>
                <button type="button" onClick={clearAllVendors} className="px-3 py-2 rounded-lg text-base font-semibold bg-red-50 text-red-700 hover:bg-red-100 ring-1 ring-red-200 shrink-0">清空</button>
                <div className="w-px h-5 bg-gray-200 shrink-0" />
                {DEMO_VENDORS.map((v) => {
                  const color = getVendorColor(v);
                  const checked = vendors.has(v);
                  return (
                    <button key={v} type="button" onClick={() => toggleVendor(v)} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-base transition-all ${checked ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-500" : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-gray-200"}`}>
                      <span className={`h-2.5 w-2.5 rounded-full ring-1 ring-black/10 transition-all ${checked ? "scale-100" : "scale-75"}`} style={{ backgroundColor: checked ? "#fff" : color }} />
                      {v}
                      {checked && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === "types" && (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={selectAllTypes} className="px-3 py-2 rounded-lg text-base font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 ring-1 ring-blue-200 shrink-0">全选</button>
                <button type="button" onClick={clearAllTypes} className="px-3 py-2 rounded-lg text-base font-semibold bg-red-50 text-red-700 hover:bg-red-100 ring-1 ring-red-200 shrink-0">清空</button>
                <div className="w-px h-5 bg-gray-200 shrink-0" />
                {(appVersion === "pro" ? PRO_TYPES : APP_TYPES).map((t) => {
                  const isActive = types.has(t);
                  return (
                    <button key={t} type="button" onClick={() => toggleType(t)} className={`px-3 py-2 rounded-lg text-base transition-all ${isActive ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-500" : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-gray-200"}`}>{t}</button>
                  );
                })}
                {appVersion === "app" && appScenario !== "all" && (
                  <>
                    <div className="w-px h-5 bg-gray-200 shrink-0" />
                    <span className="text-base text-gray-600">场景:</span>
                    {APP_SCENARIOS.filter((sc) => sc.key === appScenario)[0]?.sub.map((sub) => {
                      const isActive = appSubScenario === sub;
                      return (
                        <button key={sub} type="button" onClick={() => setAppSubScenario(appSubScenario === sub ? null : sub)} className={`px-3 py-2 rounded-lg text-base transition-all ${isActive ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-500" : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-gray-200"}`}>{sub}</button>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {activeTab === "protocols" && (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={selectAllProtocols} className="px-3 py-2 rounded-lg text-base font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 ring-1 ring-blue-200 shrink-0">全选</button>
                <button type="button" onClick={clearAllProtocols} className="px-3 py-2 rounded-lg text-base font-semibold bg-red-50 text-red-700 hover:bg-red-100 ring-1 ring-red-200 shrink-0">清空</button>
                <div className="w-px h-5 bg-gray-200 shrink-0" />
                {PROTOCOLS.map((p) => (
                  <button key={p} type="button" onClick={() => toggleProtocol(p)} className={`px-3 py-2 rounded-lg text-base transition-all capitalize ${protocols.has(p) ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-500" : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-gray-200"}`}>{p}</button>
                ))}
              </div>
            )}

            {activeTab === "tags" && (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={selectAllTags} className="px-3 py-2 rounded-lg text-base font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 ring-1 ring-blue-200 shrink-0">全选</button>
                <button type="button" onClick={clearAllTags} className="px-3 py-2 rounded-lg text-base font-semibold bg-red-50 text-red-700 hover:bg-red-100 ring-1 ring-red-200 shrink-0">清空</button>
                <div className="w-px h-5 bg-gray-200 shrink-0" />
                {DEMO_TAGS.map((t) => (
                  <button key={t} type="button" onClick={() => toggleTag(t)} className={`px-3 py-2 rounded-lg text-base transition-all ${tags.has(t) ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-500" : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-gray-200"}`}>{t}</button>
                ))}
              </div>
            )}

            {activeTab === "openSource" && (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => { setOpenSource(null); resetAndFilter(); }} className="px-3 py-2 rounded-lg text-base font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 ring-1 ring-blue-200 shrink-0">全选</button>
                <button type="button" onClick={() => { setOpenSource(null); resetAndFilter(); }} className="px-3 py-2 rounded-lg text-base font-semibold bg-red-50 text-red-700 hover:bg-red-100 ring-1 ring-red-200 shrink-0">清空</button>
                <div className="w-px h-5 bg-gray-200 shrink-0" />
                {(["全部", "开源", "闭源"] as const).map((opt) => {
                  const val = opt === "全部" ? null : opt === "开源";
                  const active = openSource === val;
                  return (
                    <button key={opt} type="button" onClick={() => { setOpenSource(val); resetAndFilter(); }} className={`px-4 py-2 rounded-lg text-base transition-all ${active ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-500" : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-gray-200"}`}>{opt}</button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div ref={tableScrollRef} className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 480px)" }}>
          <LadderScoreTable
            models={visibleRows}
            vendors={Array.from(vendors)}
            hrefPrefix="/demo/demo4/models"
            variant="light"
            sortKey={sortKey}
          />

          {hasMore && (
            <div className="pb-6 flex justify-center">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-pulse" />
                已加载 {visibleRows.length}/{rows.length}，继续下滑加载更多
              </div>
            </div>
          )}
          {!hasMore && visibleRows.length > 0 && (
            <div className="pb-6 flex justify-center">
              <div className="text-xs text-slate-400">已显示全部 {visibleRows.length} 个模型</div>
            </div>
          )}
        </div>
      </section>

      {/* Right Dock */}
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

function DockButton({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <button type="button" className="flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-slate-500 transition-colors hover:bg-slate-50">
      {icon}
      <span>{label}</span>
    </button>
  );
}
