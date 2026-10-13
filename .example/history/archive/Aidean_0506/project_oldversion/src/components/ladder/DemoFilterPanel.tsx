"use client";

import { useState, useCallback } from "react";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import { DEMO_VENDORS, getVendorColor, DEMO_TAGS, type DemoVendor } from "@/lib/config/demoModels";

export type SortKey = "score" | "contextK" | "speed" | "price";

export const PRO_TYPES = ["对话", "推理", "多模态", "代码", "视觉", "语音"] as const;

export const APP_SCENARIOS = [
  { key: "general", label: "通用助手", sub: ["文案创作", "知识问答", "翻译", "摘要"] },
  { key: "coding", label: "编程开发", sub: ["Vibe Coding", "代码生成", "Debug", "API开发"] },
  { key: "reasoning", label: "深度推理", sub: ["数学推理", "逻辑分析", "科学计算", "长文本推理"] },
  { key: "agent", label: "智能体", sub: ["工具调用", "RAG", "自动化", "多步任务"] },
  { key: "content", label: "内容创作", sub: ["AIGC", "角色扮演", "营销文案", "剧本创作"] },
  { key: "multimodal", label: "多模态", sub: ["图像生成", "图像编辑", "视觉理解", "视频生成"] },
  { key: "voice", label: "语音交互", sub: ["语音合成", "语音识别", "语音翻译"] },
  { key: "enterprise", label: "企业应用", sub: ["客服", "数据分析", "文档处理", "知识库"] },
] as const;

export const PROTOCOLS = ["openai", "anthropic", "其他"] as const;

export interface FilterState {
  vendors: Set<DemoVendor>;
  types: Set<string>;
  protocols: Set<string>;
  tags: Set<string>;
  openSource: boolean | null;
  sortKey: SortKey;
  version: "pro" | "app";
  appScenario: string;
  appSubScenario: string | null;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "score", label: "推理基准得分" },
  { key: "contextK", label: "上下文长度" },
  { key: "speed", label: "响应速度" },
  { key: "price", label: "价格" },
];

interface DemoFilterPanelProps {
  onFilterChange: (filter: FilterState) => void;
  variant?: "sidebar" | "topbar";
  initialSort?: SortKey;
}

export function DemoFilterPanel({ onFilterChange, variant = "sidebar", initialSort = "score" }: DemoFilterPanelProps) {
  const [version, setVersion] = useState<"pro" | "app">("pro");
  const [vendors, setVendors] = useState<Set<DemoVendor>>(new Set(DEMO_VENDORS));
  const [types, setTypes] = useState<Set<string>>(new Set(PRO_TYPES));
  const [protocols, setProtocols] = useState<Set<string>>(new Set(PROTOCOLS));
  const [tags, setTags] = useState<Set<string>>(new Set(DEMO_TAGS));
  const [openSource, setOpenSource] = useState<boolean | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>(initialSort);
  const [appScenario, setAppScenario] = useState("all");
  const [appSubScenario, setAppSubScenario] = useState<string | null>(null);

  const [sections, setSections] = useState<Record<string, boolean>>({
    vendors: true,
    types: false,
    protocols: false,
    tags: false,
    openSource: false,
    sort: false,
  });

  const isSidebar = variant === "sidebar";

  const toggleSection = useCallback((key: string) => {
    setSections((s) => ({ ...s, [key]: !s[key] }));
  }, []);

  const notify = useCallback((state: FilterState) => {
    onFilterChange(state);
  }, [onFilterChange]);

  const buildState = useCallback((overrides: Partial<FilterState> = {}): FilterState => {
    return {
      vendors, types, protocols, tags, openSource, sortKey, version, appScenario, appSubScenario,
      ...overrides,
    };
  }, [vendors, types, protocols, tags, openSource, sortKey, version, appScenario, appSubScenario]);

  const setVersionAndNotify = useCallback((v: "pro" | "app") => {
    setVersion(v);
    notify(buildState({ version: v }));
  }, [buildState, notify]);

  const toggleVendor = useCallback((v: DemoVendor) => {
    setVendors((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v); else next.add(v);
      notify(buildState({ vendors: next }));
      return next;
    });
  }, [buildState, notify]);

  const selectAllVendors = useCallback(() => {
    const next = new Set(DEMO_VENDORS);
    setVendors(next);
    notify(buildState({ vendors: next }));
  }, [buildState, notify]);

  const clearAllVendors = useCallback(() => {
    const next = new Set<DemoVendor>();
    setVendors(next);
    notify(buildState({ vendors: next }));
  }, [buildState, notify]);

  const toggleType = useCallback((t: string) => {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      notify(buildState({ types: next }));
      return next;
    });
  }, [buildState, notify]);

  const selectAllTypes = useCallback(() => {
    const next = new Set(PRO_TYPES);
    setTypes(next);
    notify(buildState({ types: next }));
  }, [buildState, notify]);

  const clearAllTypes = useCallback(() => {
    const next = new Set<string>();
    setTypes(next);
    notify(buildState({ types: next }));
  }, [buildState, notify]);

  const toggleProtocol = useCallback((p: string) => {
    setProtocols((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      notify(buildState({ protocols: next }));
      return next;
    });
  }, [buildState, notify]);

  const selectAllProtocols = useCallback(() => {
    const next = new Set(PROTOCOLS);
    setProtocols(next);
    notify(buildState({ protocols: next }));
  }, [buildState, notify]);

  const clearAllProtocols = useCallback(() => {
    const next = new Set<string>();
    setProtocols(next);
    notify(buildState({ protocols: next }));
  }, [buildState, notify]);

  const toggleTag = useCallback((t: string) => {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      notify(buildState({ tags: next }));
      return next;
    });
  }, [buildState, notify]);

  const selectAllTags = useCallback(() => {
    const next = new Set(DEMO_TAGS);
    setTags(next);
    notify(buildState({ tags: next }));
  }, [buildState, notify]);

  const clearAllTags = useCallback(() => {
    const next = new Set<string>();
    setTags(next);
    notify(buildState({ tags: next }));
  }, [buildState, notify]);

  const setSortAndNotify = useCallback((k: SortKey) => {
    setSortKey(k);
    notify(buildState({ sortKey: k }));
  }, [buildState, notify]);

  const setOpenSourceAndNotify = useCallback((val: boolean | null) => {
    setOpenSource(val);
    notify(buildState({ openSource: val }));
  }, [buildState, notify]);

  const setAppScenarioAndNotify = useCallback((sc: string, sub: string | null) => {
    setAppScenario(sc);
    setAppSubScenario(sub);
    notify(buildState({ appScenario: sc, appSubScenario: sub }));
  }, [buildState, notify]);

  return (
    <div className={isSidebar ? "w-full" : ""}>
      {/* Version Toggle - BIG */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex rounded-xl overflow-hidden ring-1 ring-gray-200">
          <button
            type="button"
            onClick={() => setVersionAndNotify("pro")}
            className={`flex-1 py-3 text-sm font-bold transition-all ${
              version === "pro" ? "bg-blue-600 text-white shadow-inner" : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            专业版
          </button>
          <button
            type="button"
            onClick={() => setVersionAndNotify("app")}
            className={`flex-1 py-3 text-sm font-bold transition-all ${
              version === "app" ? "bg-blue-600 text-white shadow-inner" : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            应用版
          </button>
        </div>
      </div>

      {/* Sort - Collapsible, NO select all/clear */}
      <FilterSection
        title="排序规则"
        expanded={sections.sort}
        onToggle={() => toggleSection("sort")}
      >
        <div className="space-y-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSortAndNotify(opt.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${
                sortKey === opt.key
                  ? "bg-blue-600 text-white shadow-sm font-medium"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>{opt.label}</span>
              {sortKey === opt.key && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Vendors */}
      <FilterSection
        title={`模型商 (${vendors.size}/${DEMO_VENDORS.length})`}
        expanded={sections.vendors}
        onToggle={() => toggleSection("vendors")}
        highlighted={vendors.size > 0 && vendors.size < DEMO_VENDORS.length}
        onSelectAll={selectAllVendors}
        onClear={clearAllVendors}
      >
        <div className="space-y-0.5">
          {DEMO_VENDORS.map((v) => {
            const color = getVendorColor(v);
            const checked = vendors.has(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() => toggleVendor(v)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                  checked
                    ? "bg-blue-50 text-blue-900 ring-1 ring-blue-200 shadow-sm"
                    : "bg-white text-gray-300 hover:bg-gray-50 hover:text-gray-500"
                }`}
              >
                <span className={`h-3 w-3 rounded-full shrink-0 ring-1 ring-black/10 transition-all ${checked ? "scale-100" : "scale-75 opacity-40"}`} style={{ backgroundColor: checked ? color : "#ccc" }} />
                <span className="truncate font-medium">{v}</span>
                {checked && <Check className="h-3.5 w-3.5 ml-auto text-blue-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Types (Pro) */}
      {version === "pro" && (
        <FilterSection
          title={`类型 (${types.size}/${PRO_TYPES.length})`}
          expanded={sections.types}
          onToggle={() => toggleSection("types")}
          highlighted={types.size > 0 && types.size < PRO_TYPES.length}
          onSelectAll={selectAllTypes}
          onClear={clearAllTypes}
        >
          <div className="flex flex-wrap gap-1.5">
            {PRO_TYPES.map((t) => {
              const active = types.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  className={`px-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                    active
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 ring-1 ring-gray-200"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </FilterSection>
      )}

      {/* App Scenarios */}
      {version === "app" && (
        <FilterSection
          title="应用场景"
          expanded={sections.types}
          onToggle={() => toggleSection("types")}
          highlighted={appScenario !== "all"}
        >
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setAppScenarioAndNotify("all", null)}
              className={`w-full py-2.5 px-3 rounded-lg text-sm font-semibold transition-all text-left ${
                appScenario === "all" ? "bg-blue-600 text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              全部场景
            </button>
            {APP_SCENARIOS.map((sc) => (
              <div key={sc.key} className="rounded-lg overflow-hidden ring-1 ring-gray-100">
                <button
                  type="button"
                  onClick={() => setAppScenarioAndNotify(sc.key, null)}
                  className={`w-full py-2.5 px-3 text-sm font-semibold transition-all text-left ${
                    appScenario === sc.key && !appSubScenario ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {sc.label}
                </button>
                {appScenario === sc.key && (
                  <div className="bg-blue-50/50 px-3 py-2 flex flex-wrap gap-1.5">
                    {sc.sub.map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setAppScenarioAndNotify(sc.key, appSubScenario === sub ? null : sub)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                          appSubScenario === sub ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-blue-100 ring-1 ring-gray-200"
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Protocol */}
      <FilterSection
        title={`协议 (${protocols.size}/${PROTOCOLS.length})`}
        expanded={sections.protocols}
        onToggle={() => toggleSection("protocols")}
        highlighted={protocols.size > 0 && protocols.size < PROTOCOLS.length}
        onSelectAll={selectAllProtocols}
        onClear={clearAllProtocols}
      >
        <div className="flex gap-1.5 mb-2">
          <button type="button" onClick={selectAllProtocols} className="flex-1 py-1.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100">全选</button>
          <button type="button" onClick={clearAllProtocols} className="flex-1 py-1.5 rounded-md text-[11px] font-medium bg-gray-50 text-gray-500 hover:bg-gray-100">清空</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PROTOCOLS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => toggleProtocol(p)}
              className={`px-2 py-1.5 rounded-md text-[11px] font-medium transition-all capitalize ${
                protocols.has(p)
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 ring-1 ring-gray-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Open Source */}
      <FilterSection
        title="开源"
        expanded={sections.openSource}
        onToggle={() => toggleSection("openSource")}
        highlighted={openSource !== null}
        onSelectAll={() => { setOpenSourceAndNotify(null); }}
        onClear={() => { setOpenSourceAndNotify(null); }}
      >
        <div className="flex gap-2">
          {(["全部", "开源", "闭源"] as const).map((opt) => {
            const val = opt === "全部" ? null : opt === "开源";
            const active = openSource === val;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setOpenSourceAndNotify(val)}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                  active ? "bg-blue-600 text-white shadow-sm" : "bg-gray-50 text-gray-400 hover:bg-gray-100 ring-1 ring-gray-200"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Tags */}
      <FilterSection
        title={`标签 (${tags.size}/${DEMO_TAGS.length})`}
        expanded={sections.tags}
        onToggle={() => toggleSection("tags")}
        highlighted={tags.size > 0 && tags.size < DEMO_TAGS.length}
        onSelectAll={selectAllTags}
        onClear={clearAllTags}
      >
        <div className="flex gap-1.5 mb-2">
          <button type="button" onClick={selectAllTags} className="flex-1 py-1.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100">全选</button>
          <button type="button" onClick={clearAllTags} className="flex-1 py-1.5 rounded-md text-[11px] font-medium bg-gray-50 text-gray-500 hover:bg-gray-100">清空</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_TAGS.map((t) => {
            const active = tags.has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-50 text-gray-400 hover:bg-gray-100 ring-1 ring-gray-200"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </FilterSection>
    </div>
  );
}

function FilterSection({
  title,
  expanded,
  onToggle,
  highlighted,
  onSelectAll,
  onClear,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  highlighted?: boolean;
  onSelectAll?: () => void;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onToggle}
          className={`flex items-center gap-1 text-sm font-semibold transition-colors ${
            highlighted ? "text-blue-600" : "text-gray-700"
          }`}
        >
          <span>{title}</span>
          {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </button>
        {onSelectAll && onClear && (
          <div className="flex gap-1">
            <button type="button" onClick={onSelectAll} className="text-[10px] font-medium text-blue-500 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-50">全选</button>
            <button type="button" onClick={onClear} className="text-[10px] font-medium text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-50">清空</button>
          </div>
        )}
      </div>
      {expanded && <div className="mt-3">{children}</div>}
    </div>
  );
}
