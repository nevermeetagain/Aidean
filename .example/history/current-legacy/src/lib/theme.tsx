"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type ThemeId = "blue" | "indigo" | "emerald" | "amber" | "rose";

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeConfig {
  id: ThemeId;
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

export const THEMES: Record<ThemeId, ThemeConfig> = {
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
    bg: "bg-[#F8FAFC]",
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
    bg: "bg-[#F5F3FF]",
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
    bg: "bg-[#F0FDF4]",
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
    bg: "bg-[#FFFBEB]",
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
    bg: "bg-[#FFF1F2]",
  },
};

interface ThemeContextType {
  theme: ThemeConfig;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  resolvedMode: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("demo5-theme");
      if (saved === "blue" || saved === "indigo" || saved === "emerald" || saved === "amber" || saved === "rose") return saved;
    }
    return "blue";
  });

  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("demo5-theme-mode");
      if (saved === "light" || saved === "dark" || saved === "system") return saved;
    }
    return "light";
  });

  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => {
      if (mode === "light") {
        setResolvedMode("light");
        return;
      }
      if (mode === "dark") {
        setResolvedMode("dark");
        return;
      }
      const mm = window.matchMedia?.("(prefers-color-scheme: dark)");
      setResolvedMode(mm?.matches ? "dark" : "light");
    };

    apply();
    const mm = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = () => apply();
    mm?.addEventListener?.("change", onChange);
    return () => mm?.removeEventListener?.("change", onChange);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem("demo5-theme", themeId);
  }, [themeId]);

  useEffect(() => {
    localStorage.setItem("demo5-theme-mode", mode);
  }, [mode]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", resolvedMode === "dark");
  }, [resolvedMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const prev = {
      bg: root.style.getPropertyValue("--bg"),
      fg: root.style.getPropertyValue("--fg"),
      border: root.style.getPropertyValue("--border"),
      card: root.style.getPropertyValue("--card"),
      muted: root.style.getPropertyValue("--muted"),
    };

    if (resolvedMode === "dark") {
      root.style.setProperty("--bg", "2 6 23");
      root.style.setProperty("--fg", "226 232 240");
      root.style.setProperty("--border", "51 65 85");
      root.style.setProperty("--card", "15 23 42");
      root.style.setProperty("--muted", "148 163 184");
    } else {
      root.style.setProperty("--bg", "250 247 240");
      root.style.setProperty("--fg", "24 24 27");
      root.style.setProperty("--border", "228 228 231");
      root.style.setProperty("--card", "255 255 255");
      root.style.setProperty("--muted", "113 113 122");
    }

    return () => {
      root.style.setProperty("--bg", prev.bg);
      root.style.setProperty("--fg", prev.fg);
      root.style.setProperty("--border", prev.border);
      root.style.setProperty("--card", prev.card);
      root.style.setProperty("--muted", prev.muted);
    };
  }, [resolvedMode]);

  const base = THEMES[themeId];
  const theme: ThemeConfig =
    resolvedMode === "dark"
      ? {
          ...base,
          headerBg: "bg-slate-900/80",
          headerBorder: "border-slate-800",
          divider: "border-slate-800",
          bg: "bg-slate-950",
        }
      : base;

  return (
    <ThemeContext.Provider value={{ theme, themeId, setThemeId, mode, setMode, resolvedMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
