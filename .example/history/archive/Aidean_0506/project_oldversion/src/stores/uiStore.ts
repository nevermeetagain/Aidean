"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type ViewMode = "grid" | "list" | "table";
export type SiteThemeId = "blue" | "purple" | "green" | "orange" | "red" | "slate";

export interface UIState {
  // 主题
  themeMode: ThemeMode;
  themeId: SiteThemeId;

  // 视图模式
  viewMode: ViewMode;

  // 侧边栏
  sidebarCollapsed: boolean;

  // 全局加载
  globalLoading: boolean;
  loadingText: string;

  // 搜索
  searchQuery: string;
  searchHistory: string[];

  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  setThemeId: (id: SiteThemeId) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;
  setGlobalLoading: (loading: boolean, text?: string) => void;
  setSearchQuery: (query: string) => void;
  addSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // 默认值
      themeMode: "light",
      themeId: "blue",
      viewMode: "table",
      sidebarCollapsed: false,
      globalLoading: false,
      loadingText: "",
      searchQuery: "",
      searchHistory: [],

      // Actions
      setThemeMode: (mode) => set({ themeMode: mode }),

      setThemeId: (id) => set({ themeId: id }),

      setViewMode: (mode) => set({ viewMode: mode }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setGlobalLoading: (loading, text = "") =>
        set({ globalLoading: loading, loadingText: text }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      addSearchHistory: (query) =>
        set((state) => ({
          searchHistory: [query, ...state.searchHistory.filter((q) => q !== query)].slice(0, 10),
        })),

      clearSearchHistory: () => set({ searchHistory: [] }),
    }),
    {
      name: "aidean-ui-storage",
      partialize: (state) => ({
        themeMode: state.themeMode,
        themeId: state.themeId,
        viewMode: state.viewMode,
        sidebarCollapsed: state.sidebarCollapsed,
        searchHistory: state.searchHistory,
      }),
    }
  )
);
