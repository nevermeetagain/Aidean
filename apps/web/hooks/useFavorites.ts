"use client";

/**
 * useFavorites —— 收藏客户端数据层（TASK-023 · REQ-F-13）。
 *
 * 设计（穿透约束后的裁决）：
 * - **纯客户端单一真源**：models 详情页 `revalidate=3600` ISR、ladder 页不在本卡允许清单，
 *   二者都不能注入服务端 session/flag，故按钮态一律由本模块按 `Cookie` 会话实时拉取；
 *   模块级 zustand store 在 SPA 会话内共享，收藏/取消后跨页面（详情页↔天梯↔控制台）即时一致。
 * - **受控面**：`favorites.enabled` 经公开端点 `GET /api/v1/system/features`（API-002，S2 既定口径）读取；
 *   关闭时按钮整块隐藏、控制台 Tab 隐藏（见契约⑥）。
 * - **幂等键映射**：store 以 `refType:refId → FavoriteItem.id` 记录，POST 依赖后端
 *   `@@unique[userId,refType,refId]`（返回既有 id），DELETE 走 `FavoriteItem.id`（API-007）。
 * - **乐观更新 + 回滚**：切换即时改本地映射再落库，失败回滚并按错误码归因（401→引导登录 / 20003→目标失效 / 其余→错误）。
 *
 * 复用：zustand（同 stores/compareStore 范式，本卡不新增 stores/ 文件，store 内联于此）。
 *
 * B11-06（2026-10-22，DEF-011-08 / Q-11-02=B）：登录判定改由全站会话 store（session-store.ts）给出。
 * `features` 与会话定案并行发起；**已知匿名即跳过** `GET /user/favorites`（游客不再产生该 401）。
 * 会话发生登录/登出/换号切换时清空本地映射，若此前已载入则按新身份重载（登录后收藏不回归）。
 */
import { useEffect } from "react";
import { create } from "zustand";

import type { FavoriteItem, FavoriteRefType } from "@aidean/shared";

import { sessionStore, type SessionStore } from "../lib/features/auth/session-store";

/** 收藏唯一键（前端本地映射，非后端字段） */
const favKey = (refType: FavoriteRefType, refId: string) => `${refType}:${refId}`;

interface FavoritesState {
  /** features + 收藏列表首次加载完成 */
  loaded: boolean;
  /** 正在加载（防并发重复拉取） */
  loading: boolean;
  /** favorites.enabled（默认 false，加载后置真值，避免闪现按钮） */
  enabled: boolean;
  /** 会话是否已登录（首次拉取收藏列表时的 200/401 判定） */
  authed: boolean;
  /** refType:refId → FavoriteItem.id（后端收藏行主键，供 DELETE） */
  byKey: Record<string, string>;
  /** 正在提交中的键（乐观 pending 态） */
  pending: Record<string, boolean>;
}

type FavoritesStore = FavoritesState & {
  ensureLoaded: () => Promise<void>;
  /** 回到初始态（会话切换时调用） */
  reset: () => void;
  setPending: (key: string, v: boolean) => void;
  applyCreate: (key: string, favoriteId: string) => void;
  applyDelete: (key: string) => void;
};

const initialState: FavoritesState = {
  loaded: false,
  loading: false,
  enabled: false,
  authed: false,
  byKey: {},
  pending: {},
};

/** ensureLoaded 代际计数（reset 自增） */
let loadGeneration = 0;

export const useFavoritesStore = create<FavoritesStore>()((set, get) => ({
  ...initialState,

  /** 载入受控开关 + 已登录收藏集合（幂等：loaded 或 loading 中不重复触发）。 */
  async ensureLoaded() {
    const s = get();
    if (s.loaded || s.loading) return;
    set({ loading: true });
    const session = sessionSource();
    // 载入代际：会话切换触发 reset() 后，飞行中的旧身份结果一律丢弃（不回写旧用户的收藏映射）
    const gen = loadGeneration;
    const commit = (patch: Partial<FavoritesState>) => {
      if (gen === loadGeneration) set(patch);
    };
    try {
      // ① 受控面：公开开关快照 ‖ 会话定案（并行；游客定案为零请求，见 session-store）
      const [fRes, sess] = await Promise.all([
        fetch("/api/v1/system/features", { cache: "no-store" }),
        session.whenSettled(),
      ]);
      const fBody = await fRes.json().catch(() => null);
      const enabled = !!(fBody?.data?.flags?.["favorites.enabled"] ?? false);
      if (!enabled) {
        commit({ enabled: false, authed: false, loaded: true, loading: false });
        return;
      }
      // 已知匿名：跳过 user/favorites 探针（DEF-011-08：此前游客每页一条 401）
      if (sess.status !== "authenticated") {
        commit({ enabled: true, authed: false, byKey: {}, loaded: true, loading: false });
        return;
      }
      // ② 会话收藏集合（首屏一次拉满 50 条覆盖常见量；401 视为未登录，403 视为开关已关）
      const favRes = await fetch("/api/v1/user/favorites?pageSize=50", { cache: "no-store" });
      if (favRes.status === 401) {
        // 会话 store 认定已登录但收藏端点 401（令牌恰在两次请求间过期）：按未登录处理，并让会话复核
        commit({ enabled: true, authed: false, loaded: true, loading: false });
        void session.revalidate({ force: true });
        return;
      }
      if (favRes.status === 403) {
        // 载入窗口内后台关掉开关：按关闭处理，隐藏按钮/Tab
        commit({ enabled: false, authed: false, loaded: true, loading: false });
        return;
      }
      const favBody = await favRes.json().catch(() => null);
      const items: FavoriteItem[] = Array.isArray(favBody?.data?.items) ? favBody.data.items : [];
      const byKey: Record<string, string> = {};
      for (const it of items) byKey[favKey(it.refType, it.refId)] = it.id;
      commit({ enabled: true, authed: favRes.ok, byKey, loaded: true, loading: false });
    } catch {
      // 网络/解析失败：保持 fail-open 隐藏（不阻断页面），标记 loaded 防风暴重试
      commit({ loaded: true, loading: false });
    }
  },

  reset() {
    loadGeneration++;
    set({ ...initialState });
  },
  setPending(key, v) {
    set((s) => ({ pending: { ...s.pending, [key]: v } }));
  },
  applyCreate(key, favoriteId) {
    set((s) => ({ byKey: { ...s.byKey, [key]: favoriteId } }));
  },
  applyDelete(key) {
    set((s) => {
      const next = { ...s.byKey };
      delete next[key];
      return { byKey: next };
    });
  },
}));

/** 会话来源（默认全站单例；单测可注入） */
let sessionSourceRef: SessionStore = sessionStore;
function sessionSource(): SessionStore {
  return sessionSourceRef;
}
let unbindSession: (() => void) | null = null;

/** 绑定会话切换 → 收藏状态重置/重载（模块加载即绑定全站单例；单测可改绑注入的 store） */
export function bindFavoritesToSession(store: SessionStore): () => void {
  unbindSession?.();
  sessionSourceRef = store;
  const off = store.onTransition((_next, prev) => {
    // 首次定案（unknown/loading → anonymous|authenticated）由 ensureLoaded 自身处理，不重置
    if (prev.status !== "anonymous" && prev.status !== "authenticated") return;
    const wasActive = useFavoritesStore.getState().loaded || useFavoritesStore.getState().loading;
    useFavoritesStore.getState().reset();
    // 已有消费者挂载过：按新身份重载（登录 → 拉收藏；登出 → 匿名短路，零 favorites 请求）
    if (wasActive) void useFavoritesStore.getState().ensureLoaded();
  });
  unbindSession = off;
  return off;
}
bindFavoritesToSession(sessionStore);

/** 订阅受控开关：任一收藏相关组件挂载即触发一次载入。 */
export function useFavoritesEnabled(): boolean {
  const enabled = useFavoritesStore((s) => s.enabled);
  const loaded = useFavoritesStore((s) => s.loaded);
  useEffect(() => {
    void useFavoritesStore.getState().ensureLoaded();
  }, []);
  return loaded ? enabled : false;
}

/** 订阅「是否已完成首帧载入」——区分「未加载」与「已加载但开关关闭」，避免闪现禁用态（CodeReview M-2）。 */
export function useFavoritesLoaded(): boolean {
  const loaded = useFavoritesStore((s) => s.loaded);
  useEffect(() => {
    void useFavoritesStore.getState().ensureLoaded();
  }, []);
  return loaded;
}

export interface FavoriteToggleResult {
  /** 成功切换（收藏或取消完成） */
  ok: boolean;
  /** 需引导登录（未登录 / 401） */
  needLogin: boolean;
  /** 后端错误码（如 20003 目标不存在） */
  code: number;
  /** 展示文案 */
  message: string;
}

/**
 * 单目标收藏状态与切换（FavoriteButton 用）。
 * 返回当前是否已收藏、是否提交中，以及 `toggle()`（乐观更新 + 回滚）。
 */
export function useFavoriteToggle(refType: FavoriteRefType, refId: string) {
  const key = favKey(refType, refId);
  const enabled = useFavoritesStore((s) => s.enabled);
  const loaded = useFavoritesStore((s) => s.loaded);
  const authed = useFavoritesStore((s) => s.authed);
  const active = useFavoritesStore((s) => !!s.byKey[key]);
  const pending = useFavoritesStore((s) => !!s.pending[key]);

  useEffect(() => {
    void useFavoritesStore.getState().ensureLoaded();
  }, []);

  async function toggle(): Promise<FavoriteToggleResult> {
    const store = useFavoritesStore.getState();
    if (!store.enabled) return { ok: false, needLogin: false, code: 0, message: "" };
    // 未登录：交由调用方跳登录（契约⑥ fav-login）
    if (!store.authed) return { ok: false, needLogin: true, code: 401, message: "登录后收藏" };
    // 同键提交中：早退，杜绝快速双击竞态（CodeReview M-3）
    if (store.pending[key]) return { ok: false, needLogin: false, code: 0, message: "" };

    const existingId = store.byKey[key];
    store.setPending(key, true);
    try {
      if (existingId) {
        // 取消收藏：乐观删除
        store.applyDelete(key);
        const res = await fetch(`/api/v1/user/favorites/${existingId}`, { method: "DELETE" });
        if (!res.ok) {
          store.applyCreate(key, existingId); // 回滚
          const body = await res.json().catch(() => null);
          const code = Number(body?.code ?? 0);
          return { ok: false, needLogin: res.status === 401, code, message: body?.message ?? "操作失败" };
        }
        return { ok: true, needLogin: false, code: 0, message: "" };
      }

      // 新增收藏：乐观置位（id 待后端返回）
      const res = await fetch("/api/v1/user/favorites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refType, refId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const code = Number(body?.code ?? 0);
        return {
          ok: false,
          needLogin: res.status === 401,
          code,
          message: code === 20003 ? "该目标已下线，无法收藏" : body?.message ?? "收藏失败",
        };
      }
      const item = body?.data as FavoriteItem | undefined;
      if (item?.id) store.applyCreate(key, item.id);
      return { ok: true, needLogin: false, code: 0, message: "" };
    } catch {
      // 网络/解析异常：回滚乐观删除（CodeReview M-1），POST 分支无乐观置位无需回滚
      if (existingId) store.applyCreate(key, existingId);
      return { ok: false, needLogin: false, code: 0, message: "网络异常，请稍后重试" };
    } finally {
      store.setPending(key, false);
    }
  }

  return {
    enabled: loaded ? enabled : false,
    authed,
    active,
    pending,
    toggle,
  };
}
