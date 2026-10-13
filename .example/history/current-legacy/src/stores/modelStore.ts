"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ModelDetail {
  id: string;
  name: string;
  slug: string;
  description?: string;
  vendor: {
    id: string;
    name: string;
    logo?: string;
    website?: string;
  };
  modelType: string;
  isOpenSource: boolean;
  parameters?: string;
  contextWindow?: string;
  pricing?: {
    inputPrice: number;
    outputPrice: number;
    cachePrice?: number;
    unit: string;
  };
  benchmarks: Array<{
    name: string;
    score: number;
    rank?: number;
  }>;
  capabilities: string[];
  releaseDate?: string;
  lastUpdated?: string;
}

export interface ModelState {
  // 当前查看的模型
  currentModel: ModelDetail | null;
  
  // 浏览历史
  viewHistory: string[];
  
  // 最近查看的模型列表
  recentModels: ModelDetail[];
  
  // 缓存的模型数据
  modelCache: Map<string, ModelDetail>;
  
  // Actions
  setCurrentModel: (model: ModelDetail | null) => void;
  addToHistory: (modelId: string) => void;
  addToRecent: (model: ModelDetail) => void;
  clearHistory: () => void;
  cacheModel: (model: ModelDetail) => void;
  getCachedModel: (id: string) => ModelDetail | undefined;
  clearCache: () => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      currentModel: null,
      viewHistory: [],
      recentModels: [],
      modelCache: new Map(),

      setCurrentModel: (model) => set({ currentModel: model }),

      addToHistory: (modelId) =>
        set((state) => ({
          viewHistory: [modelId, ...state.viewHistory.filter((id) => id !== modelId)].slice(0, 50),
        })),

      addToRecent: (model) =>
        set((state) => ({
          recentModels: [model, ...state.recentModels.filter((m) => m.id !== model.id)].slice(0, 10),
        })),

      clearHistory: () => set({ viewHistory: [], recentModels: [] }),

      cacheModel: (model) =>
        set((state) => {
          const newCache = new Map(state.modelCache);
          newCache.set(model.id, model);
          // 限制缓存大小
          if (newCache.size > 100) {
            const firstKey = newCache.keys().next().value;
            newCache.delete(firstKey);
          }
          return { modelCache: newCache };
        }),

      getCachedModel: (id) => get().modelCache.get(id),

      clearCache: () => set({ modelCache: new Map() }),
    }),
    {
      name: "aidean-model-storage",
      partialize: (state) => ({
        viewHistory: state.viewHistory,
        recentModels: state.recentModels,
      }),
    }
  )
);
