"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  name: string;
  type: "model" | "skill" | "mcp" | "agent";
  vendor?: string;
  price?: number;
  icon?: string;
  addedAt: number;
}

export interface CartState {
  // 测评车中的项目
  items: CartItem[];
  
  // 最大容量
  maxItems: number;
  
  // 是否已展开悬浮面板
  isExpanded: boolean;
  
  // 添加历史（防止重复添加）
  addHistory: string[];
  
  // Actions
  addItem: (item: Omit<CartItem, "addedAt">) => { success: boolean; message?: string };
  removeItem: (id: string) => void;
  clearCart: () => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
  toggleExpanded: () => void;
  setExpanded: (expanded: boolean) => void;
  isInCart: (id: string) => boolean;
  canAddMore: () => boolean;
  getItemCount: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      maxItems: 5,
      isExpanded: false,
      addHistory: [],

      addItem: (item) => {
        const { items, maxItems, addHistory } = get();
        
        // 检查是否已满
        if (items.length >= maxItems) {
          return { success: false, message: `测评车已满，最多${maxItems}个模型` };
        }
        
        // 检查是否已存在
        if (items.some((i) => i.id === item.id)) {
          return { success: false, message: "该模型已在测评车中" };
        }
        
        // 添加到测评车
        const newItem: CartItem = {
          ...item,
          addedAt: Date.now(),
        };
        
        set({
          items: [...items, newItem],
          addHistory: [item.id, ...addHistory.filter((id) => id !== item.id)].slice(0, 20),
        });
        
        return { success: true };
      },

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      clearCart: () => set({ items: [], isExpanded: false }),

      moveItem: (fromIndex, toIndex) =>
        set((state) => {
          const items = [...state.items];
          const [moved] = items.splice(fromIndex, 1);
          items.splice(toIndex, 0, moved);
          return { items };
        }),

      toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),

      setExpanded: (expanded) => set({ isExpanded: expanded }),

      isInCart: (id) => get().items.some((item) => item.id === id),

      canAddMore: () => get().items.length < get().maxItems,

      getItemCount: () => get().items.length,

      getTotalPrice: () => {
        return get().items.reduce((sum, item) => sum + (item.price || 0), 0);
      },
    }),
    {
      name: "aidean-cart-storage",
      partialize: (state) => ({
        items: state.items,
        addHistory: state.addHistory,
      }),
    }
  )
);
