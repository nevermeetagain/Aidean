/**
 * B11-06 收藏数据层 × 会话 store 闸门单测（DEF-011-08）。
 *
 * 覆盖：① 已知匿名 → 不发 `GET /user/favorites`（游客 401 归零的第二条红字）
 * ② 已登录 → 正常拉收藏并建映射（登录后收藏不回归）③ 多组件并发 ensureLoaded → features/favorites 各 1 次、auth/me 1 次
 * ④ 登录（匿名→登录）切换 → 自动重载收藏 ⑤ 登出 → 清空映射、零 favorites 请求 ⑥ 开关关闭时连会话都不必定案也不拉收藏。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bindFavoritesToSession, useFavoritesStore } from "../../../../hooks/useFavorites";
import { createSessionStore, type SessionStore } from "../../auth/session-store";
import { COOKIE_SESSION_HINT } from "../../auth/session-hint";

const FEATURES_URL = "/api/v1/system/features";
const FAV_URL = "/api/v1/user/favorites?pageSize=50";
const ME_URL = "/api/v1/auth/me";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

let jar: { cookie: string };
let session: SessionStore;
let enabled = true;
const fetchMock = vi.fn(async (input: unknown) => {
  const url = String(input);
  if (url === FEATURES_URL) return json({ code: 0, data: { flags: { "favorites.enabled": enabled } } });
  if (url === ME_URL) return json({ code: 0, data: { user: { id: "u-1", nickname: "Ada", tier: "PRO", email: "a@b.c" } } });
  if (url === FAV_URL)
    return json({ code: 0, data: { items: [{ id: "fav-1", refType: "MODEL", refId: "m-1" }], total: 1 } });
  return json({ code: 40400 }, 404);
});
const calls = (url: string) => fetchMock.mock.calls.filter((c) => String(c[0]) === url).length;

beforeEach(() => {
  enabled = true;
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  jar = { cookie: "" };
  session = createSessionStore({
    fetch: ((...a: Parameters<typeof fetch>) => fetchMock(a[0])) as unknown as typeof fetch,
    readCookie: () => jar.cookie,
    writeHint: (p) => (jar.cookie = p ? `${COOKIE_SESSION_HINT}=1` : ""),
    refresh: async () => false,
    channelFactory: () => null,
    storage: null,
    windowTarget: null,
    documentTarget: null,
  });
  bindFavoritesToSession(session);
  useFavoritesStore.getState().reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useFavoritesStore × sessionStore", () => {
  it("① 游客（无提示 Cookie）：跳过 user/favorites，且不探测 auth/me", async () => {
    await useFavoritesStore.getState().ensureLoaded();
    const s = useFavoritesStore.getState();
    expect(s).toMatchObject({ loaded: true, enabled: true, authed: false });
    expect(calls(FAV_URL)).toBe(0);
    expect(calls(ME_URL)).toBe(0);
    expect(calls(FEATURES_URL)).toBe(1);
  });

  it("② 已登录：拉收藏并建立 refType:refId → id 映射", async () => {
    jar.cookie = `${COOKIE_SESSION_HINT}=1`;
    await useFavoritesStore.getState().ensureLoaded();
    const s = useFavoritesStore.getState();
    expect(s).toMatchObject({ loaded: true, enabled: true, authed: true });
    expect(s.byKey).toEqual({ "MODEL:m-1": "fav-1" });
    expect(calls(FAV_URL)).toBe(1);
  });

  it("③ 10 个收藏按钮 + 头部并发：features/favorites/auth/me 各 1 次", async () => {
    jar.cookie = `${COOKIE_SESSION_HINT}=1`;
    await Promise.all([
      session.ensure(), // HeaderSession
      ...Array.from({ length: 10 }, () => useFavoritesStore.getState().ensureLoaded()),
    ]);
    await vi.waitFor(() => expect(useFavoritesStore.getState().loaded).toBe(true));
    expect(calls(ME_URL)).toBe(1);
    expect(calls(FEATURES_URL)).toBe(1);
    expect(calls(FAV_URL)).toBe(1);
  });

  it("④ 匿名 → 登录：会话切换自动重载收藏", async () => {
    await useFavoritesStore.getState().ensureLoaded();
    expect(useFavoritesStore.getState().authed).toBe(false);
    await session.markLoggedIn({ id: "u-1", nickname: "Ada", tier: "PRO", email: "a@b.c" });
    await vi.waitFor(() => expect(useFavoritesStore.getState().authed).toBe(true));
    expect(useFavoritesStore.getState().byKey).toEqual({ "MODEL:m-1": "fav-1" });
    expect(calls(FAV_URL)).toBe(1);
  });

  it("⑤ 登录 → 登出：清空映射，重载走匿名短路（零 favorites 请求）", async () => {
    jar.cookie = `${COOKIE_SESSION_HINT}=1`;
    await useFavoritesStore.getState().ensureLoaded();
    expect(calls(FAV_URL)).toBe(1);
    session.markLoggedOut();
    await vi.waitFor(() => expect(useFavoritesStore.getState().loaded).toBe(true));
    expect(useFavoritesStore.getState()).toMatchObject({ authed: false, byKey: {} });
    expect(calls(FAV_URL)).toBe(1);
  });

  it("⑥ 开关关闭：不拉收藏", async () => {
    enabled = false;
    jar.cookie = `${COOKIE_SESSION_HINT}=1`;
    await useFavoritesStore.getState().ensureLoaded();
    expect(useFavoritesStore.getState()).toMatchObject({ loaded: true, enabled: false });
    expect(calls(FAV_URL)).toBe(0);
  });
});
