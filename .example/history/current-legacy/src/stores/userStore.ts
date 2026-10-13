"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  nickname?: string;
  avatar?: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  balance: number;
  createdAt: string;
}

export interface UserState {
  // 状态
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  login: (user: UserProfile) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updateBalance: (delta: number) => void;

  // Getters
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
}

const initialState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      login: (user) =>
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        }),

      logout: () =>
        set({
          ...initialState,
          isLoading: false,
        }),

      updateProfile: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      updateBalance: (delta) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, balance: state.user.balance + delta }
            : null,
        })),

      hasPermission: () => {
        const { user } = get();
        if (!user) return false;
        // SUPER_ADMIN拥有所有权限
        if (user.role === "SUPER_ADMIN") return true;
        // ADMIN有管理权限
        if (user.role === "ADMIN") return true;
        // 普通用户权限检查简化版
        return false;
      },

      isAdmin: () => {
        const { user } = get();
        return user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
      },
    }),
    {
      name: "aidean-user-storage",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
