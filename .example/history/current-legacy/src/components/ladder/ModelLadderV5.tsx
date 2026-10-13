"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BarChart3, Bookmark, Check, ChevronDown, ChevronRight, GitCompare, Headphones, Table2 } from "lucide-react";

import { LadderScoreTable } from "@/components/ladder/LadderScoreTable";
import { PRO_TYPES } from "@/components/ladder/DemoFilterPanel";
import { DEMO_MODELS, DEMO_PROTOCOLS, DEMO_TAGS, DEMO_VENDORS, getVendorColor, type DemoModel, type DemoVendor } from "@/lib/config/demoModels";
import { useSiteLang } from "@/lib/config/siteLang";
import { useSiteTheme, type SiteThemeId } from "@/lib/config/siteTheme";
import { useApi } from "@/hooks/useApi";

export type ModelLadderKind = "default" | "mobile" | "image" | "video" | "audio";

type SortKey = "score" | "contextK" | "speed" | "price";

type FilterTab = "vendors" | "types" | "protocols" | "tags" | "openSource";

type ViewMode = "table" | "chart";

type ZoomPct = 0 | 25 | 50 | 75 | 100 | 125 | 150 | 175 | 200;

type OpenSourceFilter = boolean | null | "none";

const KIND_META: Record<ModelLadderKind, { title: string; sub: string }> = {
  default: { title: "大模型性能天梯图", sub: "扫一眼对比模型，做出更好的选择。" },
  mobile: { title: "移动端模型天梯图", sub: "面向移动端/轻量部署场景的模型对比视图。" },
  image: { title: "图像模型天梯图", sub: "以视觉/多模态为主的模型对比视图。" },
  video: { title: "视频模型天梯图", sub: "以多模态能力为主的视频相关模型对比视图。" },
  audio: { title: "音频模型天梯图", sub: "以语音相关能力为主的模型对比视图。" },
};

const VENDOR_SERIES_META: Record<DemoVendor, { seriesName: string; companyName: string; intro: string }> = {
  OpenAI: { seriesName: "OpenAI", companyName: "OpenAI", intro: "GPT / o 系列，多模态与推理能力强，生态成熟。" },
  Anthropic: { seriesName: "Anthropic", companyName: "Anthropic", intro: "Claude 系列，长文本与推理表现突出，适合复杂协作。" },
  Google: { seriesName: "Gemini", companyName: "Google", intro: "Gemini 系列，长上下文与多模态能力强，工具链完善。" },
  xAI: { seriesName: "Grok", companyName: "xAI", intro: "Grok 系列，对话与实时信息结合，风格鲜明。" },
  字节跳动: { seriesName: "豆包", companyName: "字节跳动", intro: "豆包系列，成本与吞吐优化，适合大规模调用。" },
  百度: { seriesName: "文心", companyName: "百度", intro: "文心系列，中文任务稳健，面向知识与办公场景。" },
  智谱: { seriesName: "GLM", companyName: "智谱", intro: "GLM 系列，中文理解与推理均衡，覆盖开源与闭源。" },
  阿里: { seriesName: "千问", companyName: "阿里", intro: "通义千问系列，综合能力均衡，覆盖对话与推理。" },
  MiniMax: { seriesName: "MiniMax", companyName: "MiniMax", intro: "Abab 系列，偏长上下文与应用落地场景。" },
  深度求索: { seriesName: "DeepSeek", companyName: "深度求索", intro: "DeepSeek 系列，推理与代码能力强，性价比突出。" },
  月之暗面: { seriesName: "Kimi", companyName: "月之暗面", intro: "Kimi 系列，超长上下文对话，适合资料型任务。" },
  零一万物: { seriesName: "Yi", companyName: "零一万物", intro: "Yi 系列，推理与视觉能力均衡，中文表现优秀。" },
  商汤: { seriesName: "SenseChat", companyName: "商汤", intro: "SenseChat 系列，面向多模态与中文对话场景。" },
  科大讯飞: { seriesName: "星火", companyName: "科大讯飞", intro: "星火系列，中文对话与知识问答能力稳定。" },
  微软: { seriesName: "Microsoft", companyName: "微软", intro: "微软模型与服务生态，偏工程化与企业场景。" },
  Meta: { seriesName: "Llama", companyName: "Meta", intro: "Llama 系列，开源生态活跃，适合本地与私有化部署。" },
  Mistral: { seriesName: "Mistral", companyName: "Mistral", intro: "Mistral 系列，轻量高效的开源模型路线。" },
};

const SERIES_TIER_ORDER = ["OpenAI", "Anthropic", "Gemini", "千问", "GLM", "DeepSeek", "Kimi"];

const PAGE_SIZE = 100;
const MIN_SIDEBAR = 180;
const MAX_SIDEBAR = 400;
const DEFAULT_SIDEBAR = 240;

const FILTER_TAB_KEYS: FilterTab[] = ["vendors", "types", "protocols", "tags", "openSource"];
const SORT_KEYS: SortKey[] = ["score", "contextK", "speed", "price"];

// API返回的模型数据类型
interface LadderModel extends Omit<DemoModel, 'type' | 'protocol'> {
  type: string;  // API可返回更多类型：图像生成、视频、语音识别等
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
  vendorColor?: string;
  scores?: {
    official: number; actual: number; review: number; selfTest: number;
    reasoning: number; coding: number; math: number; multilingual: number;
    creativity: number; instruction: number; safety: number; efficiency: number;
    value: number; composite: number;
  } | null;
  priceInfo?: { input: number; output: number; cache: number | null; currency: string } | null;
}

// 后端 Ladder API 已按 kind 筛选 modelType，前端无需重复筛选
// 保留 pickModels 函数仅用于 DEMO_MODELS 降级场景

function isLightColor(color: string) {
  const c = (color || "").trim().toLowerCase();
  if (c === "white" || c === "#fff" || c === "#ffffff") return true;
  const hex = c.startsWith("#") ? c.slice(1) : c;
  if (!(hex.length === 3 || hex.length === 6)) return false;
  const full = hex.length === 3 ? hex.split("").map((x) => x + x).join("") : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.72;
}

function getAccentTextDark(themeId: SiteThemeId) {
  const map: Record<SiteThemeId, string> = {
    blue: "text-blue-400",
    indigo: "text-indigo-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
  };
  return map[themeId] ?? "text-blue-400";
}

function VendorHelpBadge({ dotColor, title, desc }: { dotColor: string; title: string; desc: string }) {
  const lightBg = isLightColor(dotColor);
  const textClass = lightBg ? "text-slate-900" : "text-white";
  const strokeColor = lightBg ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";

  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ left: rect.left + rect.width / 2, top: rect.bottom + 8 });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  return (
    <>
      <span
        ref={triggerRef}
        className="absolute inset-0 z-[9999] inline-flex"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <span
          role="button"
          tabIndex={0}
          aria-label="查看系列说明"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            e.stopPropagation();
          }}
          className={`absolute inset-0 inline-flex items-center justify-center rounded-full text-[9px] font-black leading-none ${textClass}`}
          style={{ WebkitTextStroke: `0.6px ${strokeColor}`, textShadow: "0 1px 1px rgba(0,0,0,0.35)" }}
        >
          ?
        </span>
      </span>
      {open && (
        <span
          className="pointer-events-none fixed hidden w-64 rounded-lg bg-slate-900 px-2.5 py-2 text-[11px] leading-snug text-white shadow-xl ring-1 ring-black/10"
          style={{ left: pos.left, top: pos.top, transform: "translateX(-50%)", zIndex: 10000, display: "block" }}
        >
          <span className="font-semibold">{title}</span>
          <span className="block mt-1 text-white/85">{desc}</span>
        </span>
      )}
    </>
  );
}

export function ModelLadderV5({ kind = "default", keyword }: { kind?: ModelLadderKind; keyword?: string }) {
  const { theme, themeId, resolvedMode } = useSiteTheme();
  const { lang } = useSiteLang();

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("kind", kind);
    if (keyword) params.set("keyword", keyword);
    return `/models/ladder?${params.toString()}`;
  }, [kind, keyword]);

  const { data: ladderData } = useApi<{ items: LadderModel[]; vendors: string[]; tags: string[]; total: number }>(
    apiUrl
  );
  const apiModels: LadderModel[] = (ladderData?.items?.length ?? 0) > 0
    ? ladderData!.items
    : DEMO_MODELS as LadderModel[];
  const apiVendors: string[] = (ladderData?.vendors?.length ?? 0) > 0
    ? ladderData!.vendors
    : [...DEMO_VENDORS];
  const apiTags = useMemo<string[]>(
    () => ((ladderData?.tags?.length ?? 0) > 0 ? ladderData!.tags : [...DEMO_TAGS]),
    [ladderData]
  );
  const vendorOptions = useMemo<DemoVendor[]>(() => {
    const normalized = apiVendors.filter((v): v is DemoVendor =>
      DEMO_VENDORS.includes(v as DemoVendor)
    );
    return normalized.length > 0 ? normalized : DEMO_VENDORS;
  }, [apiVendors]);
  const typeOptions = useMemo<string[]>(() => {
    const fromApi = Array.from(new Set(apiModels.map((item) => item.type).filter(Boolean)));
    return fromApi.length > 0 ? fromApi : [...PRO_TYPES];
  }, [apiModels]);
  const protocolOptions = useMemo<string[]>(() => {
    const fromApi = Array.from(new Set(apiModels.map((item) => item.protocol).filter(Boolean)));
    return fromApi.length > 0 ? fromApi : [...DEMO_PROTOCOLS];
  }, [apiModels]);
  const tagOptions = useMemo<string[]>(() => {
    return apiTags.length > 0 ? apiTags : [...DEMO_TAGS];
  }, [apiTags]);

  const [version, setVersion] = useState<"pro" | "app">("pro");

  const [vendors, setVendors] = useState<Set<DemoVendor>>(new Set(vendorOptions));
  const [types, setTypes] = useState<Set<string>>(new Set(typeOptions));
  const [protocols, setProtocols] = useState<Set<string>>(new Set(protocolOptions));
  const [tags, setTags] = useState<Set<string>>(new Set(tagOptions));
  const [openSource, setOpenSource] = useState<OpenSourceFilter>(null);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [zoomPct, setZoomPct] = useState<ZoomPct>(0);
  const [activeTab, setActiveTab] = useState<FilterTab>("vendors");
  const [sortOpen, setSortOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR);
  const [sidebarExpanded, setSidebarExpanded] = useState({
    sort: true,
    vendors: false,
    types: false,
    protocols: false,
    tags: false,
    openSource: false,
  });

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const refreshLockRef = useRef(false);
  const bottomIntentRef = useRef(0);
  const [refreshing, setRefreshing] = useState(false);

  const meta = KIND_META[kind] ?? KIND_META.default;

  const TEXT = {
    zh: {
      banner: {
        title: meta.title,
        sub: meta.sub,
        tableSettings: "表格设置",
        zoom: "表格缩放度",
        table: "表格",
        chart: "柱状图",
        dataUpdate: "数据更新：每日",
        coverage: (n: number) => `覆盖模型：${n}`,
        dims: "评分维度：4",
        correction: "纠错",
        correctionEmail: "164093410@qq.com",
      },
      version: { pro: "专业版", app: "应用版" },
      tabs: { vendors: "模型商", types: "类型", protocols: "协议", tags: "标签", openSource: "开源" } as Record<FilterTab, string>,
      sort: { score: "推理基准得分", contextK: "上下文长度", speed: "响应速度", price: "价格" } as Record<SortKey, string>,
      common: { selectAll: "全选", clear: "清空", sortRule: "排序规则", open: "开源", closed: "闭源" },
    },
    en: {
      banner: {
        title: "Large Model Ladder",
        sub: "Scan and compare models to make better choices.",
        tableSettings: "Table",
        zoom: "Density",
        table: "Table",
        chart: "Chart",
        dataUpdate: "Updates: daily",
        coverage: (n: number) => `Models: ${n}`,
        dims: "Dimensions: 4",
        correction: "Corrections",
        correctionEmail: "164093410@qq.com",
      },
      version: { pro: "Pro", app: "Apps" },
      tabs: { vendors: "Vendors", types: "Type", protocols: "Protocol", tags: "Tags", openSource: "Open" } as Record<FilterTab, string>,
      sort: { score: "Reasoning Score", contextK: "Context", speed: "Speed", price: "Price" } as Record<SortKey, string>,
      common: { selectAll: "All", clear: "Clear", sortRule: "Sorting", open: "Open", closed: "Closed" },
    },
    ja: {
      banner: {
        title: meta.title,
        sub: "一目で比較して、より良い選択を。",
        tableSettings: "テーブル",
        zoom: "密度",
        table: "テーブル",
        chart: "チャート",
        dataUpdate: "更新：毎日",
        coverage: (n: number) => `モデル数：${n}`,
        dims: "指標：4",
        correction: "誤り報告",
        correctionEmail: "164093410@qq.com",
      },
      version: { pro: "プロ版", app: "アプリ" },
      tabs: { vendors: "ベンダー", types: "タイプ", protocols: "プロトコル", tags: "タグ", openSource: "OSS" } as Record<FilterTab, string>,
      sort: { score: "推論スコア", contextK: "コンテキスト", speed: "速度", price: "価格" } as Record<SortKey, string>,
      common: { selectAll: "全て", clear: "クリア", sortRule: "並び替え", open: "OSS", closed: "クローズド" },
    },
  } as const;

  const t = (TEXT as any)[lang] ?? TEXT.zh;

  const accentText = theme.primaryText;
  const classPrimaryPill = `${theme.primaryLight} ${theme.primaryText} ${theme.accentHover} ring-1 ${theme.selectRing}`;
  const classPrimarySolid = `${theme.buttonBg} ${theme.buttonText} ${theme.buttonHover} shadow-sm ring-1 ${theme.selectRing}`;

  const getVendorSeriesName = useCallback((v: DemoVendor) => VENDOR_SERIES_META[v]?.seriesName ?? v, []);
  const getVendorIntro = useCallback((v: DemoVendor) => {
    const m = VENDOR_SERIES_META[v];
    if (!m) return { title: String(v), desc: String(v) };
    return { title: `${m.seriesName}（${m.companyName}）`, desc: m.intro };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setSidebarWidth(Math.max(MIN_SIDEBAR, Math.min(MAX_SIDEBAR, x)));
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const baseModels = apiModels;

  const rows = useMemo(() => {
    return baseModels
      .filter((r) => {
        const matchesVendor = vendors.has(r.vendor);
        const matchesType = types.size === 0 || types.has(r.type);
        const matchesProtocol = protocols.size === 0 || protocols.has(r.protocol);
        const matchesTags = tags.size === 0 || Array.from(tags).some((tg) => r.tags.includes(tg));
        const matchesOpenSource = openSource === "none" ? false : openSource === null || r.openSource === openSource;
        return matchesVendor && matchesType && matchesProtocol && matchesTags && matchesOpenSource;
      })
      .sort((a, b) => (b as any)[sortKey] - (a as any)[sortKey]);
  }, [baseModels, vendors, types, protocols, tags, openSource, sortKey]);

  const visibleRows = rows.slice(0, visibleCount);
  const hasMore = visibleCount < rows.length;

  const resetAndFilter = useCallback(() => {
    setVisibleCount(PAGE_SIZE);
    bottomIntentRef.current = 0;
  }, []);

  const toggleVendor = useCallback(
    (v: DemoVendor) => {
      setVendors((prev) => {
        const n = new Set(prev);
        n.has(v) ? n.delete(v) : n.add(v);
        return n;
      });
      resetAndFilter();
    },
    [resetAndFilter]
  );

  const selectAllVendors = useCallback(() => {
    setVendors(new Set(vendorOptions));
    resetAndFilter();
  }, [vendorOptions, resetAndFilter]);

  const clearAllVendors = useCallback(() => {
    setVendors(new Set());
    resetAndFilter();
  }, [resetAndFilter]);

  const toggleType = useCallback(
    (tp: string) => {
      setTypes((prev) => {
        const n = new Set(prev);
        n.has(tp) ? n.delete(tp) : n.add(tp);
        return n;
      });
      resetAndFilter();
    },
    [resetAndFilter]
  );

  const selectAllTypes = useCallback(() => {
    setTypes(new Set(typeOptions));
    resetAndFilter();
  }, [typeOptions, resetAndFilter]);

  const clearAllTypes = useCallback(() => {
    setTypes(new Set());
    resetAndFilter();
  }, [resetAndFilter]);

  const toggleProtocol = useCallback(
    (p: string) => {
      setProtocols((prev) => {
        const n = new Set(prev);
        n.has(p) ? n.delete(p) : n.add(p);
        return n;
      });
      resetAndFilter();
    },
    [resetAndFilter]
  );

  const selectAllProtocols = useCallback(() => {
    setProtocols(new Set(protocolOptions));
    resetAndFilter();
  }, [protocolOptions, resetAndFilter]);

  const clearAllProtocols = useCallback(() => {
    setProtocols(new Set());
    resetAndFilter();
  }, [resetAndFilter]);

  const toggleTag = useCallback(
    (tg: string) => {
      setTags((prev) => {
        const n = new Set(prev);
        n.has(tg) ? n.delete(tg) : n.add(tg);
        return n;
      });
      resetAndFilter();
    },
    [resetAndFilter]
  );

  const selectAllTags = useCallback(() => {
    setTags(new Set(tagOptions));
    resetAndFilter();
  }, [tagOptions, resetAndFilter]);

  const clearAllTags = useCallback(() => {
    setTags(new Set());
    resetAndFilter();
  }, [resetAndFilter]);

  const setSort = useCallback(
    (k: SortKey) => {
      setSortKey(k);
      setSortOpen(false);
      resetAndFilter();
    },
    [resetAndFilter]
  );

  const orderedVendors = useMemo(() => {
    const tierIndex = (v: DemoVendor) => {
      const s = getVendorSeriesName(v);
      const idx = SERIES_TIER_ORDER.indexOf(s);
      return idx === -1 ? 999 : idx;
    };
    return [...vendorOptions].sort((a, b) => {
      const da = tierIndex(a);
      const db = tierIndex(b);
      if (da !== db) return da - db;
      return getVendorSeriesName(a).localeCompare(getVendorSeriesName(b), "zh");
    });
  }, [vendorOptions, getVendorSeriesName]);

  const visibleVendors = useMemo(() => orderedVendors.filter((v) => vendors.has(v)), [orderedVendors, vendors]);

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const scrollable = el.scrollHeight - el.clientHeight > 80;
      if (!scrollable) return;

      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 200;
      if (!atBottom) {
        bottomIntentRef.current = 0;
        return;
      }

      if (hasMore) {
        bottomIntentRef.current = 0;
        setVisibleCount((c) => Math.min(c + PAGE_SIZE, rows.length));
        return;
      }

      if (rows.length <= PAGE_SIZE) return;
      if (visibleCount < rows.length) return;
      if (visibleCount <= PAGE_SIZE) return;

      if (bottomIntentRef.current === 0) {
        bottomIntentRef.current = Date.now();
        return;
      }

      if (Date.now() - bottomIntentRef.current < 450) return;
      if (refreshLockRef.current) return;
      refreshLockRef.current = true;
      setRefreshing(true);
      bottomIntentRef.current = 0;

      setTimeout(() => {
        setVisibleCount(PAGE_SIZE);
        if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
        setRefreshing(false);
        refreshLockRef.current = false;
      }, 280);
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [hasMore, rows.length, visibleCount]);

  const toggleSidebarSection = useCallback((key: keyof typeof sidebarExpanded) => {
    setSidebarExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const getTabCount = useCallback(
    (tab: FilterTab): [number, number] => {
      switch (tab) {
        case "vendors":
          return [vendors.size, orderedVendors.length];
        case "types":
          return [types.size, typeOptions.length];
        case "protocols":
          return [protocols.size, protocolOptions.length];
        case "tags":
          return [tags.size, tagOptions.length];
        case "openSource": {
          const selected = openSource === null ? 2 : openSource === "none" ? 0 : 1;
          return [selected, 2];
        }
      }
    },
    [vendors.size, orderedVendors.length, types.size, typeOptions.length, protocols.size, protocolOptions.length, tags.size, tagOptions.length, openSource]
  );

  const currentSortLabel = t.sort[sortKey] || t.sort.score;
  const [openSourceSelected, openSourceTotal] = getTabCount("openSource");

  const tableContent = (
    <div ref={tableScrollRef} className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
      <div className="p-4">
        <LadderScoreTable
          models={visibleRows as any[]}
          vendors={visibleVendors}
          hrefPrefix="/models"
          getVendorLabel={getVendorSeriesName}
          getVendorHelp={getVendorIntro}
          zoomPct={zoomPct}
          variant="light"
          sortKey={sortKey}
          accentTextClassName={theme.primaryText}
        />

        {refreshing && (
          <div className="pb-6 flex justify-center">
            <div className="text-xs text-slate-400">刷新中...</div>
          </div>
        )}

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
    </div>
  );

  const chartRows = useMemo(() => rows.slice(0, 24), [rows]);
  const chartMaxScore = useMemo(
    () => chartRows.reduce((max, item) => Math.max(max, Number(item.score || 0)), 0) || 1,
    [chartRows]
  );

  const chartContent = (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">模型排行榜柱状图（Top {chartRows.length}）</h2>
        <span className="text-xs text-slate-500">点击模型名称可进入详情页</span>
      </div>
      {chartRows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          当前筛选条件下暂无模型数据
        </div>
      ) : (
        <div className="space-y-2">
          {chartRows.map((model) => {
            const widthPct = Math.max(6, (Number(model.score || 0) / chartMaxScore) * 100);
            return (
              <div key={model.id} className="grid grid-cols-[minmax(0,220px)_1fr_auto] items-center gap-3 text-xs">
                <Link
                  href={`/models/${model.slug || model.modelCode || model.id}`}
                  className="truncate font-medium text-slate-700 hover:text-blue-600 hover:underline"
                  aria-label={`查看模型详情：${model.name}`}
                >
                  {model.name}
                </Link>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${theme.buttonBg}`} style={{ width: `${widthPct}%` }} />
                </div>
                <span className="w-10 text-right font-semibold text-slate-800">{Number(model.score || 0).toFixed(1)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const filterPanelContent = (
    <div className="px-4 py-3">
      {activeTab === "vendors" && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={selectAllVendors} className={`px-3 py-2 rounded-lg text-sm font-semibold shrink-0 ${classPrimaryPill}`}>{t.common.selectAll}</button>
          <button type="button" onClick={clearAllVendors} className="px-3 py-2 rounded-lg text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200 shrink-0">{t.common.clear}</button>
          <div className="w-px h-5 bg-gray-200 shrink-0" />
          {orderedVendors.map((v) => {
            const color = getVendorColor(v);
            const checked = vendors.has(v);
            const intro = getVendorIntro(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() => toggleVendor(v)}
                className={`relative inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                  checked
                    ? classPrimarySolid
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-gray-200"
                }`}
              >
                <span className="relative inline-flex shrink-0">
                  <span className={`h-2.5 w-2.5 rounded-full ring-1 ring-black/10 transition-all ${checked ? "scale-100" : "scale-75"}`} style={{ backgroundColor: checked ? "#fff" : color }} />
                  <VendorHelpBadge dotColor={checked ? "#fff" : color} title={intro.title} desc={intro.desc} />
                </span>
                {getVendorSeriesName(v)}
              </button>
            );
          })}
        </div>
      )}

      {activeTab === "types" && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={selectAllTypes} className={`px-3 py-2 rounded-lg text-sm font-semibold shrink-0 ${classPrimaryPill}`}>{t.common.selectAll}</button>
          <button type="button" onClick={clearAllTypes} className="px-3 py-2 rounded-lg text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200 shrink-0">{t.common.clear}</button>
          <div className="w-px h-5 bg-gray-200 shrink-0" />
          {typeOptions.map((tp) => (
            <button
              key={tp}
              type="button"
              onClick={() => toggleType(tp)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                types.has(tp)
                  ? classPrimarySolid
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-gray-200"
              }`}
            >
              {tp}
            </button>
          ))}
        </div>
      )}

      {activeTab === "protocols" && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={selectAllProtocols} className={`px-3 py-2 rounded-lg text-sm font-semibold shrink-0 ${classPrimaryPill}`}>{t.common.selectAll}</button>
          <button type="button" onClick={clearAllProtocols} className="px-3 py-2 rounded-lg text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200 shrink-0">{t.common.clear}</button>
          <div className="w-px h-5 bg-gray-200 shrink-0" />
          {protocolOptions.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => toggleProtocol(p)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                protocols.has(p)
                  ? classPrimarySolid
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-gray-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {activeTab === "tags" && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={selectAllTags} className={`px-3 py-2 rounded-lg text-sm font-semibold shrink-0 ${classPrimaryPill}`}>{t.common.selectAll}</button>
          <button type="button" onClick={clearAllTags} className="px-3 py-2 rounded-lg text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200 shrink-0">{t.common.clear}</button>
          <div className="w-px h-5 bg-gray-200 shrink-0" />
          {tagOptions.map((tg) => (
            <button
              key={tg}
              type="button"
              onClick={() => toggleTag(tg)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                tags.has(tg)
                  ? classPrimarySolid
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-gray-200"
              }`}
            >
              {tg}
            </button>
          ))}
        </div>
      )}

      {activeTab === "openSource" && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { setOpenSource(null); resetAndFilter(); }} className={`px-3 py-2 rounded-lg text-sm font-semibold shrink-0 ${classPrimaryPill}`}>{t.common.selectAll}</button>
          <button type="button" onClick={() => { setOpenSource("none"); resetAndFilter(); }} className="px-3 py-2 rounded-lg text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200 shrink-0">{t.common.clear}</button>
          <div className="w-px h-5 bg-gray-200 shrink-0" />
          {(["open", "closed"] as const).map((opt) => {
            const val = opt === "open";
            const active = openSource === val;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setOpenSource(val);
                  resetAndFilter();
                }}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  active
                    ? classPrimarySolid
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-gray-200"
                }`}
              >
                {opt === "open" ? t.common.open : t.common.closed}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const sidebarFilterContent = (
    <div className="w-full">
      <div className="px-4 pt-4 pb-3">
        <div className={`flex rounded-xl overflow-hidden ring-1 ${theme.primaryRing}`}>
          <button
            type="button"
            onClick={() => setVersion("pro")}
            className={`flex-1 py-3 text-sm font-bold ${
              version === "pro"
                ? `${theme.buttonBg} ${theme.buttonText} shadow-inner`
                : `bg-white text-gray-500 ${theme.accentHover}`
            }`}
          >
            {t.version.pro}
          </button>
          <button
            type="button"
            onClick={() => setVersion("app")}
            className={`flex-1 py-3 text-sm font-bold ${
              version === "app"
                ? `${theme.buttonBg} ${theme.buttonText} shadow-inner`
                : `bg-white text-gray-500 ${theme.accentHover}`
            }`}
          >
            {t.version.app}
          </button>
        </div>
      </div>

      <FilterSection
        title={t.common.sortRule}
        expanded={sidebarExpanded.sort}
        onToggle={() => toggleSidebarSection("sort")}
        highlighted={sidebarExpanded.sort}
        highlightedClassName={theme.primaryText}
      >
        <div className="space-y-1">
          {SORT_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSort(k)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${
                sortKey === k
                  ? classPrimarySolid + " font-medium"
                  : `bg-white text-gray-600 ${theme.accentHover} ring-1 ${theme.primaryRing}`
              }`}
            >
              <span>{t.sort[k]}</span>
              {sortKey === k && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title={`${t.tabs.vendors} (${vendors.size}/${orderedVendors.length})`}
        expanded={sidebarExpanded.vendors}
        onToggle={() => toggleSidebarSection("vendors")}
        onSelectAll={selectAllVendors}
        onClear={clearAllVendors}
        selectAllLabel={t.common.selectAll}
        clearLabel={t.common.clear}
        highlighted={vendors.size !== orderedVendors.length}
        highlightedClassName={theme.primaryText}
      >
        <div className="space-y-0.5">
          {orderedVendors.map((v) => {
            const color = getVendorColor(v);
            const checked = vendors.has(v);
            const intro = getVendorIntro(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() => toggleVendor(v)}
                className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                  checked
                    ? `${theme.primaryLight} ${theme.primaryText} ring-1 ${theme.selectRing} shadow-sm`
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="relative inline-flex shrink-0">
                  <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: checked ? "#fff" : color }} />
                  <VendorHelpBadge dotColor={checked ? "#fff" : color} title={intro.title} desc={intro.desc} />
                </span>
                <span className="truncate">{getVendorSeriesName(v)}</span>
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection
        title={`${t.tabs.types} (${types.size}/${typeOptions.length})`}
        expanded={sidebarExpanded.types}
        onToggle={() => toggleSidebarSection("types")}
        onSelectAll={selectAllTypes}
        onClear={clearAllTypes}
        selectAllLabel={t.common.selectAll}
        clearLabel={t.common.clear}
        highlighted={types.size !== typeOptions.length}
        highlightedClassName={theme.primaryText}
      >
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((tp) => {
            const active = types.has(tp);
            return (
              <button
                key={tp}
                type="button"
                onClick={() => toggleType(tp)}
                className={`px-3 py-2 rounded-lg text-sm transition-all ${
                  active
                    ? classPrimarySolid
                    : "bg-white text-gray-700 hover:bg-gray-50 ring-1 ring-slate-200"
                }`}
              >
                {tp}
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection
        title={`${t.tabs.protocols} (${protocols.size}/${protocolOptions.length})`}
        expanded={sidebarExpanded.protocols}
        onToggle={() => toggleSidebarSection("protocols")}
        onSelectAll={selectAllProtocols}
        onClear={clearAllProtocols}
        selectAllLabel={t.common.selectAll}
        clearLabel={t.common.clear}
        highlighted={protocols.size !== protocolOptions.length}
        highlightedClassName={theme.primaryText}
      >
        <div className="flex flex-wrap gap-2">
          {protocolOptions.map((p) => {
            const active = protocols.has(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => toggleProtocol(p)}
                className={`px-3 py-2 rounded-lg text-sm transition-all ${
                  active
                    ? classPrimarySolid
                    : "bg-white text-gray-700 hover:bg-gray-50 ring-1 ring-slate-200"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection
        title={`${t.tabs.tags} (${tags.size}/${tagOptions.length})`}
        expanded={sidebarExpanded.tags}
        onToggle={() => toggleSidebarSection("tags")}
        onSelectAll={selectAllTags}
        onClear={clearAllTags}
        selectAllLabel={t.common.selectAll}
        clearLabel={t.common.clear}
        highlighted={tags.size !== tagOptions.length}
        highlightedClassName={theme.primaryText}
      >
        <div className="flex flex-wrap gap-2">
          {tagOptions.map((tg) => {
            const active = tags.has(tg);
            return (
              <button
                key={tg}
                type="button"
                onClick={() => toggleTag(tg)}
                className={`px-3 py-2 rounded-lg text-sm transition-all ${
                  active
                    ? classPrimarySolid
                    : "bg-white text-gray-700 hover:bg-gray-50 ring-1 ring-slate-200"
                }`}
              >
                {tg}
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection
        title={`${t.tabs.openSource} (${openSourceSelected}/${openSourceTotal})`}
        expanded={sidebarExpanded.openSource}
        onToggle={() => toggleSidebarSection("openSource")}
        highlighted={openSource !== null}
        highlightedClassName={theme.primaryText}
        onSelectAll={() => {
          setOpenSource(null);
          resetAndFilter();
        }}
        onClear={() => {
          setOpenSource("none");
          resetAndFilter();
        }}
        selectAllLabel={t.common.selectAll}
        clearLabel={t.common.clear}
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setOpenSource(true);
              resetAndFilter();
            }}
            className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all ${
              openSource === true
                ? classPrimarySolid
                : "bg-white text-gray-700 hover:bg-gray-50 ring-1 ring-slate-200"
            }`}
          >
            {t.common.open}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpenSource(false);
              resetAndFilter();
            }}
            className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all ${
              openSource === false
                ? classPrimarySolid
                : "bg-white text-gray-700 hover:bg-gray-50 ring-1 ring-slate-200"
            }`}
          >
            {t.common.closed}
          </button>
        </div>
        <div className="mt-2">
          <button
            type="button"
            onClick={() => {
              setOpenSource(null);
              resetAndFilter();
            }}
            className={`w-full px-3 py-2 rounded-lg text-sm transition-all ${
              openSource === null
                ? classPrimarySolid
                : "bg-white text-gray-700 hover:bg-gray-50 ring-1 ring-slate-200"
            }`}
          >
            {t.common.selectAll}
          </button>
        </div>
      </FilterSection>
    </div>
  );

  return (
    <div className="relative overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-pink-500/10 blur-3xl" />
        <div className="absolute top-20 right-0 h-[360px] w-[360px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.16) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>
      <section className="relative w-full">
        <div className="mx-auto max-w-[1920px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid items-center gap-5 lg:grid-cols-[1fr_auto_1fr]">
            <div className="hidden lg:block" />
            <div className="text-center">
              <h1 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-black tracking-tight leading-tight text-white">{t.banner.title}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">{t.banner.sub}</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 lg:-translate-y-4 lg:justify-end">
              <div className="flex flex-col justify-center gap-2 rounded-xl px-3 py-2 ring-1 bg-slate-900/80 ring-white/10 shadow-lg shadow-black/20 backdrop-blur">
                <div className="text-[11px] font-semibold text-slate-200">{t.banner.tableSettings}</div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">{t.banner.zoom}</span>
                    <div className="relative">
                      <select
                        className={`h-8 rounded-lg border pl-2 pr-7 text-[11px] focus:outline-none focus:ring-2 ${theme.primaryRing} border-white/10 bg-slate-950/70 text-slate-200`}
                        value={zoomPct}
                        onChange={(e) => setZoomPct(Number(e.target.value) as ZoomPct)}
                        aria-label="表格缩放度"
                      >
                        <option value={0}>0%</option>
                        <option value={25}>25%</option>
                        <option value={50}>50%</option>
                        <option value={75}>75%</option>
                        <option value={100}>100%</option>
                        <option value={125}>125%</option>
                        <option value={150}>150%</option>
                        <option value={175}>175%</option>
                        <option value={200}>200%</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>

                  <div className="flex items-center gap-1 rounded-lg border p-0.5 border-white/10 bg-slate-950/70">
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                        viewMode === "table"
                          ? `bg-white ${theme.primaryText} shadow-sm`
                          : "text-slate-400 hover:text-white"
                      }`}
                      aria-label="切换表格视图"
                    >
                      <Table2 className="h-3.5 w-3.5" />
                      {t.banner.table}
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("chart")}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                        viewMode === "chart"
                          ? `bg-white ${theme.primaryText} shadow-sm`
                          : "text-slate-400 hover:text-white"
                      }`}
                      aria-label="切换柱状图视图"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      {t.banner.chart}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center gap-1.5 rounded-xl px-3 py-2 text-sm shrink-0 ring-1 bg-slate-900/80 text-slate-400 ring-white/10 shadow-lg shadow-black/20 backdrop-blur">
                <span>{t.banner.dataUpdate}</span>
                <span>{t.banner.coverage(rows.length)}</span>
                <span>{t.banner.dims}</span>
                <span>
                  {t.banner.correction}: {t.banner.correctionEmail}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative w-full">
        <div className="mx-auto max-w-[1920px] px-4 pb-16 sm:px-6 lg:px-8">
          {viewMode === "table" ? (
            <div
              ref={containerRef}
              className="flex rounded-xl overflow-hidden ring-1 shadow-sm ring-slate-200 bg-white"
              style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}
            >
              <aside
                className={`hidden lg:block shrink-0 border-r bg-white ${theme.headerBorder}`}
                style={{ width: sidebarWidth, minWidth: sidebarWidth }}
              >
                <div className="h-full overflow-y-auto bg-white">{sidebarFilterContent}</div>
              </aside>

              <div
                className={`hidden lg:block w-1.5 shrink-0 cursor-col-resize transition-colors relative ${theme.accent} ${theme.accentHover}`}
                onMouseDown={handleMouseDown}
              >
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </div>

              <div className="flex-1 min-w-0 bg-white">{tableContent}</div>
            </div>
          ) : (
            <div>
              <div className="mb-6 rounded-xl ring-1 shadow-sm overflow-visible bg-white ring-slate-200">
                <div className={`flex flex-col gap-3 px-4 py-3 border-b ${theme.headerBorder}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className={`flex rounded-xl overflow-hidden ring-2 ${theme.selectRing} shrink-0`}>
                      <button
                        type="button"
                        onClick={() => setVersion("pro")}
                        className={`px-6 py-2.5 text-sm font-bold ${version === "pro" ? `${theme.buttonBg} ${theme.buttonText}` : `bg-white text-gray-500 ${theme.accentHover}`}`}
                      >
                        {t.version.pro}
                      </button>
                      <button
                        type="button"
                        onClick={() => setVersion("app")}
                        className={`px-6 py-2.5 text-sm font-bold ${version === "app" ? `${theme.buttonBg} ${theme.buttonText}` : `bg-white text-gray-500 ${theme.accentHover}`}`}
                      >
                        {t.version.app}
                      </button>
                    </div>

                    <div className="flex items-center gap-2" ref={sortRef}>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setSortOpen((v) => !v)}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          aria-label="排序方式"
                        >
                          <span className="text-slate-500">{t.common.sortRule}</span>
                          <span className="text-slate-900">{currentSortLabel}</span>
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        </button>
                        {sortOpen && (
                          <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-lg py-1 z-50 bg-white border-slate-100">
                            {SORT_KEYS.map((k) => (
                              <button
                                key={k}
                                type="button"
                                onClick={() => setSort(k)}
                                className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between ${
                                  sortKey === k
                                    ? `${theme.primaryLight} ${theme.primaryText} font-medium`
                                    : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <span>{t.sort[k]}</span>
                                {sortKey === k && <Check className="h-4 w-4" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    {FILTER_TAB_KEYS.map((tabKey) => {
                      const [count, total] = getTabCount(tabKey);
                      return (
                        <button
                          key={tabKey}
                          type="button"
                          onClick={() => setActiveTab(tabKey)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === tabKey
                              ? classPrimarySolid
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span>{t.tabs[tabKey]}</span>
                          <span className={`ml-1 text-[11px] ${activeTab === tabKey ? "text-white/90" : "text-slate-400"}`}>({count}/{total})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {filterPanelContent}
              </div>

              <div className="rounded-xl ring-1 shadow-sm overflow-hidden bg-white ring-slate-200">{chartContent}</div>
            </div>
          )}

          <div className="fixed bottom-6 right-6 z-50">
            <div className="w-[72px] overflow-hidden rounded-2xl ring-1 shadow-lg bg-white ring-slate-200">
              <DockButton href="/user/favorites" label="收藏" icon={<Bookmark className="h-4 w-4" />} />
              <DockButton href="/compare" label="对比" icon={<GitCompare className="h-4 w-4" />} />
              <DockButton href="/products/consulting" label="客服" icon={<Headphones className="h-4 w-4" />} />
            </div>
          </div>
        </div>
      </section>

      <div className="sr-only">{accentText}</div>
    </div>
  );
}

function FilterSection({
  title,
  expanded,
  onToggle,
  highlighted,
  highlightedClassName,
  onSelectAll,
  onClear,
  selectAllLabel,
  clearLabel,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  highlighted?: boolean;
  highlightedClassName?: string;
  onSelectAll?: () => void;
  onClear?: () => void;
  children: React.ReactNode;
  selectAllLabel?: string;
  clearLabel?: string;
}) {
  return (
    <div className="border-b border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onToggle}
          className={`flex items-center gap-1 text-sm font-semibold transition-colors ${highlighted ? highlightedClassName ?? "text-slate-700" : "text-gray-700"}`}
        >
          <span>{title}</span>
          {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </button>
        {onSelectAll && onClear && (
          <div className="flex gap-1">
            <button type="button" onClick={onSelectAll} className="text-[10px] font-medium text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-50">{selectAllLabel ?? "全选"}</button>
            <button type="button" onClick={onClear} className="text-[10px] font-medium text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-50">{clearLabel ?? "清空"}</button>
          </div>
        )}
      </div>
      {expanded && <div className="mt-3">{children}</div>}
    </div>
  );
}

function DockButton({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-slate-500 transition-colors hover:bg-slate-50"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
