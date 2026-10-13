"use client";

import Link from "next/link";
import { Search, Globe, Palette, User, LayoutGrid, List, Check, ChevronDown } from "lucide-react";
import { useState, useEffect, type CSSProperties } from "react";
import { useTheme, THEMES, type ThemeId, type ThemeMode } from "@/lib/theme";

const NAV_ITEMS = [
  { label: "首页", href: "/" },
  { label: "模型", href: "/demo/demo5", children: ["性能天梯图", "性价比排行", "开源模型榜", "手机端模型"] },
  { label: "资源", href: "#", children: ["AI快讯", "Agent集合", "MCP工具", "Skill技能"] },
  { label: "产品", href: "#", children: ["数字分身", "知识库产品", "解决方案", "业务咨询"] },
  { label: "文档", href: "#", children: ["使用指南", "定价方案", "API文档"] },
  { label: "关于", href: "#", children: ["合作信息", "关于我们", "联系我们"] },
];

export type ViewMode = "vertical" | "horizontal";

export type Demo5Lang = "zh" | "en" | "ja";

export function DemoHeaderV5({
  searchQuery = "",
  onSearchChange = () => {},
  viewMode = "horizontal",
  onViewModeChange = () => {},
  showViewToggle = false,
  lang: langProp,
  onLangChange,
  onAuthClick,
  containerClassName,
  containerStyle,
}: {
  searchQuery?: string;
  onSearchChange?: (v: string) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (v: ViewMode) => void;
  showViewToggle?: boolean;
  lang?: Demo5Lang;
  onLangChange?: (l: Demo5Lang) => void;
  onAuthClick?: () => void;
  containerClassName?: string;
  containerStyle?: CSSProperties;
}) {
  const { theme, themeId, setThemeId, mode, setMode, resolvedMode } = useTheme();
  const [openNav, setOpenNav] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [internalLang, setInternalLang] = useState<Demo5Lang>("zh");

  const lang = langProp ?? internalLang;


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

  const LANGS = [
    { key: "zh", label: "中文" },
    { key: "en", label: "English" },
    { key: "ja", label: "日本語" },
  ];

  const MODE_OPTIONS: { key: ThemeMode; label: string }[] = [
    { key: "light", label: t.mode.light },
    { key: "dark", label: t.mode.dark },
    { key: "system", label: t.mode.system },
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("demo5-lang");
    if (saved === "zh" || saved === "en" || saved === "ja") setInternalLang(saved);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("demo5-lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLangSafe = (l: Demo5Lang) => {
    if (onLangChange) onLangChange(l);
    else setInternalLang(l);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-lang-dropdown]")) setLangOpen(false);
      if (!target.closest("[data-theme-dropdown]")) setThemeOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className={`sticky top-0 z-50 w-full border-b ${theme.headerBorder} ${theme.headerBg} backdrop-blur-md`}>
      <div
        className={`mx-auto flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8 ${containerClassName ?? ""}`}
        style={{ maxWidth: "1600px", ...(containerStyle ?? {}) }}
      >
        <div className="flex items-center gap-10 min-w-0">
          {/* Logo + Name - aligned to filter panel left edge */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <img src="/images/icons/logo.svg" alt="Aidean" className="h-9 w-9" />
            <div>
              <div className="text-lg font-bold leading-none text-gray-900">Aidean</div>
              <div className="text-[11px] leading-none mt-0.5 text-gray-400">{t.sub}</div>
            </div>
          </Link>

          {/* LEFT: Nav only */}
          <nav className="hidden items-center xl:flex" style={{ gap: "28px" }}>
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => item.children && setOpenNav(item.label)}
                onMouseLeave={() => setOpenNav(null)}
              >
                <button
                  type="button"
                  className={`relative flex items-center gap-1 rounded-md px-3 py-2 text-[15px] font-medium transition-colors ${
                    item.label === "模型"
                      ? theme.navActive
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {item.label === "首页"
                    ? t.nav.home
                    : item.label === "模型"
                      ? t.nav.models
                      : item.label === "资源"
                        ? t.nav.resources
                        : item.label === "产品"
                          ? t.nav.products
                          : item.label === "文档"
                            ? t.nav.docs
                            : item.label === "关于"
                              ? t.nav.about
                              : item.label}
                  {item.children && <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
                  {item.label === "模型" && (
                    <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-7 rounded-full ${theme.navIndicator}`} />
                  )}
                </button>
                {item.children && openNav === item.label && (
                  <div
                    className={`absolute top-full left-0 mt-1 w-48 rounded-xl border shadow-lg py-1.5 z-50 ${
                      "bg-white border-gray-100"
                    }`}
                  >
                    {item.children.map((child) => (
                      <button
                        key={child}
                        type="button"
                        className="w-full px-4 py-2.5 text-left text-sm transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      >
                        {child}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* RIGHT: Logo + Name + Search + Controls */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative" style={{ width: "340px" }}>
            <input
              id="demo5-search"
              type="text"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t.search}
              className={`h-10 w-full rounded-lg border px-4 pr-10 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 ${theme.primaryRing} ${
                "border-gray-200 bg-gray-50 text-gray-900 focus:bg-white"
              }`}
              aria-label="搜索"
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-400">
              <Search className="h-4 w-4" />
            </div>
          </div>

          {/* View Toggle */}
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
                title="竖向排列（Demo4风格）"
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
                title="横向排列（Demo3风格）"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                横排
              </button>
            </div>
          )}

          {/* Language Dropdown */}
          <div className="relative" data-lang-dropdown>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLangOpen(!langOpen); setThemeOpen(false); }}
              className={`cursor-pointer rounded-lg p-2 transition-colors ${langOpen ? `${theme.primaryLight} ${theme.primaryText}` : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"}`}
              aria-label={t.langAria}
            >
              <Globe className="h-4 w-4" />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 rounded-xl border shadow-lg py-1 z-50 bg-white border-gray-100">
                {LANGS.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setLangSafe(l.key as Demo5Lang); setLangOpen(false); }}
                    className={`w-full cursor-pointer text-left px-3 py-2 text-sm flex items-center justify-between ${
                      lang === l.key
                        ? `${theme.primaryLight} ${theme.primaryText} font-medium`
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

          {/* Theme Dropdown */}
          <div className="relative" data-theme-dropdown>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setThemeOpen(!themeOpen); setLangOpen(false); }}
              className={`cursor-pointer rounded-lg p-2 transition-colors ${themeOpen ? `${theme.primaryLight} ${theme.primaryText}` : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"}`}
              aria-label={t.themeAria}
            >
              <Palette className="h-4 w-4" />
            </button>
            {themeOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border shadow-lg py-2 z-50 bg-white border-gray-100">
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
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{m.label}</span>
                    {mode === m.key && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}

                <div className="my-2 border-t border-slate-100" />

                <div className="px-3 pb-2 text-[11px] font-semibold text-slate-500">{t.themeColor}</div>
                {(Object.values(THEMES) as { id: ThemeId; name: string; primary: string }[]).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setThemeId(c.id); setThemeOpen(false); }}
                    className={`w-full cursor-pointer text-left px-3 py-2 text-sm flex items-center justify-between ${
                      themeId === c.id
                        ? `${theme.primaryLight} ${theme.primaryText} font-medium`
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

          {/* Login */}
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
