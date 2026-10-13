"use client";

import { create } from "zustand";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
}

export interface NotificationState {
  // 通知列表
  notifications: Notification[];
  
  // 最大显示数量
  maxNotifications: number;
  
  // Actions
  addNotification: (notification: Omit<Notification, "id" | "createdAt">) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  
  // 快捷方法
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  maxNotifications: 5,

  addNotification: (notification) => {
    const id = generateId();
    const newNotification: Notification = {
      ...notification,
      id,
      createdAt: Date.now(),
      duration: notification.duration ?? 5000,
    };

    set((state) => {
      const notifications = [newNotification, ...state.notifications].slice(
        0,
        state.maxNotifications
      );
      return { notifications };
    });

    // 自动移除
    const duration = newNotification.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, duration);
    }

    return id;
  },

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearAll: () => set({ notifications: [] }),

  success: (title, message, duration = 3000) =>
    get().addNotification({ type: "success", title, message, duration }),

  error: (title, message, duration = 5000) =>
    get().addNotification({ type: "error", title, message, duration }),

  warning: (title, message, duration = 4000) =>
    get().addNotification({ type: "warning", title, message, duration }),

  info: (title, message, duration = 3000) =>
    get().addNotification({ type: "info", title, message, duration }),
}));
