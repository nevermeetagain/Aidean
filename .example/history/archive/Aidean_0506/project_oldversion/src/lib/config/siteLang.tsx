"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type SiteLang = "zh" | "en" | "ja";

interface SiteLangContextType {
  lang: SiteLang;
  setLang: (l: SiteLang) => void;
}

const SiteLangContext = createContext<SiteLangContextType | null>(null);

export function SiteLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<SiteLang>("zh");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("site-lang");
    if (saved === "zh" || saved === "en" || saved === "ja") setLang(saved);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("site-lang", lang);
  }, [lang]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang }), [lang]);

  return <SiteLangContext.Provider value={value}>{children}</SiteLangContext.Provider>;
}

export function useSiteLang() {
  const ctx = useContext(SiteLangContext);
  if (!ctx) throw new Error("useSiteLang must be used within SiteLangProvider");
  return ctx;
}
