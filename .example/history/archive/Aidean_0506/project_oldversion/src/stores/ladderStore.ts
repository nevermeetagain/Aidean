"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LadderFilter {
  modelType?: string[];
  protocol?: string[];
  isOpenSource?: boolean | null;
  vendor?: string[];
  tags?: string[];
  benchmark?: string;
  dateRange?: { start?: string; end?: string };
}

export interface LadderSort {
  field: string;
  order: "asc" | "desc";
}

export interface CompareModel {
  id: string;
  name: string;
  vendor: string;
  score: number;
}

export interface LadderState {
  // 筛选状态
  filters: LadderFilter;
  activeFilterCount: number;

  // 排序状态
  sort: LadderSort;

  // 对比模型列表（测评车）
  compareList: CompareModel[];
  maxCompareCount: number;

  // 收藏模型
  favorites: string[];

  // 展开/折叠状态
  expandedVendors: string[];

  // Actions - Filter
  setFilter: <K extends keyof LadderFilter>(key: K, value: LadderFilter[K]) => void;
  resetFilters: () => void;
  clearFilter: (key: keyof LadderFilter) => void;

  // Actions - Sort
  setSort: (field: string, order?: "asc" | "desc") => void;
  toggleSort: (field: string) => void;

  // Actions - Compare
  addToCompare: (model: CompareModel) => boolean;
  removeFromCompare: (modelId: string) => void;
  clearCompare: () => void;
  isInCompare: (modelId: string) => boolean;

  // Actions - Favorites
  toggleFavorite: (modelId: string) => void;
  isFavorite: (modelId: string) => boolean;

  // Actions - Expand
  toggleVendorExpand: (vendor: string) => void;
  isVendorExpanded: (vendor: string) => boolean;
}

const defaultFilters: LadderFilter = {
  modelType: [],
  protocol: [],
  isOpenSource: null,
  vendor: [],
  tags: [],
  benchmark: undefined,
  dateRange: undefined,
};

const defaultSort: LadderSort = {
  field: "overallScore",
  order: "desc",
};

export const useLadderStore = create<LadderState>()(
  persist(
    (set, get) => ({
      filters: { ...defaultFilters },
      activeFilterCount: 0,
      sort: { ...defaultSort },
      compareList: [],
      maxCompareCount: 5,
      favorites: [],
      expandedVendors: [],

      setFilter: (key, value) =>
        set((state) => {
          const newFilters = { ...state.filters, [key]: value };
          const activeCount = Object.entries(newFilters).filter(
            ([k, v]) =>
              v !== undefined &&
              v !== null &&
              v !== "" &&
              (Array.isArray(v) ? v.length > 0 : true)
          ).length;
          return { filters: newFilters, activeFilterCount: activeCount };
        }),

      resetFilters: () =>
        set({
          filters: { ...defaultFilters },
          activeFilterCount: 0,
        }),

      clearFilter: (key) =>
        set((state) => {
          const newFilters = { ...state.filters, [key]: undefined };
          const activeCount = Object.entries(newFilters).filter(
            ([, v]) =>
              v !== undefined &&
              v !== null &&
              v !== "" &&
              (Array.isArray(v) ? v.length > 0 : true)
          ).length;
          return { filters: newFilters, activeFilterCount: activeCount };
        }),

      setSort: (field, order) =>
        set({
          sort: { field, order: order || "desc" },
        }),

      toggleSort: (field) =>
        set((state) => ({
          sort: {
            field,
            order: state.sort.field === field && state.sort.order === "desc" ? "asc" : "desc",
          },
        })),

      addToCompare: (model) => {
        const { compareList, maxCompareCount } = get();
        if (compareList.length >= maxCompareCount) {
          return false;
        }
        if (compareList.some((m) => m.id === model.id)) {
          return true;
        }
        set({ compareList: [...compareList, model] });
        return true;
      },

      removeFromCompare: (modelId) =>
        set((state) => ({
          compareList: state.compareList.filter((m) => m.id !== modelId),
        })),

      clearCompare: () => set({ compareList: [] }),

      isInCompare: (modelId) => get().compareList.some((m) => m.id === modelId),

      toggleFavorite: (modelId) =>
        set((state) => ({
          favorites: state.favorites.includes(modelId)
            ? state.favorites.filter((id) => id !== modelId)
            : [...state.favorites, modelId],
        })),

      isFavorite: (modelId) => get().favorites.includes(modelId),

      toggleVendorExpand: (vendor) =>
        set((state) => ({
          expandedVendors: state.expandedVendors.includes(vendor)
            ? state.expandedVendors.filter((v) => v !== vendor)
            : [...state.expandedVendors, vendor],
        })),

      isVendorExpanded: (vendor) => get().expandedVendors.includes(vendor),
    }),
    {
      name: "aidean-ladder-storage",
      partialize: (state) => ({
        filters: state.filters,
        sort: state.sort,
        favorites: state.favorites,
        expandedVendors: state.expandedVendors,
      }),
    }
  )
);
