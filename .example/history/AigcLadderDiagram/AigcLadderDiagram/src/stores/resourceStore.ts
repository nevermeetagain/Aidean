"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ResourceType = "skill" | "mcp" | "agent" | "news" | "scenario";

export interface ResourceFilter {
  type?: ResourceType;
  category?: string;
  protocol?: string;
  tags?: string[];
  isRecommended?: boolean;
  searchQuery?: string;
}

export interface ResourceState {
  // 当前资源类型
  activeType: ResourceType;
  
  // 筛选状态
  filter: ResourceFilter;
  
  // 排序
  sortBy: "newest" | "popular" | "name" | "rating";
  
  // 视图模式
  viewMode: "grid" | "list";
  
  // 分页
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  
  // 收藏的资源ID列表
  favorites: string[];
  
  // Actions
  setActiveType: (type: ResourceType) => void;
  setFilter: (filter: Partial<ResourceFilter>) => void;
  resetFilter: () => void;
  setSortBy: (sort: ResourceState["sortBy"]) => void;
  setViewMode: (mode: "grid" | "list") => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

const defaultFilter: ResourceFilter = {
  type: undefined,
  category: undefined,
  protocol: undefined,
  tags: [],
  isRecommended: undefined,
  searchQuery: "",
};

export const useResourceStore = create<ResourceState>()(
  persist(
    (set, get) => ({
      activeType: "skill",
      filter: { ...defaultFilter },
      sortBy: "newest",
      viewMode: "grid",
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
      },
      favorites: [],

      setActiveType: (type) =>
        set({
          activeType: type,
          filter: { ...defaultFilter, type },
          pagination: { ...get().pagination, page: 1 },
        }),

      setFilter: (filter) =>
        set((state) => ({
          filter: { ...state.filter, ...filter },
          pagination: { ...state.pagination, page: 1 },
        })),

      resetFilter: () =>
        set((state) => ({
          filter: { ...defaultFilter, type: state.activeType },
          pagination: { ...state.pagination, page: 1 },
        })),

      setSortBy: (sortBy) => set({ sortBy }),

      setViewMode: (viewMode) => set({ viewMode }),

      setPage: (page) =>
        set((state) => ({
          pagination: { ...state.pagination, page },
        })),

      setLimit: (limit) =>
        set((state) => ({
          pagination: { ...state.pagination, limit, page: 1 },
        })),

      toggleFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((fav) => fav !== id)
            : [...state.favorites, id],
        })),

      isFavorite: (id) => get().favorites.includes(id),
    }),
    {
      name: "aidean-resource-storage",
      partialize: (state) => ({
        favorites: state.favorites,
        viewMode: state.viewMode,
        sortBy: state.sortBy,
      }),
    }
  )
);
