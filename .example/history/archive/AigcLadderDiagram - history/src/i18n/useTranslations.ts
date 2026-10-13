"use client";

import { useSiteLang } from "@/lib/siteLang";
import { getTranslations } from "./index";

export function useTranslations() {
  const { lang } = useSiteLang();
  return getTranslations(lang);
}
