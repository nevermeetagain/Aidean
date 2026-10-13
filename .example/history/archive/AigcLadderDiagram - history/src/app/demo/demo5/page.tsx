"use client";

import Link from "next/link";
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Bookmark,
  GitCompare,
  Headphones,
  ChevronDown,
  ChevronRight,
  Check,
  LayoutGrid,
  List,
  QrCode,
  Chrome,
  MessageCircle,
  Eye,
  EyeOff,
  Github,
  Twitter,
  Youtube,
  Mail,
} from "lucide-react";

import { DemoHeaderV5, type ViewMode, type Demo5Lang } from "@/components/demo/DemoHeaderV5";
import { LadderScoreTable } from "@/components/demo/LadderScoreTable";
import { ThemeProvider, useTheme, type ThemeId } from "@/lib/theme";

import {
  DEMO_MODELS,
  DEMO_VENDORS,
  DEMO_TAGS,
  DEMO_PROTOCOLS,
  getVendorColor,
  type DemoVendor,
} from "@/lib/demoModels";

import { PRO_TYPES } from "@/components/demo/DemoFilterPanel";

type SortKey = "score" | "contextK" | "speed" | "price";
type FilterTab = "vendors" | "types" | "protocols" | "tags" | "openSource";

type ZoomPct = 0 | 25 | 50 | 75 | 100 | 125 | 150 | 175 | 200;

type OpenSourceFilter = boolean | null | "none";

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

export default function Page() {
  return (
    <ThemeProvider>
      <Demo5Inner />
    </ThemeProvider>
  );
}

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

  const tooltip =
    open &&
    typeof document !== "undefined" &&
    createPortal(
      <span
        className="pointer-events-none fixed hidden w-64 rounded-lg bg-slate-900 px-2.5 py-2 text-[11px] leading-snug text-white shadow-xl ring-1 ring-black/10"
        style={{ left: pos.left, top: pos.top, transform: "translateX(-50%)", zIndex: 10000, display: "block" }}
      >
        <span className="font-semibold">{title}</span>
        <span className="block mt-1 text-white/85">{desc}</span>
      </span>,
      document.body
    );

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
      {tooltip}
    </>
  );
}

function Demo5Inner() {
  const { theme, themeId, resolvedMode } = useTheme();
  // 强制浅色模式 - 根据需求 v1.6
const isDark = false;
  const [lang, setLang] = useState<Demo5Lang>("zh");
  const [query, setQuery] = useState("");
  const [vendors, setVendors] = useState<Set<DemoVendor>>(new Set(DEMO_VENDORS));
  const [types, setTypes] = useState<Set<string>>(new Set(PRO_TYPES));
  const [protocols, setProtocols] = useState<Set<string>>(new Set(DEMO_PROTOCOLS));
  const [tags, setTags] = useState<Set<string>>(new Set(DEMO_TAGS));
  const [openSource, setOpenSource] = useState<OpenSourceFilter>(null);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [viewMode, setViewMode] = useState<ViewMode>("horizontal");
  const [zoomPct, setZoomPct] = useState<ZoomPct>(0);
  const [activeTab, setActiveTab] = useState<FilterTab>("vendors");
  const [sortOpen, setSortOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authShowPassword, setAuthShowPassword] = useState(false);
  const [authNickname, setAuthNickname] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("demo5-lang");
    if (saved === "zh" || saved === "en" || saved === "ja") setLang(saved);
  }, []);

  const TEXT = {
    zh: {
      banner: {
        title: "大模型性能天梯图",
        sub: "扫一眼对比模型，做出更好的选择。",
        tableSettings: "表格设置",
        zoom: "表格缩放度",
        vertical: "竖排",
        horizontal: "横排",
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
      auth: {
        title: "欢迎使用 Aidean",
        login: "账号登录",
        register: "账号注册",
        email: "邮箱",
        password: "密码",
        nickname: "昵称（可选）",
        forgot: "忘记密码？",
        otherWays: "其他方式登录",
        toLogin: "去登录",
        toRegister: "去注册",
        close: "关闭",
        submitLogin: "登录",
        submitRegister: "注册",
        wechat: "微信扫码",
        google: "Google",
        qq: "QQ",
      },
      footer: { connect: "纠错邮箱" },
    },
    en: {
      banner: {
        title: "Model Performance Ladder",
        sub: "Compare models at a glance and decide faster.",
        tableSettings: "Table",
        zoom: "Density",
        vertical: "List",
        horizontal: "Grid",
        dataUpdate: "Updates: daily",
        coverage: (n: number) => `Models: ${n}`,
        dims: "Dimensions: 4",
        correction: "Corrections",
        correctionEmail: "164093410@qq.com",
      },
      version: { pro: "Pro", app: "Apps" },
      tabs: { vendors: "Vendors", types: "Type", protocols: "Protocol", tags: "Tags", openSource: "Open" } as Record<FilterTab, string>,
      sort: { score: "Reasoning Score", contextK: "Context", speed: "Speed", price: "Price" } as Record<SortKey, string>,
      common: { selectAll: "All", clear: "Clear", sortRule: "Sorting", open: "Open-source", closed: "Closed" },
      auth: {
        title: "Welcome to Aidean",
        login: "Sign in",
        register: "Sign up",
        email: "Email",
        password: "Password",
        nickname: "Nickname (optional)",
        forgot: "Forgot password?",
        otherWays: "Other methods",
        toLogin: "Sign in",
        toRegister: "Sign up",
        close: "Close",
        submitLogin: "Sign in",
        submitRegister: "Create account",
        wechat: "WeChat",
        google: "Google",
        qq: "QQ",
      },
      footer: { connect: "Email" },
    },
    ja: {
      banner: {
        title: "モデル性能ラダー",
        sub: "一目で比較して、より良い選択を。",
        tableSettings: "テーブル",
        zoom: "密度",
        vertical: "縦",
        horizontal: "横",
        dataUpdate: "更新：毎日",
        coverage: (n: number) => `モデル数：${n}`,
        dims: "指標：4",
        correction: "誤り報告",
        correctionEmail: "164093410@qq.com",
      },
      version: { pro: "プロ版", app: "アプリ版" },
      tabs: { vendors: "ベンダー", types: "タイプ", protocols: "プロトコル", tags: "タグ", openSource: "OSS" } as Record<FilterTab, string>,
      sort: { score: "推論スコア", contextK: "コンテキスト", speed: "速度", price: "価格" } as Record<SortKey, string>,
      common: { selectAll: "全て", clear: "クリア", sortRule: "並び替え", open: "OSS", closed: "クローズド" },
      auth: {
        title: "Aidean へようこそ",
        login: "ログイン",
        register: "登録",
        email: "メール",
        password: "パスワード",
        nickname: "ニックネーム（任意）",
        forgot: "パスワードを忘れた",
        otherWays: "他の方法",
        toLogin: "ログイン",
        toRegister: "登録",
        close: "閉じる",
        submitLogin: "ログイン",
        submitRegister: "登録",
        wechat: "WeChat",
        google: "Google",
        qq: "QQ",
      },
      footer: { connect: "メール" },
    },
  } as const;

  const t = (TEXT as any)[lang] ?? TEXT.zh;

  const ACCENT_RGB: Record<ThemeId, string> = {
    blue: "59,130,246",
    indigo: "99,102,241",
    emerald: "16,185,129",
    amber: "245,158,11",
    rose: "244,63,94",
  };
  const accentRgb = ACCENT_RGB[themeId] ?? ACCENT_RGB.blue;

  const ACCENT_TEXT_DARK: Record<ThemeId, string> = {
    blue: "text-blue-400",
    indigo: "text-indigo-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
  };
  const accentText = isDark ? (ACCENT_TEXT_DARK[themeId] ?? "text-blue-400") : theme.primaryText;

  const classPrimaryPill = `${theme.primaryLight} ${theme.primaryText} ${theme.accentHover} ring-1 ${theme.selectRing}`;
  const classPrimarySolid = `${theme.buttonBg} ${theme.buttonText} ${theme.buttonHover} shadow-sm ring-1 ${theme.selectRing}`;

  const getVendorSeriesName = useCallback((v: DemoVendor) => VENDOR_SERIES_META[v]?.seriesName ?? v, []);
  const getVendorIntro = useCallback((v: DemoVendor) => {
    const meta = VENDOR_SERIES_META[v];
    if (!meta) return { title: String(v), desc: String(v) };
    return { title: `${meta.seriesName}（${meta.companyName}）`, desc: meta.intro };
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

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEMO_MODELS.filter((r) => {
      const seriesName = getVendorSeriesName(r.vendor).toLowerCase();
      const companyName = String(r.vendor).toLowerCase();
      const matchesQuery = q.length === 0 || r.name.toLowerCase().includes(q) || seriesName.includes(q) || companyName.includes(q) || r.tags.some((t) => t.toLowerCase().includes(q));
      const matchesVendor = vendors.has(r.vendor);
      const matchesType = types.size === 0 || types.has(r.type);
      const matchesProtocol = protocols.size === 0 || protocols.has(r.protocol);
      const matchesTags = tags.size === 0 || Array.from(tags).some((t) => r.tags.includes(t));
      const matchesOpenSource = openSource === "none" ? false : openSource === null || r.openSource === openSource;
      return matchesQuery && matchesVendor && matchesType && matchesProtocol && matchesTags && matchesOpenSource;
    }).sort((a, b) => b[sortKey] - a[sortKey]);
  }, [query, vendors, types, protocols, tags, openSource, sortKey, getVendorSeriesName]);

  const visibleRows = rows.slice(0, visibleCount);
  const hasMore = visibleCount < rows.length;

  const resetAndFilter = useCallback(() => {
    setVisibleCount(PAGE_SIZE);
    bottomIntentRef.current = 0;
  }, []);

  const toggleVendor = useCallback((v: DemoVendor) => {
    setVendors((prev) => {
      const n = new Set(prev);
      n.has(v) ? n.delete(v) : n.add(v);
      return n;
    });
    resetAndFilter();
  }, [resetAndFilter]);

  const selectAllVendors = useCallback(() => {
    setVendors(new Set(DEMO_VENDORS));
    resetAndFilter();
  }, [resetAndFilter]);

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

      // 避免“最后一页加载完成后，仍处于底部阈值 → 立刻触发循环刷新回顶”。
      // 策略：已加载全部时，需要用户在底部再次触发（停顿/二次触底）才刷新。
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

      // 循环刷新：触底且已加载全部 → 重置回默认 100 行，并回到顶部，允许继续下滑。
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
  const clearAllVendors = () => { setVendors(new Set()); resetAndFilter(); };

  const toggleType = (t: string) => { setTypes((prev) => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); resetAndFilter(); return n; }); };
  const selectAllTypes = () => { setTypes(new Set(PRO_TYPES)); resetAndFilter(); };
  const clearAllTypes = () => { setTypes(new Set()); resetAndFilter(); };

  const toggleProtocol = (p: string) => { setProtocols((prev) => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); resetAndFilter(); return n; }); };
  const selectAllProtocols = () => { setProtocols(new Set(DEMO_PROTOCOLS)); resetAndFilter(); };
  const clearAllProtocols = () => { setProtocols(new Set()); resetAndFilter(); };

  const toggleTag = (t: string) => { setTags((prev) => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); resetAndFilter(); return n; }); };
  const selectAllTags = () => { setTags(new Set(DEMO_TAGS)); resetAndFilter(); };
  const clearAllTags = () => { setTags(new Set()); resetAndFilter(); };

  const setSort = (k: SortKey) => { setSortKey(k); setSortOpen(false); resetAndFilter(); };

  const orderedVendors = useMemo(() => {
    const tierIndex = (v: DemoVendor) => {
      const s = getVendorSeriesName(v);
      const idx = SERIES_TIER_ORDER.indexOf(s);
      return idx === -1 ? 999 : idx;
    };
    return [...DEMO_VENDORS].sort((a, b) => {
      const da = tierIndex(a);
      const db = tierIndex(b);
      if (da !== db) return da - db;
      return getVendorSeriesName(a).localeCompare(getVendorSeriesName(b), "zh");
    });
  }, [getVendorSeriesName]);

  const visibleVendors = useMemo(() => orderedVendors.filter((v) => vendors.has(v)), [orderedVendors, vendors]);

  const toggleSidebarSection = (key: keyof typeof sidebarExpanded) => {
    setSidebarExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getTabCount = (tab: FilterTab): [number, number] => {
    switch (tab) {
      case "vendors": return [vendors.size, DEMO_VENDORS.length];
      case "types": return [types.size, PRO_TYPES.length];
      case "protocols": return [protocols.size, DEMO_PROTOCOLS.length];
      case "tags": return [tags.size, DEMO_TAGS.length];
      case "openSource": {
        const selected = openSource === null ? 2 : openSource === "none" ? 0 : 1;
        return [selected, 2];
      }
    }
  };

  const currentSortLabel = t.sort[sortKey] || t.sort.score;

  const tableContent = (
    <div ref={tableScrollRef} className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
      <div className="p-4">
        <LadderScoreTable
          models={visibleRows}
          vendors={visibleVendors}
          hrefPrefix="/demo/demo5/models"
          getVendorLabel={getVendorSeriesName}
          getVendorHelp={getVendorIntro}
          zoomPct={zoomPct}
          variant="light"
          sortKey={sortKey}
          accentTextClassName={accentText}
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
                    : isDark
                      ? "bg-slate-900 text-slate-200 hover:bg-slate-900/70 ring-1 ring-slate-800"
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
          {PRO_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleType(t)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                types.has(t)
                  ? classPrimarySolid
                  : isDark
                    ? "bg-slate-900 text-slate-200 hover:bg-slate-900/70 ring-1 ring-slate-800"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {activeTab === "protocols" && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={selectAllProtocols} className={`px-3 py-2 rounded-lg text-sm font-semibold shrink-0 ${classPrimaryPill}`}>{t.common.selectAll}</button>
          <button type="button" onClick={clearAllProtocols} className="px-3 py-2 rounded-lg text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200 shrink-0">{t.common.clear}</button>
          <div className="w-px h-5 bg-gray-200 shrink-0" />
          {DEMO_PROTOCOLS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => toggleProtocol(p)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                protocols.has(p)
                  ? classPrimarySolid
                  : isDark
                    ? "bg-slate-900 text-slate-200 hover:bg-slate-900/70 ring-1 ring-slate-800"
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
          {DEMO_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTag(t)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                tags.has(t)
                  ? classPrimarySolid
                  : isDark
                    ? "bg-slate-900 text-slate-200 hover:bg-slate-900/70 ring-1 ring-slate-800"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-gray-200"
              }`}
            >
              {t}
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
                onClick={() => { setOpenSource(val); resetAndFilter(); }}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  active
                    ? classPrimarySolid
                    : isDark
                      ? "bg-slate-900 text-slate-200 hover:bg-slate-900/70 ring-1 ring-slate-800"
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
        <div className={`flex rounded-xl overflow-hidden ring-1 ${isDark ? "ring-slate-800" : theme.primaryRing}`}>
          <button type="button" className={`flex-1 py-3 text-sm font-bold ${theme.buttonBg} ${theme.buttonText} shadow-inner`}>{t.version.pro}</button>
          <button
            type="button"
            className={`flex-1 py-3 text-sm font-bold ring-0 transition-colors ${
              isDark
                ? "bg-slate-950 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                : `bg-white text-gray-500 ${theme.accentHover}`
            }`}
          >
            {t.version.app}
          </button>
        </div>
      </div>

      <FilterSection title={t.common.sortRule} expanded={sidebarExpanded.sort} onToggle={() => toggleSidebarSection("sort")}
        highlighted={sidebarExpanded.sort} highlightedClassName={theme.primaryText}
      >
        <div className="space-y-1">
          {SORT_KEYS.map((k) => (
            <button key={k} type="button" onClick={() => setSort(k)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${
                sortKey === k
                  ? classPrimarySolid + " font-medium"
                  : isDark
                    ? "bg-slate-900 text-slate-300 hover:bg-white/5 ring-1 ring-slate-800"
                    : `bg-white text-gray-600 ${theme.accentHover} ring-1 ${theme.primaryRing}`
              }`}>
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
        highlighted={vendors.size !== DEMO_VENDORS.length}
        highlightedClassName={theme.primaryText}
      >
        <div className="space-y-0.5">
          {orderedVendors.map((v) => {
            const color = getVendorColor(v);
            const checked = vendors.has(v);
            const intro = getVendorIntro(v);
            return (
              <button key={v} type="button" onClick={() => toggleVendor(v)}
                className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                  checked
                    ? `${theme.primaryLight} ${theme.primaryText} ring-1 ${theme.selectRing} shadow-sm`
                    : isDark
                      ? "bg-slate-950 text-slate-200 hover:bg-white/5 ring-1 ring-slate-800"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                }`}>
                <span className="relative inline-flex shrink-0">
                  <span className={`h-3 w-3 rounded-full shrink-0 ring-1 ring-black/10 transition-all ${checked ? "scale-100" : "scale-75 opacity-40"}`} style={{ backgroundColor: checked ? color : "#ccc" }} />
                  <VendorHelpBadge dotColor={checked ? color : "#ccc"} title={intro.title} desc={intro.desc} />
                </span>
                <span className="truncate font-medium">{getVendorSeriesName(v)}</span>
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection
        title={`${t.tabs.types} (${types.size}/${PRO_TYPES.length})`}
        expanded={sidebarExpanded.types}
        onToggle={() => toggleSidebarSection("types")}
        onSelectAll={selectAllTypes}
        onClear={clearAllTypes}
        selectAllLabel={t.common.selectAll}
        clearLabel={t.common.clear}
        highlighted={types.size !== PRO_TYPES.length}
        highlightedClassName={theme.primaryText}
      >
        <div className="flex flex-wrap gap-2">
          {PRO_TYPES.map((t) => (
            <button key={t} type="button" onClick={() => toggleType(t)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                types.has(t)
                  ? classPrimarySolid
                  : isDark
                    ? "bg-slate-900 text-slate-400 hover:bg-white/5 hover:text-slate-200 ring-1 ring-slate-800"
                    : `bg-white text-gray-400 ${theme.accentHover} hover:text-gray-700 ring-1 ${theme.primaryRing}`
              }`}>{t}</button>
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title={`${t.tabs.protocols} (${protocols.size}/${DEMO_PROTOCOLS.length})`}
        expanded={sidebarExpanded.protocols}
        onToggle={() => toggleSidebarSection("protocols")}
        onSelectAll={selectAllProtocols}
        onClear={clearAllProtocols}
        selectAllLabel={t.common.selectAll}
        clearLabel={t.common.clear}
        highlighted={protocols.size !== DEMO_PROTOCOLS.length}
        highlightedClassName={theme.primaryText}
      >
        <div className="flex flex-wrap gap-2">
          {DEMO_PROTOCOLS.map((p) => (
            <button key={p} type="button" onClick={() => toggleProtocol(p)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                protocols.has(p)
                  ? classPrimarySolid
                  : isDark
                    ? "bg-slate-900 text-slate-400 hover:bg-white/5 hover:text-slate-200 ring-1 ring-slate-800"
                    : `bg-white text-gray-400 ${theme.accentHover} hover:text-gray-700 ring-1 ${theme.primaryRing}`
              }`}>{p}</button>
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title={`${t.tabs.tags} (${tags.size}/${DEMO_TAGS.length})`}
        expanded={sidebarExpanded.tags}
        onToggle={() => toggleSidebarSection("tags")}
        onSelectAll={selectAllTags}
        onClear={clearAllTags}
        selectAllLabel={t.common.selectAll}
        clearLabel={t.common.clear}
        highlighted={tags.size !== DEMO_TAGS.length}
        highlightedClassName={theme.primaryText}
      >
        <div className="flex flex-wrap gap-1.5">
          {DEMO_TAGS.map((t) => (
            <button key={t} type="button" onClick={() => toggleTag(t)}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                tags.has(t)
                  ? classPrimarySolid
                  : isDark
                    ? "bg-slate-900 text-slate-400 hover:bg-white/5 hover:text-slate-200 ring-1 ring-slate-800"
                    : `bg-white text-gray-400 ${theme.accentHover} hover:text-gray-700 ring-1 ${theme.primaryRing}`
              }`}>{t}</button>
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title={`${t.tabs.openSource} (${openSource === null ? 2 : openSource === "none" ? 0 : 1}/2)`}
        expanded={sidebarExpanded.openSource}
        onToggle={() => toggleSidebarSection("openSource")}
        highlighted={openSource !== null}
        onSelectAll={() => { setOpenSource(null); resetAndFilter(); }}
        onClear={() => { setOpenSource("none"); resetAndFilter(); }}
        selectAllLabel={t.common.selectAll}
        clearLabel={t.common.clear}
      >
        <div className="flex gap-2">
          {(["open", "closed"] as const).map((opt) => {
            const val = opt === "open";
            const active = openSource === val;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => { setOpenSource(val); resetAndFilter(); }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? classPrimarySolid
                    : isDark
                      ? "bg-slate-900 text-slate-200 hover:bg-slate-900/70 ring-1 ring-slate-800"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100 ring-1 ring-gray-200"
                }`}
              >
                {opt === "open" ? t.common.open : t.common.closed}
              </button>
            );
          })}
        </div>
      </FilterSection>
    </div>
  );

  return (
    <div className={`min-h-screen ${theme.bg}`}>
      <DemoHeaderV5
        searchQuery={query}
        onSearchChange={setQuery}
        lang={lang}
        onLangChange={setLang}
        onAuthClick={() => {
          setAuthError(null);
          setAuthMode("login");
          setAuthOpen(true);
        }}
        containerClassName="max-w-[1920px]"
        containerStyle={{ maxWidth: "none" }}
      />

      <select
        aria-label="排序方式"
        className="sr-only"
        value={sortKey}
        onChange={(e) => setSort(e.target.value as SortKey)}
      >
        {SORT_KEYS.map((k) => (
          <option key={k} value={k}>
            {t.sort[k]}
          </option>
        ))}
      </select>

      {/* Banner */}
      <section
        className={`relative overflow-hidden border-b ${
          isDark ? "bg-slate-950 border-slate-800" : `bg-white ${theme.headerBorder}`
        }`}
      >
        <div className="absolute inset-0">
          <div
            className={
              isDark
                ? "absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:60px_60px]"
                : "absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:60px_60px]"
            }
          />
          <div
            className="absolute -left-44 top-[-240px] h-[640px] w-[640px] rounded-full"
            style={{ background: `radial-gradient(circle at center, rgba(${accentRgb},${isDark ? 0.16 : 0.10}), rgba(${accentRgb},0))` }}
          />
        </div>
        <div className="relative mx-auto flex max-w-[1920px] items-center px-4 py-8 sm:h-[200px] sm:py-0 sm:px-6 lg:px-8">
          <div className="relative w-full sm:h-full">
            <div className="text-center sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">
              <h1
                className={`text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight leading-tight inline-block ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                {t.banner.title}
              </h1>
              <p className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                {t.banner.sub}
              </p>
            </div>

            <div className="flex items-center gap-4 self-end ml-0 shrink-0 justify-end sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2 sm:self-auto sm:h-full">
              <div
                className={`flex flex-col justify-center gap-2 rounded-xl px-3 py-2 sm:h-[80%] ring-1 ${
                  isDark ? "bg-slate-900 ring-slate-800" : "bg-white ring-slate-200"
                }`}
              >
                <div className={`text-[11px] font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>{t.banner.tableSettings}</div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t.banner.zoom}</span>
                    <div className="relative">
                      <select
                        className={`h-8 rounded-lg border pl-2 pr-7 text-[11px] focus:outline-none focus:ring-2 ${theme.primaryRing} ${
                          isDark ? "border-slate-700 bg-slate-900 text-slate-200" : "border-slate-200 bg-white text-slate-700"
                        }`}
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
                      <ChevronDown className={`pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                    </div>
                  </div>

                  <div className={`flex items-center gap-1 rounded-lg border p-0.5 ${isDark ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-slate-50"}`}>
                    <button
                      type="button"
                      onClick={() => setViewMode("vertical")}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                        viewMode === "vertical"
                          ? isDark
                            ? "bg-slate-800 text-white shadow-sm"
                            : `bg-white ${theme.primaryText} shadow-sm`
                          : isDark
                            ? "text-slate-400 hover:text-slate-200"
                            : "text-slate-500 hover:text-slate-700"
                      }`}
                      aria-label="切换竖排"
                    >
                      <List className="h-3.5 w-3.5" />
                      {t.banner.vertical}
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("horizontal")}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                        viewMode === "horizontal"
                          ? isDark
                            ? "bg-slate-800 text-white shadow-sm"
                            : `bg-white ${theme.primaryText} shadow-sm`
                          : isDark
                            ? "text-slate-400 hover:text-slate-200"
                            : "text-slate-500 hover:text-slate-700"
                      }`}
                      aria-label="切换横排"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      {t.banner.horizontal}
                    </button>
                  </div>
                </div>
              </div>

              <div
                className={`flex flex-col justify-center gap-1.5 rounded-xl px-3 py-2 text-sm shrink-0 sm:h-[80%] ring-1 ${
                  isDark ? "bg-slate-900 text-slate-300 ring-slate-800" : "bg-white text-slate-500 ring-slate-200"
                }`}
              >
                <span>{t.banner.dataUpdate}</span>
                <span>{t.banner.coverage(DEMO_MODELS.length)}</span>
                <span>{t.banner.dims}</span>
                <span>
                  {t.banner.correction}: {t.banner.correctionEmail}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Area */}
      <section className="w-full">
        <div className="mx-auto max-w-[1920px] px-4 pb-16 sm:px-6 lg:px-8">
        {viewMode === "horizontal" ? (
          /* ===== HORIZONTAL: Sidebar + Table (demo3 style) ===== */
          <div
            ref={containerRef}
            className={`flex rounded-xl overflow-hidden ring-1 shadow-sm ${
              isDark ? "ring-slate-800 bg-slate-950" : "ring-slate-200 bg-white"
            }`}
            style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}
          >
            <aside
              className={`hidden lg:block shrink-0 border-r ${isDark ? "bg-slate-950 border-slate-800" : `bg-white ${theme.headerBorder}`}`}
              style={{ width: sidebarWidth, minWidth: sidebarWidth }}
            >
              <div className={`h-full overflow-y-auto ${isDark ? "bg-slate-950" : "bg-white"}`}>
                {sidebarFilterContent}
              </div>
            </aside>

            <div
              className={`hidden lg:block w-1.5 shrink-0 cursor-col-resize transition-colors relative ${
                isDark ? "bg-slate-900 hover:bg-slate-800" : `${theme.accent} ${theme.accentHover}`
              }`}
              onMouseDown={handleMouseDown}
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </div>

            <div className={`flex-1 min-w-0 ${isDark ? "bg-slate-950" : "bg-white"}`}>
              {tableContent}
            </div>
          </div>
        ) : (
          /* ===== VERTICAL: Filter on top + Table below (demo4 style) ===== */
          <div>
            <div className={`mb-6 rounded-xl ring-1 shadow-sm overflow-visible ${isDark ? "bg-slate-950 ring-slate-800" : "bg-white ring-slate-200"}`}> 
              <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-slate-800" : theme.headerBorder}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex rounded-xl overflow-hidden ring-2 ${theme.selectRing} shrink-0`}>
                    <button type="button" className={`px-6 py-2.5 text-base font-bold ${theme.buttonBg} ${theme.buttonText}`}>{t.version.pro}</button>
                    <button
                      type="button"
                      className={`px-6 py-2.5 text-base font-bold transition-colors ${
                        isDark
                          ? "bg-slate-950 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                          : `bg-white text-gray-500 ${theme.accentHover}`
                      }`}
                    >
                      {t.version.app}
                    </button>
                  </div>
                  <div className={`h-8 w-px shrink-0 ${isDark ? "bg-slate-800" : "bg-gray-200"}`} />
                  <div className="flex items-center gap-1">
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
                              : isDark
                                ? "bg-slate-900 text-slate-200 hover:bg-white/5 ring-1 ring-slate-800"
                                : `bg-white text-gray-700 ${theme.accentHover} ring-1 ${theme.primaryRing}`
                          }`}
                        >
                          {t.tabs[tabKey]}
                          <span className={`ml-1 text-[11px] ${activeTab === tabKey ? "text-slate-300" : "text-gray-400"}`}>
                            {count}/{total}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div ref={sortRef} className="relative shrink-0" style={{ zIndex: 60 }}>
                  <button
                    type="button"
                    onClick={() => setSortOpen(!sortOpen)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ring-1 ${
                      isDark
                        ? "bg-slate-900 hover:bg-white/5 text-slate-200 ring-slate-800"
                        : `bg-white ${theme.accentHover} text-gray-700 ${theme.primaryRing}`
                    }`}
                  >
                    <span>{currentSortLabel}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${sortOpen ? "rotate-180" : ""} ${isDark ? "text-slate-400" : "text-gray-400"}`} />
                  </button>
                  {sortOpen && (
                    <div
                      className={`absolute right-0 top-full mt-1 w-44 rounded-xl ring-1 shadow-xl py-1 ${
                        isDark ? "bg-slate-950 ring-slate-800" : `bg-white ${theme.primaryRing}`
                      }`}
                      style={{ zIndex: 70 }}
                    >
                      {SORT_KEYS.map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setSort(k)}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                            sortKey === k
                              ? `${theme.primaryLight} ${theme.primaryText} font-medium`
                              : isDark
                                ? "text-slate-200 hover:bg-white/5"
                                : `text-gray-700 ${theme.accentHover}`
                          }`}
                        >
                          <span>{t.sort[k]}</span>
                          {sortKey === k && <Check className={`h-4 w-4 ${theme.primaryText}`} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {filterPanelContent}
            </div>

            {tableContent}
          </div>
        )}
        </div>
      </section>

      <footer
        className={`border-t ${
          isDark ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
          <div className="py-10">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              <div className="lg:col-span-3">
                <Link href="/" className="flex items-center gap-2.5">
                  <img src="/logo.svg" alt="Aidean" className="h-9 w-9" />
                  <div className="min-w-0">
                    <div className={`text-lg font-bold leading-none ${isDark ? "text-white" : "text-slate-900"}`}>Aidean</div>
                    <div className={`mt-0.5 text-[11px] leading-none ${isDark ? "text-slate-400" : "text-slate-400"}`}>AI 模型天梯图</div>
                  </div>
                </Link>
                <div className={`mt-4 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  Built for high-density model comparison.
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <a
                    href="#"
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition-colors ${
                      isDark
                        ? "ring-slate-800 text-slate-400 hover:bg-white/5 hover:text-white"
                        : "ring-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    }`}
                    aria-label="Github"
                  >
                    <Github className="h-4 w-4" />
                  </a>
                  <a
                    href="#"
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition-colors ${
                      isDark
                        ? "ring-slate-800 text-slate-400 hover:bg-white/5 hover:text-white"
                        : "ring-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    }`}
                    aria-label="Twitter"
                  >
                    <Twitter className="h-4 w-4" />
                  </a>
                  <a
                    href="#"
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition-colors ${
                      isDark
                        ? "ring-slate-800 text-slate-400 hover:bg-white/5 hover:text-white"
                        : "ring-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    }`}
                    aria-label="Youtube"
                  >
                    <Youtube className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                  <div>
                    <div className={`text-xs font-semibold tracking-wide ${isDark ? "text-slate-200" : "text-slate-900"}`}>Product</div>
                    <div className={`mt-3 space-y-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      <a href="#" className={`block ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}>性能天梯图</a>
                      <a href="#" className={`block ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}>性价比排行</a>
                      <a href="#" className={`block ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}>开源模型榜</a>
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs font-semibold tracking-wide ${isDark ? "text-slate-200" : "text-slate-900"}`}>Company</div>
                    <div className={`mt-3 space-y-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      <a href="#" className={`block ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}>关于我们</a>
                      <a href="#" className={`block ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}>合作信息</a>
                      <a href="#" className={`block ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}>联系我们</a>
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs font-semibold tracking-wide ${isDark ? "text-slate-200" : "text-slate-900"}`}>Resources</div>
                    <div className={`mt-3 space-y-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      <a href="#" className={`block ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}>文档</a>
                      <a href="#" className={`block ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}>更新日志</a>
                      <a href="#" className={`block ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}>API</a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3">
                <div className={`text-xs font-semibold tracking-wide ${isDark ? "text-slate-200" : "text-slate-900"}`}>{t.footer.connect}</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className={`aspect-square rounded-xl ring-1 flex items-center justify-center text-[11px] ${isDark ? "bg-slate-900 ring-slate-800 text-slate-400" : "bg-slate-50 ring-slate-200 text-slate-500"}`}>
                    公众号
                  </div>
                  <div className={`aspect-square rounded-xl ring-1 flex items-center justify-center text-[11px] ${isDark ? "bg-slate-900 ring-slate-800 text-slate-400" : "bg-slate-50 ring-slate-200 text-slate-500"}`}>
                    社群
                  </div>
                </div>
                <div className={`mt-4 space-y-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  <a href="mailto:164093410@qq.com" className={`flex items-center gap-2 ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}>
                    <Mail className={`h-4 w-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                    164093410@qq.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className={`border-t py-4 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
            <div className={`flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between ${isDark ? "text-slate-500" : "text-slate-500"}`}>
              <div>© {new Date().getFullYear()} Aidean. All rights reserved.</div>
              <div className="flex items-center gap-4">
                <a href="#" className={isDark ? "hover:text-white" : "hover:text-slate-900"}>Terms</a>
                <a href="#" className={isDark ? "hover:text-white" : "hover:text-slate-900"}>Privacy</a>
                <a href="#" className={isDark ? "hover:text-white" : "hover:text-slate-900"}>Security</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Right Dock */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="w-[72px] overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-lg">
          <DockButton label="收藏" icon={<Bookmark className="h-4 w-4" />} />
          <DockButton label="对比" icon={<GitCompare className="h-4 w-4" />} />
          <DockButton label="客服" icon={<Headphones className="h-4 w-4" />} />
        </div>
      </div>

      {authOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/50 p-4"
            onMouseDown={() => {
              setAuthOpen(false);
            }}
            role="dialog"
            aria-modal="true"
            aria-label={t.auth.title}
          >
            <div
              className={`w-full max-w-[420px] rounded-2xl p-5 shadow-2xl ring-1 ${
                isDark ? "bg-slate-950 ring-slate-800" : "bg-white ring-slate-200"
              }`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={`text-base font-bold leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>{t.auth.title}</div>
                  <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>使用邮箱登录/注册，解锁收藏与对比能力。</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthOpen(false)}
                  className={`shrink-0 rounded-lg px-2 py-1 text-xs ring-1 transition-colors ${
                    isDark ? "ring-slate-800 text-slate-300 hover:bg-white/5" : "ring-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t.auth.close}
                </button>
              </div>

              <div className="mt-4">
                <div
                  className={`relative grid grid-cols-2 rounded-xl ring-1 ${
                    isDark ? "bg-slate-900/40 ring-slate-800" : "bg-slate-50 ring-slate-200"
                  }`}
                  role="tablist"
                  aria-label="auth tabs"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={authMode === "login"}
                    onClick={() => {
                      setAuthError(null);
                      setAuthMode("login");
                    }}
                    className={`relative h-11 rounded-xl text-sm font-semibold transition-colors ${
                      authMode === "login"
                        ? isDark
                          ? "text-white"
                          : "text-slate-900"
                        : isDark
                          ? "text-slate-400 hover:text-slate-200"
                          : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {t.auth.login}
                    {authMode === "login" && <span className={`absolute bottom-1 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full ${theme.navIndicator}`} />}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={authMode === "register"}
                    onClick={() => {
                      setAuthError(null);
                      setAuthMode("register");
                    }}
                    className={`relative h-11 rounded-xl text-sm font-semibold transition-colors ${
                      authMode === "register"
                        ? isDark
                          ? "text-white"
                          : "text-slate-900"
                        : isDark
                          ? "text-slate-400 hover:text-slate-200"
                          : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {t.auth.register}
                    {authMode === "register" && <span className={`absolute bottom-1 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full ${theme.navIndicator}`} />}
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <div className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>{t.auth.email}</div>
                  <input
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    className={`h-11 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 ${theme.primaryRing} ${
                      isDark
                        ? "border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-600"
                        : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white"
                    }`}
                  />
                </div>

                {authMode === "register" && (
                  <div className="space-y-1">
                    <div className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>{t.auth.nickname}</div>
                    <input
                      value={authNickname}
                      onChange={(e) => setAuthNickname(e.target.value)}
                      type="text"
                      autoComplete="nickname"
                      placeholder="可选"
                      className={`h-11 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 ${theme.primaryRing} ${
                        isDark
                          ? "border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-600"
                          : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white"
                      }`}
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <div className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>{t.auth.password}</div>
                  <div className="relative">
                    <input
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      type={authShowPassword ? "text" : "password"}
                      autoComplete={authMode === "login" ? "current-password" : "new-password"}
                      placeholder={authMode === "register" ? "至少 6 位" : "请输入密码"}
                      className={`h-11 w-full rounded-xl border px-3 pr-11 text-sm focus:outline-none focus:ring-2 ${theme.primaryRing} ${
                        isDark
                          ? "border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-600"
                          : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setAuthShowPassword((v) => !v)}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1 transition-colors ${
                        isDark
                          ? "ring-slate-800 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                          : "ring-slate-200 text-slate-400 hover:bg-white hover:text-slate-600"
                      }`}
                      aria-label={authShowPassword ? "隐藏密码" : "显示密码"}
                    >
                      {authShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className={`mt-1 inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${classPrimarySolid}`}
                  disabled={authLoading}
                  onClick={() => {
                    if (authLoading) return;
                    setAuthError(`${authMode === "login" ? t.auth.submitLogin : t.auth.submitRegister}：仅 UI 占位，暂未接入后端`);
                  }}
                >
                  {authLoading ? "..." : authMode === "login" ? t.auth.submitLogin : t.auth.submitRegister}
                </button>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setAuthError("暂未开放找回密码功能")}
                    className={`${isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {t.auth.forgot}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                      setAuthMode(authMode === "login" ? "register" : "login");
                    }}
                    className={`font-semibold ${theme.primaryText}`}
                  >
                    {authMode === "login" ? t.auth.toRegister : t.auth.toLogin}
                  </button>
                </div>

                <div className="pt-2">
                  <div className="flex items-center gap-3">
                    <div className={`h-px flex-1 ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
                    <div className={`text-[11px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t.auth.otherWays}</div>
                    <div className={`h-px flex-1 ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAuthError("微信扫码登录：仅 UI 占位，暂未接入")}
                      className={`group inline-flex h-11 items-center justify-center gap-2 rounded-xl ring-1 transition-colors ${
                        isDark
                          ? "bg-slate-900 text-slate-200 ring-slate-800 hover:bg-slate-900/70"
                          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <QrCode className={`h-4 w-4 ${theme.primaryText}`} />
                      <span className="text-xs font-semibold">{t.auth.wechat}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAuthError("Google 登录：仅 UI 占位，暂未接入")}
                      className={`group inline-flex h-11 items-center justify-center gap-2 rounded-xl ring-1 transition-colors ${
                        isDark
                          ? "bg-slate-900 text-slate-200 ring-slate-800 hover:bg-slate-900/70"
                          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Chrome className="h-4 w-4 text-slate-500 group-hover:text-slate-700" />
                      <span className="text-xs font-semibold">{t.auth.google}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAuthError("QQ 登录：仅 UI 占位，暂未接入")}
                      className={`group inline-flex h-11 items-center justify-center gap-2 rounded-xl ring-1 transition-colors ${
                        isDark
                          ? "bg-slate-900 text-slate-200 ring-slate-800 hover:bg-slate-900/70"
                          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <MessageCircle className="h-4 w-4 text-slate-500 group-hover:text-slate-700" />
                      <span className="text-xs font-semibold">{t.auth.qq}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>

                {authError && <div className="text-sm text-red-600">{authError}</div>}
              </div>
            </div>
          </div>,
          document.body
        )}
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
  title: string; expanded: boolean; onToggle: () => void; highlighted?: boolean;
  highlightedClassName?: string;
  onSelectAll?: () => void; onClear?: () => void; children: React.ReactNode;
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

function DockButton({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <button type="button" className="flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-slate-500 transition-colors hover:bg-slate-50">
      {icon}
      <span>{label}</span>
    </button>
  );
}
