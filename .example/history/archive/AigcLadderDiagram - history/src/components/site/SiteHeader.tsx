"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, Globe, LayoutGrid, List, Palette, Search, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

import { SITE_THEMES, useSiteTheme, type SiteThemeId, type SiteThemeMode } from "@/lib/siteTheme";
import { getTranslations } from "@/i18n";
import type { Lang } from "@/i18n/translations";

const KB_LINK = "http://36.134.158.50:10001/";

export type SiteViewMode = "vertical" | "horizontal";

export type SiteLang = "zh" | "en" | "ja";

export function SiteHeader({
  searchQuery,
  onSearchChange,
  viewMode = "horizontal",
  onViewModeChange = () => {},
  showViewToggle = false,
  lang: langProp,
  onLangChange,
  onAuthClick,
  containerClassName,
  containerStyle,
  headerClassName,
}: {
  searchQuery?: string;
  onSearchChange?: (v: string) => void;
  viewMode?: SiteViewMode;
  onViewModeChange?: (v: SiteViewMode) => void;
  showViewToggle?: boolean;
  lang?: SiteLang;
  onLangChange?: (l: SiteLang) => void;
  onAuthClick?: () => void;
  containerClassName?: string;
  containerStyle?: CSSProperties;
  headerClassName?: string;
}) {
  const { theme, themeId, setThemeId, mode, setMode, resolvedMode } = useSiteTheme();
  const pathname = usePathname() ?? "";
  const [openNav, setOpenNav] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [internalLang, setInternalLang] = useState<SiteLang>("zh");
  const [internalSearch, setInternalSearch] = useState("");

  const lang = langProp ?? internalLang;
  const effectiveSearchQuery = searchQuery ?? internalSearch;

  // 强制浅色模式 - 根据需求 v1.6
const isDark = false;

  const trans = getTranslations(lang as Lang);

  const activeTopNav = useMemo(() => {
    if (pathname === "/") return trans.nav.home;
    if (pathname.startsWith("/models") || pathname.startsWith("/demo/demo5")) return trans.nav.models;
    if (pathname.startsWith("/resources")) return trans.nav.resources;
    if (pathname.startsWith("/products")) return trans.nav.products;
    if (pathname.startsWith("/docs")) return trans.nav.docs;
    if (pathname.startsWith("/about")) return trans.nav.about;
    return null;
  }, [pathname, trans]);

  const TEXT = {
    zh: {
      nav: { home: "首页", models: "模型", resources: "资源", products: "产品", docs: "文档", about: "关于" },
      sub: "AI模型天梯图",
      search: "搜索模型名称、厂商、标签...",
      login: "登录/注册",
      langAria: "语言",
      themeAria: "主题",
      themeMode: "模式",
      themeColor: "配色",
      mode: { light: "浅色", dark: "深色", system: "跟随系统" },
    },
    en: {
      nav: { home: "Home", models: "Models", resources: "Resources", products: "Products", docs: "Docs", about: "About" },
      sub: "AI Ladder",
      search: "Search models, vendors, tags...",
      login: "Sign in",
      langAria: "Language",
      themeAria: "Theme",
      themeMode: "Mode",
      themeColor: "Palette",
      mode: { light: "Light", dark: "Dark", system: "System" },
    },
    ja: {
      nav: { home: "ホーム", models: "モデル", resources: "リソース", products: "製品", docs: "ドキュメント", about: "概要" },
      sub: "AI ラダー",
      search: "モデル・ベンダー・タグを検索...",
      login: "ログイン",
      langAria: "言語",
      themeAria: "テーマ",
      themeMode: "モード",
      themeColor: "配色",
      mode: { light: "ライト", dark: "ダーク", system: "システム" },
    },
  } as const;

  const t = (TEXT as any)[lang] ?? TEXT.zh;

  // 动态生成导航项（支持国际化）
  const NAV_ITEMS = useMemo(() => {
    return [
      { label: trans.nav.home, href: "/" },
      {
        label: trans.nav.models,
        href: "/models",
        children: [
          trans.models.ladder,
          trans.models.mobile,
          trans.models.image,
          trans.models.video,
          trans.models.audio,
        ],
      },
      {
        label: trans.nav.resources,
        href: "/resources/news",
        children: [
          trans.resources.news,
          trans.resources.scenarios,
          trans.resources.agent,
          trans.resources.mcp,
          trans.resources.skills,
        ],
      },
      {
        label: trans.nav.products,
        href: "/products/ai-employee",
        children: [
          trans.productItems.aiEmployee,
          trans.productItems.knowledgeBase,
          trans.productItems.solutions,
          trans.productItems.consulting,
        ],
      },
      {
        label: trans.nav.docs,
        href: "/docs/help",
        children: [
          trans.docs.help,
          trans.docs.helpCenter,
          trans.docs.pricing,
          trans.docs.api,
        ],
      },
      {
        label: trans.nav.about,
        href: "/about/cooperation",
        children: [
          trans.about.cooperation,
          trans.about.jobs,
          trans.about.contact,
        ],
      },
    ];
  }, [trans]);

  const LANGS = [
    { key: "zh", label: "中文" },
    { key: "en", label: "English" },
    { key: "ja", label: "日本語" },
  ];

  // 仅支持浅色模式 - 根据需求 v1.6，隐藏模式切换
  const MODE_OPTIONS: { key: SiteThemeMode; label: string }[] = [
    { key: "light", label: t.mode.light },
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("site-lang");
    if (saved === "zh" || saved === "en" || saved === "ja") setInternalLang(saved);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("site-lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLangSafe = (l: SiteLang) => {
    if (onLangChange) onLangChange(l);
    else setInternalLang(l);
  };

  const closeAllMenus = () => {
    setOpenNav(null);
    setLangOpen(false);
    setThemeOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-lang-dropdown]")) setLangOpen(false);
      if (!target.closest("[data-theme-dropdown]")) setThemeOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // 使用 useCallback 缓存 childHref 函数，避免每次渲染重新创建
  const productChildHref = useCallback((child: string) => {
    if (child === trans.productItems.knowledgeBase) return KB_LINK;
    if (child === trans.productItems.aiEmployee) return "/products/ai-employee";
    if (child === trans.productItems.solutions) return "/products/solutions";
    if (child === trans.productItems.consulting) return "/products/consulting";
    return "/products/ai-employee";
  }, [trans]);

  const resourceChildHref = useCallback((child: string) => {
    if (child === trans.resources.news) return "/resources/news";
    if (child === trans.resources.scenarios) return "/resources/scenarios";
    if (child === trans.resources.agent) return "/resources/agent";
    if (child === trans.resources.mcp) return "/resources/mcp";
    if (child === trans.resources.skills) return "/resources/skills";
    return "/resources";
  }, [trans]);

  const docsChildHref = useCallback((child: string) => {
    if (child === trans.docs.help) return "/docs/help";
    if (child === trans.docs.helpCenter) return "/docs/help-center";
    if (child === trans.docs.pricing) return "/docs/pricing";
    if (child === trans.docs.api) return "/docs/api";
    return "/docs";
  }, [trans]);

  const aboutChildHref = useCallback((child: string) => {
    if (child === trans.about.cooperation) return "/about/cooperation";
    if (child === trans.about.jobs) return "/about/jobs";
    if (child === trans.about.contact) return "/about/contact";
    return "/about";
  }, [trans]);

  const modelChildHref = useCallback((child: string) => {
    if (child === trans.models.ladder) return "/models";
    if (child === trans.models.mobile) return "/models/mobile";
    if (child === trans.models.image) return "/models/image";
    if (child === trans.models.video) return "/models/video";
    if (child === trans.models.audio) return "/models/audio";
    return "/models";
  }, [trans]);

  return (
    <header
      className={`fixed top-0 left-0 z-50 w-full border-b ${theme.headerBorder} ${theme.headerBg} backdrop-blur-md ${
        headerClassName ?? ""
      }`}
    >
      <div
        className={`mx-auto flex h-16 max-w-[1920px] items-center justify-between px-2 sm:px-3 lg:px-4 ${containerClassName ?? ""}`}
      >
        <div className="flex items-center gap-10 min-w-0">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <img src="/logo.svg" alt="Aidean" className="h-9 w-9" />
            <div>
              <div className={`text-lg font-bold leading-none ${isDark ? "text-white" : "text-gray-900"}`}>Aidean</div>
              <div className={`text-[11px] leading-none mt-0.5 ${isDark ? "text-slate-400" : "text-gray-400"}`}>{t.sub}</div>
            </div>
          </Link>

          <nav className="hidden items-center lg:flex" style={{ gap: "20px" }}>
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => item.children && setOpenNav(item.label)}
                onMouseLeave={() => setOpenNav(null)}
              >
                {item.href !== "#" ? (
                  <Link
                    href={item.href}
                    onClick={(e) => {
                      closeAllMenus();

                      if (typeof window === "undefined") return;
                      if (item.label !== trans.nav.home) return;
                      if (pathname !== "/") return;

                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`relative flex items-center gap-1 rounded-md px-3 py-2 text-[15px] font-medium transition-colors ${
                      item.label === activeTopNav
                        ? theme.navActive
                        : isDark
                          ? "text-slate-300 hover:text-white hover:bg-white/5"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                    {item.children && <ChevronDown className={`h-3.5 w-3.5 ${isDark ? "text-slate-500" : "text-gray-400"}`} />}
                    {item.label === activeTopNav && (
                      <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-7 rounded-full ${theme.navIndicator}`} />
                    )}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={`relative flex items-center gap-1 rounded-md px-3 py-2 text-[15px] font-medium transition-colors ${
                      item.label === activeTopNav
                        ? theme.navActive
                        : isDark
                          ? "text-slate-300 hover:text-white hover:bg-white/5"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                    {item.children && <ChevronDown className={`h-3.5 w-3.5 ${isDark ? "text-slate-500" : "text-gray-400"}`} />}
                    {item.label === activeTopNav && (
                      <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-7 rounded-full ${theme.navIndicator}`} />
                    )}
                  </button>
                )}

                {item.children && openNav === item.label && (
                  <div
                    className={`absolute top-full left-0 w-48 rounded-xl border shadow-lg py-1.5 z-50 ${
                      isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"
                    }`}
                  >
                    {item.children.map((child) => {
                      const isModel = item.label === trans.nav.models;
                      const isProduct = item.label === trans.nav.products;
                      const isResource = item.label === trans.nav.resources;
                      const isDocs = item.label === trans.nav.docs;
                      const isAbout = item.label === trans.nav.about;

                      let href = "#";
                      let isExternal = false;

if (isModel) {
href = modelChildHref(child);
} else if (isProduct) {
href = productChildHref(child);
isExternal = child === trans.productItems.knowledgeBase || child === "知识库";
} else if (isResource) {
href = resourceChildHref(child);
} else if (isDocs) {
href = docsChildHref(child);
} else if (isAbout) {
href = aboutChildHref(child);
}

                      const linkClass = `block w-full px-4 py-2.5 text-left text-sm transition-colors ${
                        isDark
                          ? "text-slate-200 hover:bg-white/5 hover:text-white"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`;

                      if (isExternal) {
                        return (
                          <a
                            key={child}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => closeAllMenus()}
                            className={linkClass}
                          >
                            {child}
                          </a>
                        );
                      }

                      return (
                        <Link
                          key={child}
                          href={href}
                          onClick={() => closeAllMenus()}
                          className={linkClass}
                        >
                          {child}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" style={{ width: "340px" }}>
            <input
              id="site-search"
              type="text"
              autoComplete="off"
              value={effectiveSearchQuery}
              onChange={(e) => {
                const v = e.target.value;
                if (onSearchChange) onSearchChange(v);
                else setInternalSearch(v);
              }}
              placeholder={t.search}
              className={`h-10 w-full rounded-lg border px-4 pr-10 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 ${theme.primaryRing} ${
                isDark
                  ? "border-slate-700 bg-slate-900/50 text-white focus:bg-slate-900"
                  : "border-gray-200 bg-gray-50 text-gray-900 focus:bg-white"
              }`}
              aria-label="搜索"
            />
            <div className={`pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center ${isDark ? "text-slate-400" : "text-gray-400"}`}>
              <Search className="h-4 w-4" />
            </div>
          </div>

          {showViewToggle && (
            <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              <button
                type="button"
                onClick={() => onViewModeChange("vertical")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                  viewMode === "vertical"
                    ? `bg-white ${theme.primaryText} shadow-sm`
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                竖排
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("horizontal")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                  viewMode === "horizontal"
                    ? `bg-white ${theme.primaryText} shadow-sm`
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                横排
              </button>
            </div>
          )}

          <div className="relative" data-lang-dropdown>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLangOpen(!langOpen);
                setThemeOpen(false);
              }}
              className={`cursor-pointer rounded-lg p-2 transition-colors ${
                langOpen
                  ? `${theme.primaryLight} ${theme.primaryText}`
                  : isDark
                    ? "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
              aria-label={t.langAria}
            >
              <Globe className="h-4 w-4" />
            </button>
            {langOpen && (
              <div
                className={`absolute right-0 top-full mt-1 w-36 rounded-xl border shadow-lg py-1 z-50 ${
                  isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"
                }`}
              >
                {LANGS.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLangSafe(l.key as SiteLang);
                      setLangOpen(false);
                    }}
                    className={`w-full cursor-pointer text-left px-3 py-2 text-sm flex items-center justify-between ${
                      lang === l.key
                        ? `${theme.primaryLight} ${theme.primaryText} font-medium`
                        : isDark
                          ? "text-slate-200 hover:bg-white/5"
                          : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{l.label}</span>
                    {lang === l.key && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" data-theme-dropdown>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setThemeOpen(!themeOpen);
                setLangOpen(false);
              }}
              className={`cursor-pointer rounded-lg p-2 transition-colors ${
                themeOpen
                  ? `${theme.primaryLight} ${theme.primaryText}`
                  : isDark
                    ? "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
              aria-label={t.themeAria}
            >
              <Palette className="h-4 w-4" />
            </button>

            {themeOpen && (
              <div
                className={`absolute right-0 top-full mt-1 w-56 rounded-xl border shadow-lg py-2 z-50 ${
                  isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"
                }`}
              >
                <div className={`px-3 pb-2 text-[11px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t.themeMode}</div>
                {MODE_OPTIONS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMode(m.key);
                    }}
                    className={`w-full cursor-pointer text-left px-3 py-2 text-sm flex items-center justify-between ${
                      mode === m.key
                        ? `${theme.primaryLight} ${theme.primaryText} font-medium`
                        : isDark
                          ? "text-slate-200 hover:bg-white/5"
                          : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{m.label}</span>
                    {mode === m.key && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}

                <div className={`my-2 border-t ${isDark ? "border-slate-800" : "border-slate-100"}`} />

                <div className={`px-3 pb-2 text-[11px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t.themeColor}</div>
                {(Object.values(SITE_THEMES) as { id: SiteThemeId; name: string; primary: string }[]).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setThemeId(c.id);
                      setThemeOpen(false);
                    }}
                    className={`w-full cursor-pointer text-left px-3 py-2 text-sm flex items-center justify-between ${
                      themeId === c.id
                        ? `${theme.primaryLight} ${theme.primaryText} font-medium`
                        : isDark
                          ? "text-slate-200 hover:bg-white/5"
                          : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${c.primary}`} />
                      {c.name}
                    </span>
                    {themeId === c.id && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {onAuthClick ? (
            <button
              type="button"
              onClick={onAuthClick}
              className={`cursor-pointer inline-flex h-9 items-center gap-2 rounded-lg ${theme.buttonBg} ${theme.buttonHover} px-4 text-sm font-medium ${theme.buttonText} transition-colors`}
            >
              <User className="h-4 w-4" />
              {t.login}
            </button>
          ) : (
            <Link
              href="/auth/login"
              className={`cursor-pointer inline-flex h-9 items-center gap-2 rounded-lg ${theme.buttonBg} ${theme.buttonHover} px-4 text-sm font-medium ${theme.buttonText} transition-colors`}
            >
              <User className="h-4 w-4" />
              {t.login}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
