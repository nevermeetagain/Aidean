/**
 * B11-06 会话 store 单测（DEF-011-08 · Q-11-02=B）。
 *
 * 覆盖：① 无提示 Cookie 零请求定案匿名 ② N 并发消费者 → 1 次 auth/me ③ 定案后跨组件/跨页复用不重发
 * ④ 401 → 续期一次 → 成功再探 / 失败匿名 ⑤ 5xx 降级 + 聚焦重试 ⑥ markLoggedIn / markLoggedOut 失效与写提示
 * ⑦ 跨标签：BroadcastChannel 与 storage 兜底两条通道 ⑧ 飞行中登出丢弃过期结果 ⑨ 聚焦复核只在矛盾/过期时发请求
 * ⑩ onTransition 只在身份切换时触发。
 */
import { describe, expect, it, vi } from "vitest";

import { COOKIE_ACCESS, COOKIE_REFRESH } from "../constants";
import {
  AUTH_ME_URL,
  SESSION_STORAGE_EVENT_KEY,
  createSessionStore,
  type SessionStoreDeps,
} from "../session-store";
import { COOKIE_SESSION_HINT, HINT_SOURCE_COOKIES, decideSessionHint, hasSessionHint } from "../session-hint";

const USER = { id: "u-1", email: "a@b.c", nickname: "Ada", tier: "PRO" };

function meOk(user = USER): Response {
  return new Response(JSON.stringify({ code: 0, message: "ok", data: { user } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
function me401(): Response {
  return new Response(JSON.stringify({ code: 10004, message: "会话无效或已过期", data: null }), { status: 401 });
}

/** 内存 EventTarget（window/document 替身） */
function makeTarget(extra: Record<string, unknown> = {}) {
  const map = new Map<string, Set<(ev: unknown) => void>>();
  return {
    ...extra,
    addEventListener(t: string, fn: (ev: unknown) => void) {
      if (!map.has(t)) map.set(t, new Set());
      map.get(t)!.add(fn);
    },
    removeEventListener(t: string, fn: (ev: unknown) => void) {
      map.get(t)?.delete(fn);
    },
    dispatch(t: string, ev: unknown = {}) {
      for (const fn of map.get(t) ?? []) fn(ev);
    },
    count(t: string) {
      return map.get(t)?.size ?? 0;
    },
  };
}

/** 进程内 BroadcastChannel 总线（同名频道互通、不回送自身） */
function makeBus() {
  const members = new Set<{ onmessage: ((ev: { data: unknown }) => void) | null }>();
  return (name: string) => {
    void name;
    const ch = {
      onmessage: null as ((ev: { data: unknown }) => void) | null,
      postMessage(msg: unknown) {
        for (const m of members) if (m !== ch) m.onmessage?.({ data: msg });
      },
      close() {
        members.delete(ch);
      },
    };
    members.add(ch);
    return ch;
  };
}

function setup(opts: { hint?: boolean; fetchImpl?: () => Promise<Response>; extra?: Partial<SessionStoreDeps> } = {}) {
  const jar = { cookie: opts.hint === false ? "" : `${COOKIE_SESSION_HINT}=1` };
  const fetchMock = vi.fn(async (..._args: unknown[]) => (opts.fetchImpl ? opts.fetchImpl() : meOk()));
  const refresh = vi.fn(async () => false);
  let now = 1_000_000;
  const win = makeTarget();
  const doc = makeTarget({ visibilityState: "visible" });
  const store = createSessionStore({
    fetch: fetchMock as unknown as typeof fetch,
    readCookie: () => jar.cookie,
    writeHint: (present) => {
      jar.cookie = present ? `${COOKIE_SESSION_HINT}=1` : "";
    },
    refresh,
    channelFactory: () => null,
    storage: null,
    windowTarget: win,
    documentTarget: doc,
    now: () => now,
    staleMs: 60_000,
    ...opts.extra,
  });
  return {
    store,
    jar,
    fetchMock,
    refresh,
    win,
    doc,
    advance(ms: number) {
      now += ms;
    },
    meCalls: () => fetchMock.mock.calls.filter((c) => String(c[0]) === AUTH_ME_URL).length,
  };
}

describe("session-hint 纯函数", () => {
  it("提示 Cookie 的源 Cookie 名与 constants.ts 一致（防两处漂移）", () => {
    expect([...HINT_SOURCE_COOKIES]).toEqual([COOKIE_ACCESS, COOKIE_REFRESH]);
  });
  it("hasSessionHint 解析 document.cookie 形态", () => {
    expect(hasSessionHint("")).toBe(false);
    expect(hasSessionHint(null)).toBe(false);
    expect(hasSessionHint("a=1; aidean_session_hint=1; b=2")).toBe(true);
    expect(hasSessionHint("aidean_session_hint=")).toBe(false);
    expect(hasSessionHint("x_aidean_session_hint=1")).toBe(false);
  });
  it("decideSessionHint：有令牌缺提示 → set；无令牌有提示 → clear；一致 → null", () => {
    const jar = (o: Record<string, string>) => (n: string) => o[n];
    expect(decideSessionHint(jar({ aidean_token: "t" }))).toBe("set");
    expect(decideSessionHint(jar({ aidean_refresh: "r" }))).toBe("set");
    expect(decideSessionHint(jar({ aidean_session_hint: "1" }))).toBe("clear");
    expect(decideSessionHint(jar({}))).toBeNull();
    expect(decideSessionHint(jar({ aidean_token: "t", aidean_session_hint: "1" }))).toBeNull();
  });
});

describe("createSessionStore", () => {
  it("① 游客（无提示 Cookie）：零请求定案 anonymous", async () => {
    const t = setup({ hint: false });
    const s = await t.store.ensure();
    expect(s.status).toBe("anonymous");
    expect(s.source).toBe("hint");
    expect(t.fetchMock).not.toHaveBeenCalled();
    expect(t.refresh).not.toHaveBeenCalled();
  });

  it("② 有提示：20 个并发消费者 → auth/me 只发 1 次，且结果一致", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const t = setup({ fetchImpl: async () => (await gate, meOk()) });
    const all = Promise.all(Array.from({ length: 20 }, () => t.store.ensure()));
    expect(t.store.getSnapshot().status).toBe("loading");
    release();
    const results = await all;
    expect(t.meCalls()).toBe(1);
    expect(new Set(results.map((r) => r.status))).toEqual(new Set(["authenticated"]));
    expect(results[0].user).toEqual(USER);
  });

  it("③ 定案后再次 ensure / whenSettled / 未过期 revalidate 不重发（跨页面复用缓存）", async () => {
    const t = setup();
    await t.store.ensure();
    await t.store.ensure();
    await t.store.whenSettled();
    await t.store.revalidate();
    expect(t.meCalls()).toBe(1);
  });

  it("④a 401 → 续期成功 → 再探 200 定案 authenticated", async () => {
    const responses = [me401(), meOk()];
    const t = setup({ fetchImpl: async () => responses.shift()! });
    t.refresh.mockResolvedValueOnce(true);
    const s = await t.store.ensure();
    expect(s.status).toBe("authenticated");
    expect(t.refresh).toHaveBeenCalledTimes(1);
    expect(t.meCalls()).toBe(2);
  });

  it("④b 401 → 续期失败 → anonymous（非降级，权威结论）", async () => {
    const t = setup({ fetchImpl: async () => me401() });
    const s = await t.store.ensure();
    expect(s).toMatchObject({ status: "anonymous", source: "probe", degraded: false });
    expect(t.meCalls()).toBe(1);
  });

  it("⑤ 5xx：降级匿名，聚焦时重试", async () => {
    const responses = [new Response("x", { status: 503 }), meOk()];
    const t = setup({ fetchImpl: async () => responses.shift()! });
    t.store.connect();
    expect((await t.store.ensure()).degraded).toBe(true);
    t.win.dispatch("focus");
    await vi.waitFor(() => expect(t.store.getSnapshot().status).toBe("authenticated"));
    expect(t.meCalls()).toBe(2);
  });

  it("⑥a markLoggedOut：删提示、零请求置匿名、之后 ensure 也不发请求", async () => {
    const t = setup();
    await t.store.ensure();
    t.store.markLoggedOut();
    expect(t.jar.cookie).toBe("");
    expect(t.store.getSnapshot()).toMatchObject({ status: "anonymous", source: "event" });
    await t.store.ensure();
    await t.store.revalidate({ force: true });
    expect(t.meCalls()).toBe(1);
  });

  it("⑥b markLoggedIn(user)：写提示并直接定案，零请求；markLoggedIn() 无 user → 重新探测一次", async () => {
    const t = setup({ hint: false });
    await t.store.ensure(); // 游客
    const s = await t.store.markLoggedIn(USER);
    expect(t.jar.cookie).toContain(COOKIE_SESSION_HINT);
    expect(s).toMatchObject({ status: "authenticated", user: USER });
    expect(t.meCalls()).toBe(0);

    t.store.markLoggedOut();
    const s2 = await t.store.markLoggedIn();
    expect(s2.status).toBe("authenticated");
    expect(t.meCalls()).toBe(1);
  });

  it("⑥c markLoggedIn(undefined, {probe:false})：只失效不探测（调用方随即整页跳转）", async () => {
    const t = setup({ hint: false });
    await t.store.ensure();
    const s = await t.store.markLoggedIn(undefined, { probe: false });
    expect(s.status).toBe("unknown");
    expect(t.meCalls()).toBe(0);
  });

  it("⑦a 跨标签（BroadcastChannel）：A 登出 → B 零请求置匿名；A 登录 → B 重新探测", async () => {
    const bus = makeBus();
    const shared = { cookie: `${COOKIE_SESSION_HINT}=1` }; // 同源标签页共享 Cookie jar
    const mk = (tabId: string) => {
      const fetchMock = vi.fn(async () => meOk());
      const store = createSessionStore({
        fetch: fetchMock as unknown as typeof fetch,
        readCookie: () => shared.cookie,
        writeHint: (p) => (shared.cookie = p ? `${COOKIE_SESSION_HINT}=1` : ""),
        refresh: async () => false,
        channelFactory: bus,
        storage: null,
        windowTarget: makeTarget(),
        documentTarget: makeTarget({ visibilityState: "visible" }),
        tabId,
      });
      store.connect();
      return { store, fetchMock };
    };
    const a = mk("A");
    const b = mk("B");
    await a.store.ensure();
    await b.store.ensure();
    expect(b.fetchMock).toHaveBeenCalledTimes(1);

    a.store.markLoggedOut();
    expect(b.store.getSnapshot()).toMatchObject({ status: "anonymous", source: "event" });
    expect(b.fetchMock).toHaveBeenCalledTimes(1);

    await a.store.markLoggedIn(USER);
    await vi.waitFor(() => expect(b.store.getSnapshot().status).toBe("authenticated"));
    expect(b.fetchMock).toHaveBeenCalledTimes(2);
  });

  it("⑦b 跨标签（storage 兜底）：收到 logout 事件 → 置匿名；非本协议 key/自身 tabId 被忽略", async () => {
    const t = setup({ extra: { tabId: "self" } });
    t.store.connect();
    await t.store.ensure();
    t.win.dispatch("storage", { key: "other", newValue: "{}" });
    t.win.dispatch("storage", {
      key: SESSION_STORAGE_EVENT_KEY,
      newValue: JSON.stringify({ type: "logout", from: "self", at: 1 }),
    });
    expect(t.store.getSnapshot().status).toBe("authenticated");
    t.win.dispatch("storage", {
      key: SESSION_STORAGE_EVENT_KEY,
      newValue: JSON.stringify({ type: "logout", from: "peer", at: 2 }),
    });
    expect(t.store.getSnapshot().status).toBe("anonymous");
  });

  it("⑦c 无 BroadcastChannel 时，本标签登录/登出写 storage 事件供其他标签消费", async () => {
    const setItem = vi.fn();
    const t = setup({ extra: { storage: { setItem }, tabId: "me" } });
    t.store.connect();
    t.store.markLoggedOut();
    expect(setItem).toHaveBeenCalledWith(SESSION_STORAGE_EVENT_KEY, expect.stringContaining('"logout"'));
  });

  it("⑧ 飞行中登出：过期的 200 结果被丢弃，不回写已登录", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const t = setup({ fetchImpl: async () => (await gate, meOk()) });
    const pending = t.store.ensure();
    t.store.markLoggedOut();
    release();
    const s = await pending;
    expect(s.status).toBe("anonymous");
    expect(t.store.getSnapshot().status).toBe("anonymous");
  });

  it("⑨ 聚焦复核：游客聚焦零请求；已登录未过期不发；过期后发 1 次；提示消失则零请求降为匿名", async () => {
    const guest = setup({ hint: false });
    guest.store.connect();
    await guest.store.ensure();
    guest.win.dispatch("focus");
    guest.doc.dispatch("visibilitychange");
    expect(guest.fetchMock).not.toHaveBeenCalled();

    const t = setup();
    t.store.connect();
    await t.store.ensure();
    t.win.dispatch("focus");
    expect(t.meCalls()).toBe(1);
    t.advance(61_000);
    t.win.dispatch("focus");
    await vi.waitFor(() => expect(t.meCalls()).toBe(2));

    t.jar.cookie = ""; // 另一处（如服务端）清了令牌 → middleware 删了提示
    t.doc.dispatch("visibilitychange");
    await vi.waitFor(() => expect(t.store.getSnapshot().status).toBe("anonymous"));
    expect(t.meCalls()).toBe(2);
  });

  it("⑨b 游客在别处登录（无广播通道）：聚焦时发现提示出现 → 探测 1 次", async () => {
    const t = setup({ hint: false });
    t.store.connect();
    await t.store.ensure();
    t.jar.cookie = `${COOKIE_SESSION_HINT}=1`;
    t.win.dispatch("focus");
    await vi.waitFor(() => expect(t.store.getSnapshot().status).toBe("authenticated"));
    expect(t.meCalls()).toBe(1);
  });

  it("⑩ onTransition 只在身份切换时触发（首次定案、匿名↔登录），重复定案不触发", async () => {
    const t = setup();
    const seen: string[] = [];
    t.store.onTransition((next, prev) => seen.push(`${prev.status}->${next.status}`));
    await t.store.ensure();
    t.advance(61_000);
    await t.store.revalidate(); // 同一用户复核
    t.store.markLoggedOut();
    t.store.markLoggedOut();
    expect(seen).toEqual(["loading->authenticated", "authenticated->anonymous"]);
  });

  it("connect 幂等：重复调用不重复挂监听，卸载后全部移除", () => {
    const t = setup();
    const off1 = t.store.connect();
    const off2 = t.store.connect();
    expect(off1).toBe(off2);
    expect(t.win.count("focus")).toBe(1);
    off1();
    expect(t.win.count("focus")).toBe(0);
    expect(t.win.count("storage")).toBe(0);
    expect(t.doc.count("visibilitychange")).toBe(0);
  });

  it("seed：服务端已知会话时注入，跳过首探", async () => {
    const t = setup();
    t.store.seed(USER);
    expect((await t.store.ensure()).status).toBe("authenticated");
    expect(t.meCalls()).toBe(0);
  });
});
