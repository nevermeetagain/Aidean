/**
 * 客户端会话单一真源（B11-06 · DEF-011-08 · Q-11-02=B「不改 /auth/me 契约，客户端收敛」）。
 *
 * 职责：所有「我是否登录 / 我是谁」的客户端读取一律经由本 store，不再各自 fetch `/api/v1/auth/me`。
 *
 * 判定顺序（逐级短路，前一级可定案就不发网络）：
 *   1. 已定案（authenticated / anonymous）→ 直接返回缓存快照（SPA 内跨页、跨组件复用）。
 *   2. 无提示 Cookie（`aidean_session_hint`，由 middleware 依 HttpOnly 令牌 Cookie 是否存在镜像，见
 *      session-hint.ts）→ **直接定案 anonymous，零请求**。这是游客 401 归零的关键：游客没有令牌 Cookie，
 *      middleware 不会写提示，客户端根本不探测。
 *   3. 有提示 → 发**一次** `/auth/me`（模块级单飞：N 个并发消费者共享同一 Promise）。
 *      200 → authenticated；401/403 → 先尝试一次静默续期（access 15min 过期而 refresh 仍有效的常见态），
 *      续期成功再探一次，否则 anonymous；5xx/网络异常 → anonymous + `degraded`（下次聚焦重试）。
 *
 * 失效与同步：
 *   - `markLoggedIn()` / `markLoggedOut()`：登录/登出流程显式调用，写/删提示 Cookie、置态、广播。
 *   - 跨标签页：BroadcastChannel（`aidean.session`）优先，`storage` 事件兜底；收到 login → 重新探测，
 *     收到 logout → 本地直接置 anonymous（零请求）。
 *   - 聚焦/可见性：只在「提示 Cookie 与已知态矛盾」或「已登录态超过 staleMs」时才探测——替代原 SWR
 *     `revalidateOnFocus` 的无差别重发，游客聚焦同样零请求。
 *   - 代际计数 `generation`：登出/登录发生在探测飞行中时，丢弃过期结果，杜绝回写旧态。
 *
 * 可扩展：`onTransition` 让其他「仅登录用户」的数据层（收藏、配额…）在登录/登出/换号时重置自身；
 * `whenSettled()` 让它们在发请求前先拿到定案态（已知匿名即跳过探针）。
 *
 * 本模块框架无关（无 React 依赖），React 绑定见 `hooks/useSession.ts`；依赖全部可注入以便单测。
 */
import { refreshSession } from "./client-refresh";
import { hasSessionHint, writeSessionHintCookie } from "./session-hint";

export const AUTH_ME_URL = "/api/v1/auth/me";
export const SESSION_CHANNEL = "aidean.session";
export const SESSION_STORAGE_EVENT_KEY = "aidean.session.event";
/** 已登录态的「新鲜期」：超过后聚焦才静默复核一次（返回 200，不产生红字） */
export const DEFAULT_SESSION_STALE_MS = 5 * 60 * 1000;

export interface SessionUser {
  id: string | null;
  email: string | null;
  nickname: string | null;
  tier: string | null;
}

export type SessionStatus = "unknown" | "loading" | "anonymous" | "authenticated";

export interface SessionSnapshot {
  status: SessionStatus;
  user: SessionUser | null;
  /** 最近一次定案时间（ms）；未定案为 null */
  checkedAt: number | null;
  /** 定案依据：hint=无提示 Cookie 直接判匿名 / probe=auth/me / event=登录登出或跨标签广播 / seed=服务端注入 */
  source: "hint" | "probe" | "event" | "seed" | null;
  /** 探测因 5xx/网络失败而回落匿名（非权威结论，聚焦时重试） */
  degraded: boolean;
}

export type SettledSnapshot = SessionSnapshot & { status: "anonymous" | "authenticated" };

type CrossTabMessage = { type: "login" | "logout"; from: string; at: number };

interface ChannelLike {
  postMessage(msg: unknown): void;
  close(): void;
  onmessage: ((ev: { data: unknown }) => void) | null;
}

interface StorageLike {
  setItem(key: string, value: string): void;
}

interface EventTargetLike {
  addEventListener(type: string, fn: (ev: unknown) => void): void;
  removeEventListener(type: string, fn: (ev: unknown) => void): void;
}

export interface SessionStoreDeps {
  fetch?: typeof fetch;
  /** 读 document.cookie（无 DOM 时返回 ""） */
  readCookie?: () => string;
  /** 写/删提示 Cookie */
  writeHint?: (present: boolean) => void;
  /** 静默续期（默认 client-refresh.refreshSession：同 tab 单飞 + 跨 tab 锁） */
  refresh?: () => Promise<boolean>;
  /** BroadcastChannel 工厂；返回 null 时走 storage 兜底 */
  channelFactory?: (name: string) => ChannelLike | null;
  storage?: StorageLike | null;
  /** 承载 focus / storage 事件的对象（window） */
  windowTarget?: EventTargetLike | null;
  /** 承载 visibilitychange 的对象（document） */
  documentTarget?: (EventTargetLike & { visibilityState?: string }) | null;
  now?: () => number;
  staleMs?: number;
  tabId?: string;
}

export type TransitionListener = (next: SessionSnapshot, prev: SessionSnapshot) => void;

export interface SessionStore {
  getSnapshot(): SessionSnapshot;
  /** SSR/首帧固定快照（unknown），供 useSyncExternalStore 的 getServerSnapshot */
  getServerSnapshot(): SessionSnapshot;
  subscribe(fn: () => void): () => void;
  /** 定案（必要时探测一次）；并发调用共享同一飞行 Promise */
  ensure(): Promise<SettledSnapshot>;
  /** 同 ensure，语义化别名：供「仅登录用户」数据层在发请求前等待定案 */
  whenSettled(): Promise<SettledSnapshot>;
  /** 复核：force=true 时（有提示前提下）无视缓存重探；无提示恒零请求判匿名 */
  revalidate(opts?: { force?: boolean }): Promise<SettledSnapshot>;
  /**
   * 登录成功：写提示、广播 login。传入 user（登录响应体自带）则直接定案、不再探测；
   * 否则置 unknown，`probe=false` 时（调用方随即整页跳转）不发请求，交给下一页首个消费者探测——
   * 避免跳转中被中止的请求在网络面板里留下 ERR_ABORTED。
   */
  markLoggedIn(user?: unknown, opts?: { probe?: boolean }): Promise<SessionSnapshot>;
  /** 登出：删提示、置 anonymous、广播（零请求） */
  markLoggedOut(): void;
  /** 服务端已知会话时注入（例如受 requireUser 守卫的页面），跳过首探 */
  seed(user: SessionUser | null): void;
  /** 登录态切换（匿名↔登录、换号）监听 */
  onTransition(fn: TransitionListener): () => void;
  /** 安装跨标签与聚焦监听（幂等，返回卸载函数） */
  connect(): () => void;
  /** 仅测试：回到初始态并断开监听 */
  reset(): void;
}

const UNKNOWN: SessionSnapshot = {
  status: "unknown",
  user: null,
  checkedAt: null,
  source: null,
  degraded: false,
};

function isSettled(s: SessionSnapshot): s is SettledSnapshot {
  return s.status === "anonymous" || s.status === "authenticated";
}

function normalizeUser(raw: unknown): SessionUser | null {
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  return { id: str(u.id), email: str(u.email), nickname: str(u.nickname), tier: str(u.tier) };
}

function identityOf(s: SessionSnapshot): string {
  if (s.status !== "authenticated") return s.status === "anonymous" ? "anon" : "pending";
  return `user:${s.user?.id ?? "?"}`;
}

function defaultDeps(): Required<Omit<SessionStoreDeps, "staleMs" | "tabId">> {
  const hasWindow = typeof window !== "undefined";
  const hasDocument = typeof document !== "undefined";
  return {
    fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
    readCookie: () => (hasDocument ? document.cookie : ""),
    writeHint: (present) => writeSessionHintCookie(hasDocument ? document : undefined, present),
    refresh: refreshSession,
    channelFactory: (name) =>
      typeof BroadcastChannel !== "undefined" ? (new BroadcastChannel(name) as unknown as ChannelLike) : null,
    storage: hasWindow ? safeLocalStorage() : null,
    windowTarget: hasWindow ? (window as unknown as EventTargetLike) : null,
    documentTarget: hasDocument ? (document as unknown as EventTargetLike & { visibilityState?: string }) : null,
    now: () => Date.now(),
  };
}

function safeLocalStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null; // 隐私模式/禁用存储
  }
}

export function createSessionStore(overrides: SessionStoreDeps = {}): SessionStore {
  const base = defaultDeps();
  const deps = { ...base, ...overrides };
  const staleMs = overrides.staleMs ?? DEFAULT_SESSION_STALE_MS;
  const tabId = overrides.tabId ?? Math.random().toString(36).slice(2);

  let snapshot: SessionSnapshot = UNKNOWN;
  let inflight: Promise<SettledSnapshot> | null = null;
  let generation = 0;
  const listeners = new Set<() => void>();
  const transitionListeners = new Set<TransitionListener>();
  let disconnect: (() => void) | null = null;
  let channel: ChannelLike | null = null;

  function setSnapshot(next: SessionSnapshot): void {
    const prev = snapshot;
    snapshot = next;
    for (const fn of listeners) fn();
    if (isSettled(next) && identityOf(prev) !== identityOf(next)) {
      for (const fn of transitionListeners) fn(next, prev);
    }
  }

  function settle(
    status: "anonymous" | "authenticated",
    user: SessionUser | null,
    source: SessionSnapshot["source"],
    degraded = false,
  ): SettledSnapshot {
    const next: SettledSnapshot = { status, user, checkedAt: deps.now(), source, degraded };
    setSnapshot(next);
    return next;
  }

  const hintPresent = () => hasSessionHint(deps.readCookie());

  async function fetchMe(): Promise<{ status: number; user: SessionUser | null }> {
    const res = await deps.fetch(AUTH_ME_URL, { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) return { status: res.status, user: null };
    const body = (await res.json().catch(() => null)) as { data?: { user?: unknown } } | null;
    return { status: res.status, user: normalizeUser(body?.data?.user) };
  }

  function probe(): Promise<SettledSnapshot> {
    if (inflight) return inflight;
    const gen = generation;
    if (!isSettled(snapshot)) setSnapshot({ ...snapshot, status: "loading" });
    const run = (async (): Promise<SettledSnapshot> => {
      try {
        let r = await fetchMe();
        if (r.status === 401 || r.status === 403) {
          // access 过期而 refresh 仍有效是常态：续期成功后再探一次（同 tab 单飞 + 跨 tab 锁由 refreshSession 保证）
          const refreshed = await deps.refresh().catch(() => false);
          if (gen !== generation) return currentSettledOr("anonymous");
          if (refreshed) r = await fetchMe();
        }
        if (gen !== generation) return currentSettledOr("anonymous");
        if (r.status >= 200 && r.status < 300 && r.user) return settle("authenticated", r.user, "probe");
        if (r.status === 401 || r.status === 403) return settle("anonymous", null, "probe");
        return settle("anonymous", null, "probe", true);
      } catch {
        if (gen !== generation) return currentSettledOr("anonymous");
        return settle("anonymous", null, "probe", true);
      }
    })();
    inflight = run;
    void run.finally(() => {
      if (inflight === run) inflight = null;
    });
    return run;
  }

  /** 飞行中态被事件改写时，返回事件写入的定案态（而不是过期探测结果） */
  function currentSettledOr(fallback: "anonymous"): SettledSnapshot {
    if (isSettled(snapshot)) return snapshot;
    return settle(fallback, null, "event");
  }

  function ensure(): Promise<SettledSnapshot> {
    if (isSettled(snapshot)) return Promise.resolve(snapshot);
    if (inflight) return inflight;
    if (!hintPresent()) return Promise.resolve(settle("anonymous", null, "hint"));
    return probe();
  }

  function revalidate(opts: { force?: boolean } = {}): Promise<SettledSnapshot> {
    if (!hintPresent()) {
      if (snapshot.status === "anonymous" && !snapshot.degraded) return Promise.resolve(snapshot as SettledSnapshot);
      generation++;
      inflight = null;
      return Promise.resolve(settle("anonymous", null, "hint"));
    }
    if (inflight) return inflight;
    const stale =
      snapshot.status === "authenticated" && snapshot.checkedAt !== null && deps.now() - snapshot.checkedAt >= staleMs;
    const contradicted = snapshot.status === "anonymous" && (snapshot.source === "hint" || snapshot.degraded);
    if (opts.force || !isSettled(snapshot) || stale || contradicted) return probe();
    return Promise.resolve(snapshot as SettledSnapshot);
  }

  function broadcast(type: CrossTabMessage["type"]): void {
    const msg: CrossTabMessage = { type, from: tabId, at: deps.now() };
    try {
      if (channel) channel.postMessage(msg);
      else deps.storage?.setItem(SESSION_STORAGE_EVENT_KEY, JSON.stringify(msg));
    } catch {
      // 广播 best-effort：失败时其他标签页仍会在聚焦时依提示 Cookie 自愈
    }
  }

  function handleCrossTab(raw: unknown): void {
    const msg = raw as Partial<CrossTabMessage> | null;
    if (!msg || msg.from === tabId) return;
    if (msg.type === "logout") {
      generation++;
      inflight = null;
      settle("anonymous", null, "event");
    } else if (msg.type === "login") {
      generation++;
      inflight = null;
      setSnapshot({ ...UNKNOWN });
      void ensure();
    }
  }

  function onFocusLike(): void {
    if (deps.documentTarget?.visibilityState === "hidden") return;
    if (!isSettled(snapshot)) return; // 尚无人消费会话，或首探在飞：不额外触发
    void revalidate();
  }

  const store: SessionStore = {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => UNKNOWN,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    ensure,
    whenSettled: ensure,
    revalidate,
    async markLoggedIn(user, opts = {}) {
      deps.writeHint(true);
      generation++;
      inflight = null;
      broadcast("login");
      const known = normalizeUser(user);
      if (known) return settle("authenticated", known, "event");
      setSnapshot({ ...UNKNOWN });
      if (opts.probe === false) return snapshot;
      return ensure();
    },
    markLoggedOut() {
      deps.writeHint(false);
      generation++;
      inflight = null;
      settle("anonymous", null, "event");
      broadcast("logout");
    },
    seed(user) {
      generation++;
      inflight = null;
      if (user) settle("authenticated", user, "seed");
      else settle("anonymous", null, "seed");
    },
    onTransition(fn) {
      transitionListeners.add(fn);
      return () => transitionListeners.delete(fn);
    },
    connect() {
      if (disconnect) return disconnect;
      try {
        channel = deps.channelFactory(SESSION_CHANNEL);
      } catch {
        channel = null;
      }
      if (channel) channel.onmessage = (ev) => handleCrossTab(ev.data);
      const onStorage = (ev: unknown) => {
        const e = ev as { key?: string | null; newValue?: string | null };
        if (e.key !== SESSION_STORAGE_EVENT_KEY || !e.newValue) return;
        try {
          handleCrossTab(JSON.parse(e.newValue));
        } catch {
          /* 非本协议写入 */
        }
      };
      const onVisibility = () => onFocusLike();
      const onFocus = () => onFocusLike();
      // storage 兜底总是装上：BroadcastChannel 不可用的旧环境由它接管；可用时对端只走 channel，不会双触发
      deps.windowTarget?.addEventListener("storage", onStorage);
      deps.windowTarget?.addEventListener("focus", onFocus);
      deps.documentTarget?.addEventListener("visibilitychange", onVisibility);
      disconnect = () => {
        deps.windowTarget?.removeEventListener("storage", onStorage);
        deps.windowTarget?.removeEventListener("focus", onFocus);
        deps.documentTarget?.removeEventListener("visibilitychange", onVisibility);
        try {
          channel?.close();
        } catch {
          /* ignore */
        }
        channel = null;
        disconnect = null;
      };
      return disconnect;
    },
    reset() {
      disconnect?.();
      generation++;
      inflight = null;
      snapshot = UNKNOWN;
      listeners.clear();
      transitionListeners.clear();
    },
  };
  return store;
}

/** 进程（浏览器标签页）级单例：全站唯一会话真源 */
export const sessionStore: SessionStore = createSessionStore();
