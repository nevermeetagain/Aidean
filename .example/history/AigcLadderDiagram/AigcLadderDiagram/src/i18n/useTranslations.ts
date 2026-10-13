"use client";

import { useState } from "react";

export function useTranslations() {
  const [lang, setLang] = useState<"zh" | "en">("zh");
  return { lang, setLang, t: (key: string) => key };
}
