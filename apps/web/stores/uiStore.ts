import { create } from "zustand";

export type ThemeName = "indigo" | "teal" | "orange";
export type Lang = "zh" | "en";

export const THEME_STORAGE_KEY = "aidean-theme";
export const LANG_STORAGE_KEY = "aidean-lang";

const VALID_THEMES: readonly ThemeName[] = ["indigo", "teal", "orange"];

interface UiState {
  theme: ThemeName;
  lang: Lang;
  setTheme: (theme: ThemeName) => void;
  setLang: (lang: Lang) => void;
}

const safeStorageGet = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeStorageSet = (key: string, value: string): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* 存储不可用时静默降级：仅内存态生效 */
  }
};

export const useUiStore = create<UiState>()((set) => ({
  theme: "teal",
  lang: "zh",
  setTheme: (theme) => {
    set({ theme });
    safeStorageSet(THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
  },
  setLang: (lang) => {
    set({ lang });
    safeStorageSet(LANG_STORAGE_KEY, lang);
  },
}));

/**
 * 客户端挂载后从 localStorage 回填持久化状态。
 * 返回是否命中有效已存值。
 */
export function hydrateUiFromStorage(): boolean {
  const stored = safeStorageGet(THEME_STORAGE_KEY);
  if (stored && (VALID_THEMES as readonly string[]).includes(stored)) {
    useUiStore.setState({ theme: stored as ThemeName });
    document.documentElement.dataset.theme = stored;
    return true;
  }
  return false;
}
