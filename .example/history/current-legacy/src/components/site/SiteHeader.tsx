"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, Globe, LayoutGrid, List, LogOut, Palette, Search, User, Wallet, Heart, History } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

import { SITE_THEMES, useSiteTheme, type SiteThemeId, type SiteThemeMode } from "@/lib/config/siteTheme";
import { getTranslations } from "@/i18n";
import type { Lang } from "@/i18n/translations";
import { useApi, publicApiKeys } from "@/hooks/useApi";
import { api } from "@/lib/api/client";

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [internalLang, setInternalLang] = useState<SiteLang>("zh");
  const [internalSearch, setInternalSearch] = useState("");

  const lang = langProp ?? internalLang;
  const effectiveSearchQuery = searchQuery ?? internalSearch;

  const { data: siteConfig } = useApi<{ siteName?: string; siteDesc?: string; logoUrl?: string }>(
    publicApiKeys.config()
  );

  const { data: authData, mutate: mutateAuth } = useApi<{ user: { id: string; email: string; nickname?: string; avatar?: string; balance: number } } | null>(
    typeof window !== "undefined" && localStorage.getItem("token") ? publicApiKeys.authMe() : null
  );

  const { data: balanceData } = useApi<{ balance: number; currency: string }>(
    authData?.user ? publicApiKeys.balance() : null
  );

  const isLoggedIn = !!authData?.user;
  const user = authData?.user;
  const balance = balanceData?.balance ?? user?.balance ?? 0;


  const trans = getTranslations(lang as Lang);

  const activeTopNav = useMemo(() => {
    if (pathname === "/") return trans.nav.home;
    if (pathname.startsWith("/aidean") || pathname.startsWith("/models") || pathname.startsWith("/demo/demo5")) return trans.nav.models;
    if (pathname.startsWith("/space") || pathname.startsWith("/resources")) return trans.nav.resources;
    if (pathname.startsWith("/sphere") || pathname.startsWith("/products")) return trans.nav.products;
    if (pathname.startsWith("/docs")) return trans.nav.docs;
    if (pathname.startsWith("/about")) return trans.nav.about;
    return null;
  }, [pathname, trans]);

  const TEXT = {
    zh: {
      nav: { home: "首页", models: "Aidean", resources: "AideanSpace", products: "Sphere", docs: "文档", about: "关于" },
      sub: "三位一体 AI 平台",
      search: "搜索模型名称、厂商、标签...",
      login: "登录/注册",
      langAria: "语言",
      themeAria: "主题",
      themeMode: "模式",
      themeColor: "配色",
      mode: { light: "浅色", dark: "深色", system: "跟随系统" },
    },
    en: {
      nav: { home: "Home", models: "Aidean", resources: "AideanSpace", products: "Sphere", docs: "Docs", about: "About" },
      sub: "Trinity AI Platform",
      search: "Search models, vendors, tags...",
      login: "Sign in",
      langAria: "Language",
      themeAria: "Theme",
      themeMode: "Mode",
      themeColor: "Palette",
      mode: { light: "Light", dark: "Dark", system: "System" },
    },
    ja: {
      nav: { home: "ホーム", models: "Aidean", resources: "AideanSpace", products: "Sphere", docs: "ドキュメント", about: "概要" },
      sub: "三位一体 AI プラットフォーム",
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
        href: "/aidean",
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
        href: "/space",
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
        href: "/sphere",
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

  const isDark = resolvedMode === "dark";
  const headerShellClass = isDark
    ? "border-slate-700 bg-slate-950/92"
    : `${theme.headerBorder} ${theme.headerBg}`;
  const logoTitleClass = isDark ? "text-slate-100" : "text-gray-900";
  const logoSubClass = isDark ? "text-slate-400" : "text-gray-400";
  const navIdleClass = isDark
    ? "text-slate-300 hover:text-slate-100 hover:bg-slate-800/80"
    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50";
  const panelClass = isDark
    ? "bg-slate-900 border-slate-700 text-slate-200"
    : "bg-white border-gray-100";
  const textMutedClass = isDark ? "text-slate-400" : "text-gray-400";
  const textBodyClass = isDark ? "text-slate-300" : "text-gray-700";
  const surfaceClass = isDark ? "border-slate-700 bg-slate-900/80" : "border-gray-200 bg-gray-50";

  const MODE_OPTIONS: { key: SiteThemeMode; label: string }[] = [
    { key: "light", label: t.mode.light },
    { key: "dark", label: t.mode.dark },
    { key: "system", label: t.mode.system },
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
    setUserMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    localStorage.removeItem("token");
    mutateAuth(null, false);
    setUserMenuOpen(false);
    window.location.href = "/";
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-lang-dropdown]")) setLangOpen(false);
      if (!target.closest("[data-theme-dropdown]")) setThemeOpen(false);
      if (!target.closest("[data-user-dropdown]")) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // 使用 useCallback 缓存 childHref 函数，避免每次渲染重新创建
  const productChildHref = useCallback((child: string) => {
    if (child === trans.productItems.knowledgeBase) return "/sphere/knowledge-base";
    if (child === trans.productItems.aiEmployee) return "/sphere/ai-employee";
    if (child === trans.productItems.solutions) return "/sphere/solutions";
    if (child === trans.productItems.consulting) return "/sphere/consulting";
    return "/sphere/ai-employee";
  }, [trans]);

  const resourceChildHref = useCallback((child: string) => {
    if (child === trans.resources.news) return "/space/news";
    if (child === trans.resources.scenarios) return "/space/scenarios";
    if (child === trans.resources.agent) return "/space/agent";
    if (child === trans.resources.mcp) return "/space/mcp";
    if (child === trans.resources.skills) return "/space/skills";
    return "/space";
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
    if (child === trans.models.ladder) return "/aidean";
    if (child === trans.models.mobile) return "/aidean/mobile";
    if (child === trans.models.image) return "/aidean/image";
    if (child === trans.models.video) return "/aidean/video";
    if (child === trans.models.audio) return "/aidean/audio";
    return "/aidean";
  }, [trans]);

  return (
    <header
      className={`fixed top-0 left-0 z-50 w-full border-b ${headerShellClass} backdrop-blur-md ${
        headerClassName ?? ""
      }`}
    >
      <div
        className={`mx-auto flex h-16 max-w-[1920px] items-center justify-between px-2 sm:px-3 lg:px-4 ${containerClassName ?? ""}`}
      >
        <div className="flex items-center gap-10 min-w-0">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <img src="/images/icons/logo.svg" alt="Aidean" className="h-9 w-9" />
            <div>
              <div className={`text-lg font-bold leading-none ${logoTitleClass}`}>Aidean</div>
              <div className={`text-[11px] leading-none mt-0.5 ${logoSubClass}`}>{t.sub}</div>
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
                        : navIdleClass
                    }`}
                  >
                    {item.label}
                    {item.children && <ChevronDown className={`h-3.5 w-3.5 ${textMutedClass}`} />}
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
                        : navIdleClass
                    }`}
                  >
                    {item.label}
                    {item.children && <ChevronDown className={`h-3.5 w-3.5 ${textMutedClass}`} />}
                    {item.label === activeTopNav && (
                      <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-7 rounded-full ${theme.navIndicator}`} />
                    )}
                  </button>
                )}

                {item.children && openNav === item.label && (
                  <div
                    className={`absolute top-full left-0 w-48 rounded-xl border shadow-lg py-1.5 z-50 ${panelClass}`}
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
isExternal = false;
} else if (isResource) {
href = resourceChildHref(child);
} else if (isDocs) {
href = docsChildHref(child);
} else if (isAbout) {
href = aboutChildHref(child);
}

                      const linkClass = `block w-full px-4 py-2.5 text-left text-sm transition-colors ${
                        isDark ? "text-slate-300 hover:bg-slate-800 hover:text-slate-100" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
          <div className="relative hidden sm:block w-48 md:w-56 lg:w-64 xl:w-80">
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && effectiveSearchQuery.trim()) {
                  window.location.href = `/models?q=${encodeURIComponent(effectiveSearchQuery.trim())}`;
                }
              }}
              placeholder={t.search}
              className={`h-10 w-full rounded-lg border px-4 pr-10 text-sm focus:border-transparent focus:outline-none focus:ring-2 ${theme.primaryRing} ${surfaceClass} ${
                isDark ? "text-slate-100 placeholder:text-slate-400 focus:bg-slate-900" : "text-gray-900 placeholder:text-gray-400 focus:bg-white"
              }`}
              aria-label="搜索"
            />
            <div className={`pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center ${textMutedClass}`}>
              <Search className="h-4 w-4" />
            </div>
          </div>

          {showViewToggle && (
            <div className={`flex items-center gap-0.5 rounded-lg border p-0.5 ${surfaceClass}`}>
              <button
                type="button"
                onClick={() => onViewModeChange("vertical")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                  viewMode === "vertical"
                    ? `bg-white ${theme.primaryText} shadow-sm`
                    : isDark ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"
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
                    : isDark ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"
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
              }}
              className={`cursor-pointer rounded-lg p-2 transition-colors ${
                langOpen
                  ? `${theme.primaryLight} ${theme.primaryText}`
                  : isDark ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
              aria-label={t.langAria}
            >
              <Globe className="h-4 w-4" />
            </button>
            {langOpen && (
              <div
                className={`absolute right-0 top-full w-36 rounded-xl border shadow-lg py-1 z-50 ${panelClass}`}
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
                        : isDark ? "text-slate-300 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{l.label}</span>
                    {lang === l.key && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 主题切换按钮 */}
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
                  : isDark ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
              aria-label={t.themeAria}
            >
              <Palette className="h-4 w-4" />
            </button>

            {themeOpen && (
              <div
                className={`absolute right-0 top-full w-56 rounded-xl border shadow-lg py-2 z-50 ${panelClass}`}
              >
                <div className="px-3 pb-2 text-[11px] font-semibold text-slate-500">{t.themeMode}</div>
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
                        : isDark ? "text-slate-300 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{m.label}</span>
                    {mode === m.key && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}

                <div className="my-2 border-t border-slate-100" />

                <div className="px-3 pb-2 text-[11px] font-semibold text-slate-500">{t.themeColor}</div>
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
                        : isDark ? "text-slate-300 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-50"
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

          {isLoggedIn ? (
            <div className="relative" data-user-dropdown>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setUserMenuOpen(!userMenuOpen);
                }}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${isDark ? "border-slate-700 bg-slate-900 hover:bg-slate-800" : "border-gray-200 bg-white hover:bg-gray-50"}`}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.nickname || user.email} className="h-6 w-6 rounded-full" />
                ) : (
                  <div className={`h-6 w-6 rounded-full ${theme.primaryLight} flex items-center justify-center`}>
                    <User className={`h-3.5 w-3.5 ${theme.primaryText}`} />
                  </div>
                )}
                <span className={`hidden sm:inline font-medium ${textBodyClass}`}>
                  {user?.nickname || user?.email?.split("@")[0] || "用户"}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 ${textMutedClass}`} />
              </button>

              {userMenuOpen && (
                <div className={`absolute right-0 top-full w-56 rounded-xl border shadow-lg py-1.5 z-50 ${panelClass}`}>
                  <div className={`px-4 py-2 border-b ${isDark ? "border-slate-700" : "border-gray-100"}`}>
                    <div className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-gray-900"}`}>{user?.nickname || user?.email?.split("@")[0]}</div>
                    <div className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>{user?.email}</div>
                  </div>

                  <div className={`px-4 py-2 flex items-center justify-between border-b ${isDark ? "border-slate-700" : "border-gray-100"}`}>
                    <span className={`text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>余额</span>
                    <span className={`text-sm font-medium ${theme.primaryText}`}>¥{balance.toFixed(2)}</span>
                  </div>

                  <Link
                    href="/user/favorites"
                    onClick={() => setUserMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    <Heart className="h-4 w-4" />
                    我的收藏
                  </Link>

                  <Link
                    href="/user/transactions"
                    onClick={() => setUserMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    <History className="h-4 w-4" />
                    消费记录
                  </Link>

                  <Link
                    href="/user/recharge"
                    onClick={() => setUserMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    <Wallet className="h-4 w-4" />
                    充值
                  </Link>

                  <div className={`my-1 border-t ${isDark ? "border-slate-700" : "border-gray-100"}`} />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          ) : onAuthClick ? (
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
