"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type SiteThemeId = "blue" | "indigo" | "emerald" | "amber" | "rose";

// 仅支持浅色模式 - 根据需求 v1.6，禁止深色风格
export type SiteThemeMode = "light";

export interface SiteThemeConfig {
  id: SiteThemeId;
  name: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryRing: string;
  primaryText: string;
  accent: string;
  accentHover: string;
  accentLight: string;
  badge: string;
  badgeText: string;
  navActive: string;
  navActiveBg: string;
  navIndicator: string;
  selectBg: string;
  selectText: string;
  selectRing: string;
  buttonBg: string;
  buttonText: string;
  buttonHover: string;
  divider: string;
  headerBorder: string;
  headerBg: string;
  bg: string;
}

export const SITE_THEMES: Record<SiteThemeId, SiteThemeConfig> = {
  blue: {
    id: "blue",
    name: "科技蓝",
    primary: "bg-blue-600",
    primaryHover: "hover:bg-blue-700",
    primaryLight: "bg-blue-50",
    primaryRing: "ring-blue-400/20",
    primaryText: "text-blue-600",
    accent: "bg-blue-100",
    accentHover: "hover:bg-blue-200",
    accentLight: "text-blue-700",
    badge: "bg-blue-100",
    badgeText: "text-blue-700",
    navActive: "text-blue-600",
    navActiveBg: "bg-blue-600",
    navIndicator: "bg-blue-600",
    selectBg: "bg-blue-600",
    selectText: "text-blue-700",
    selectRing: "ring-blue-500",
    buttonBg: "bg-blue-600",
    buttonText: "text-white",
    buttonHover: "hover:bg-blue-700",
    divider: "border-gray-100",
    headerBorder: "border-gray-100",
    headerBg: "bg-white/95",
    bg: "bg-[#DBDFF9]",
  },
  indigo: {
    id: "indigo",
    name: "靛青紫",
    primary: "bg-indigo-600",
    primaryHover: "hover:bg-indigo-700",
    primaryLight: "bg-indigo-50",
    primaryRing: "ring-indigo-400/20",
    primaryText: "text-indigo-600",
    accent: "bg-indigo-100",
    accentHover: "hover:bg-indigo-200",
    accentLight: "text-indigo-700",
    badge: "bg-indigo-100",
    badgeText: "text-indigo-700",
    navActive: "text-indigo-600",
    navActiveBg: "bg-indigo-600",
    navIndicator: "bg-indigo-600",
    selectBg: "bg-indigo-600",
    selectText: "text-indigo-700",
    selectRing: "ring-indigo-500",
    buttonBg: "bg-indigo-600",
    buttonText: "text-white",
    buttonHover: "hover:bg-indigo-700",
    divider: "border-indigo-100",
    headerBorder: "border-indigo-100",
    headerBg: "bg-white/95",
    bg: "bg-[#DBDFF9]",
  },
  emerald: {
    id: "emerald",
    name: "翡翠绿",
    primary: "bg-emerald-600",
    primaryHover: "hover:bg-emerald-700",
    primaryLight: "bg-emerald-50",
    primaryRing: "ring-emerald-400/20",
    primaryText: "text-emerald-600",
    accent: "bg-emerald-100",
    accentHover: "hover:bg-emerald-200",
    accentLight: "text-emerald-700",
    badge: "bg-emerald-100",
    badgeText: "text-emerald-700",
    navActive: "text-emerald-600",
    navActiveBg: "bg-emerald-600",
    navIndicator: "bg-emerald-600",
    selectBg: "bg-emerald-600",
    selectText: "text-emerald-700",
    selectRing: "ring-emerald-500",
    buttonBg: "bg-emerald-600",
    buttonText: "text-white",
    buttonHover: "hover:bg-emerald-700",
    divider: "border-emerald-100",
    headerBorder: "border-emerald-100",
    headerBg: "bg-white/95",
    bg: "bg-[#DBDFF9]",
  },
  amber: {
    id: "amber",
    name: "琥珀暖金",
    primary: "bg-amber-600",
    primaryHover: "hover:bg-amber-700",
    primaryLight: "bg-amber-50",
    primaryRing: "ring-amber-400/20",
    primaryText: "text-amber-600",
    accent: "bg-amber-100",
    accentHover: "hover:bg-amber-200",
    accentLight: "text-amber-700",
    badge: "bg-amber-100",
    badgeText: "text-amber-700",
    navActive: "text-amber-600",
    navActiveBg: "bg-amber-600",
    navIndicator: "bg-amber-600",
    selectBg: "bg-amber-600",
    selectText: "text-amber-700",
    selectRing: "ring-amber-500",
    buttonBg: "bg-amber-600",
    buttonText: "text-white",
    buttonHover: "hover:bg-amber-700",
    divider: "border-amber-100",
    headerBorder: "border-amber-100",
    headerBg: "bg-white/95",
    bg: "bg-[#DBDFF9]",
  },
  rose: {
    id: "rose",
    name: "蔷薇粉",
    primary: "bg-rose-600",
    primaryHover: "hover:bg-rose-700",
    primaryLight: "bg-rose-50",
    primaryRing: "ring-rose-400/20",
    primaryText: "text-rose-600",
    accent: "bg-rose-100",
    accentHover: "hover:bg-rose-200",
    accentLight: "text-rose-700",
    badge: "bg-rose-100",
    badgeText: "text-rose-700",
    navActive: "text-rose-600",
    navActiveBg: "bg-rose-600",
    navIndicator: "bg-rose-600",
    selectBg: "bg-rose-600",
    selectText: "text-rose-700",
    selectRing: "ring-rose-500",
    buttonBg: "bg-rose-600",
    buttonText: "text-white",
    buttonHover: "hover:bg-rose-700",
    divider: "border-rose-100",
    headerBorder: "border-rose-100",
    headerBg: "bg-white/95",
    bg: "bg-[#DBDFF9]",
  },
};

interface SiteThemeContextType {
  theme: SiteThemeConfig;
  themeId: SiteThemeId;
  setThemeId: (id: SiteThemeId) => void;
  mode: SiteThemeMode;
  setMode: (m: SiteThemeMode) => void;
  resolvedMode: "light";
}

const SiteThemeContext = createContext<SiteThemeContextType | null>(null);

export function SiteThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<SiteThemeId>("blue");
  // 强制浅色模式 - 根据需求 v1.6，禁止深色风格
  const mode: SiteThemeMode = "light";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTheme = localStorage.getItem("site-theme");
    if (savedTheme === "blue" || savedTheme === "indigo" || savedTheme === "emerald" || savedTheme === "amber" || savedTheme === "rose") {
      setThemeId(savedTheme);
    }
    // 清除可能存在的旧深色模式设置
    localStorage.removeItem("site-theme-mode");
  }, []);

  // 固定为浅色模式
  const resolvedMode: "light" = "light";

  useEffect(() => {
    localStorage.setItem("site-theme", themeId);
  }, [themeId]);

  // 确保 html 元素没有 dark 类
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.remove("dark");
  }, []);

  // 仅设置浅色模式 CSS 变量
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty("--bg", "250 247 240");
    root.style.setProperty("--fg", "24 24 27");
    root.style.setProperty("--border", "228 228 231");
    root.style.setProperty("--card", "255 255 255");
    root.style.setProperty("--muted", "113 113 122");
  }, []);

  // 仅使用浅色主题
  const theme: SiteThemeConfig = SITE_THEMES[themeId];
  // mode 和 setMode 保持兼容但 setMode 为空操作（始终浅色）
  const setMode = () => {}; // 空操作，因为只允许浅色模式

  return (
    <SiteThemeContext.Provider value={{ theme, themeId, setThemeId, mode, setMode, resolvedMode }}>
      {children}
    </SiteThemeContext.Provider>
  );
}

export function useSiteTheme() {
  const ctx = useContext(SiteThemeContext);
  if (!ctx) throw new Error("useSiteTheme must be used within SiteThemeProvider");
  return ctx;
}
