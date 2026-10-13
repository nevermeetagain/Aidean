/**
 * compareStore：对比测评「暂存篮」（zustand + localStorage）。
 *
 * 关键决策：
 * - localStorage 键 aidean.compare.dock，上限 6（对齐 EVALUATION_LIMITS.MAX_MODELS），按加入序去重；
 * - 客户端挂载后 hydrate（防 SSR 首屏闪烁：不预载存储态，全部由按钮事件驱动写回）；
 * - 元素形状 { modelId, nameDisplay, slug }——slug 供详情页链接，nameDisplay 供 Dock 显示。
 */
import { create } from "zustand";
import { EVALUATION_LIMITS } from "../lib/features/evaluation/types";

export const COMPARE_STORAGE_KEY = "aidean.compare.dock";

export interface CompareItem {
  modelId: string;
  nameDisplay: string;
  slug: string | null;
}

interface CompareState {
  items: CompareItem[];
  /** 加入（去重，上限 6；返回是否成功） */
  toggle: (item: CompareItem) => boolean;
  remove: (modelId: string) => void;
  clear: () => void;
}

const safeStorageGet = (): CompareItem[] | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (p): p is CompareItem =>
        !!p && typeof p === "object" && typeof (p as CompareItem).modelId === "string"
    );
  } catch {
    return null;
  }
};

const safeStorageSet = (items: CompareItem[]): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* 存储不可用：仅内存态生效 */
  }
};

export const useCompareStore = create<CompareState>()((set, get) => ({
  items: [],
  toggle(item) {
    const { items } = get();
    if (items.some((i) => i.modelId === item.modelId)) {
      const next = items.filter((i) => i.modelId !== item.modelId);
      set({ items: next });
      safeStorageSet(next);
      return true;
    }
    if (items.length >= EVALUATION_LIMITS.MAX_MODELS) return false;
    const next = [...items, item];
    set({ items: next });
    safeStorageSet(next);
    return true;
  },
  remove(modelId) {
    const next = get().items.filter((i) => i.modelId !== modelId);
    set({ items: next });
    safeStorageSet(next);
  },
  clear() {
    set({ items: [] });
    safeStorageSet([]);
  },
}));

/** 客户端挂载后回填持久化（在 ClientBoundary/useEffect 中调用一次） */
export function hydrateCompareFromStorage(): void {
  const stored = safeStorageGet();
  if (stored) useCompareStore.setState({ items: stored });
}
