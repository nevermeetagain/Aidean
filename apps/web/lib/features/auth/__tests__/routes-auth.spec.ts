/**
 * auth 路由直调单测（Task A.1.4；≥3 用例）。
 *
 * 策略：内存 Request 直调 withApi 包装后的 handler；vi.mock next/headers（Cookie）
 * 与 db/prisma（经 vi.hoisted 共享状态，resetModules 后仍同源）；service 按需
 * doMock。断言统一响应信封 code/message/data 与 Set-Cookie 行为。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.JWT_SECRET = process.env.JWT_SECRET ?? "unit-test-secret-aidean";

const cookieStore = new Map<string, string>();

const prismaState = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  refreshToken: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

vi.mock("../../../db/prisma", () => ({
  prisma: {
    user: prismaState.user,
    refreshToken: prismaState.refreshToken,
    $transaction: vi.fn(),
  },
}));

import { cookies } from "next/headers";

import { ACCESS_TTL_SECONDS, COOKIE_ACCESS, COOKIE_REFRESH, REFRESH_TTL_SECONDS } from "../constants";
import { signAccess, signRefresh, verifyAccess } from "../tokens";
// 被测路由（vitest include 仅 lib/**，故经相对路径直调 route handler）
const meRoute = await import("../../../../app/api/v1/auth/me/route");
const registerRoute = await import("../../../../app/api/v1/auth/register/route");
const logoutRoute = await import("../../../../app/api/v1/auth/logout/route");
const refreshRoute = await import("../../../../app/api/v1/auth/refresh/route");
const qrcodeRoute = await import("../../../../app/api/v1/wechat/qrcode/route");

function mockCookieStore() {
  const store = cookieStore;
  vi.mocked(cookies).mockReturnValue({
    get: (name: string) =>
      store.has(name) ? { value: store.get(name) as string, name } : undefined,
    getAll: () => [...store.entries()].map(([name, value]) => ({ name, value })),
    has: (name: string) => store.has(name),
    set: (name: string, value: string) => void store.set(name, value),
    delete: (name: string) => void store.delete(name),
  } as unknown as ReturnType<typeof cookies>);
}

beforeEach(() => {
  vi.clearAllMocks();
  cookieStore.clear();
});

describe("auth routes", () => {
  it("① GET me 未登录 → HTTP 401 + 信封 body.code=10004 / data=null", async () => {
    mockCookieStore();
    const res = await meRoute.GET(new Request("http://localhost/api/v1/auth/me"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe(10004);
    expect(body.message).toBe("请先登录");
    expect(body.data).toBeNull();
    expect(body.requestId).toBeTruthy();
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("② POST register 成功走 service spy 路径 → 种双 HttpOnly Cookie 并回 user 信封", async () => {
    const spy = vi.fn(async () => ({
      id: "u-r1",
      email: "reg@b.co",
      nickname: "阿典",
      tier: "NORMAL" as const,
      tokenVersion: 0,
    }));
    // resetModules 保证 route 实例重新绑定到 doMock 后的 service
    vi.resetModules();
    vi.doMock("../service", () => ({ authService: { register: spy, login: vi.fn() } }));
    const { POST } = await import("../../../../app/api/v1/auth/register/route");

    const req = new Request("http://localhost/api/v1/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "reg@b.co", password: "longenough1", nickname: "阿典" }),
    });
    const res = await POST(req);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.user).toEqual({
      id: "u-r1",
      email: "reg@b.co",
      nickname: "阿典",
      tier: "NORMAL",
      tokenVersion: 0,
    });

    const setCookies = res.headers.getSetCookie();
    expect(
      setCookies.some(
        (c) =>
          c.startsWith(`${COOKIE_ACCESS}=`) &&
          /HttpOnly/i.test(c) &&
          /SameSite=lax/i.test(c) &&
          c.includes(`Max-Age=${ACCESS_TTL_SECONDS}`)
      )
    ).toBe(true);
    expect(
      setCookies.some((c) => c.startsWith(`${COOKIE_REFRESH}=`) && c.includes(`Max-Age=${REFRESH_TTL_SECONDS}`))
    ).toBe(true);
    // 收尾：还原模块图，避免污染后续用例的静态绑定
    vi.doUnmock("../service");
    vi.resetModules();
  });

  it("③ GET wechat/qrcode 无凭据 → data.enabled=false reason=CHANNEL_NOT_CONFIGURED", async () => {
    const prev = process.env.WECHAT_APPID;
    delete process.env.WECHAT_APPID;
    try {
      const res = await qrcodeRoute.GET(new Request("http://localhost/api/v1/wechat/qrcode"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.code).toBe(0);
      expect(body.data.enabled).toBe(false);
      expect(body.data.reason).toBe("CHANNEL_NOT_CONFIGURED");
    } finally {
      if (prev !== undefined) process.env.WECHAT_APPID = prev;
    }
  });

  it("④ POST refresh 无 Cookie → 401 code=10004（错误路径无 Set-Cookie 清理头，前端自清）", async () => {
    mockCookieStore(); // 无 aidean_refresh
    const res = await refreshRoute.POST(
      new Request("http://localhost/api/v1/auth/refresh", { method: "POST" })
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe(10004);
    expect(res.headers.getSetCookie()).toHaveLength(0); // withApi 错误路径不追加 Set-Cookie —— 已注记权衡
  });

  it("⑤ POST refresh 有效令牌 → 查库回填 tier 签发新对并种 Cookie", async () => {
    prismaState.user.findUnique.mockResolvedValueOnce({
      id: "u-7",
      email: "a@b.co",
      nickname: "阿典",
      tier: "PRO",
      status: "ACTIVE",
      tokenVersion: 0,
    });
    // consumeRefreshToken：jti 有效未撤销未轮换 → ok（返回链锚点）
    prismaState.refreshToken.findUnique.mockResolvedValueOnce({
      jti: "jti-old",
      userId: "u-7",
      clientId: null,
      chainId: "chain-1",
      rotatedAt: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    mockCookieStore();
    cookieStore.set(COOKIE_REFRESH, (await signRefresh("u-7", 0)).token);

    const res = await refreshRoute.POST(
      new Request("http://localhost/api/v1/auth/refresh", { method: "POST" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.user.tier).toBe("PRO");

    const setCookies = res.headers.getSetCookie();
    expect(setCookies.filter((c) => c.startsWith(`${COOKIE_ACCESS}=`))).toHaveLength(1);
    expect(setCookies.filter((c) => c.startsWith(`${COOKIE_REFRESH}=`))).toHaveLength(1);
    // 新 access 可解析且 tier 为查库回填值；ver/tokenVersion 一致
    const rawToken = setCookies
      .find((c) => c.startsWith(`${COOKIE_ACCESS}=`))
      ?.split(";")[0]
      ?.split("=")
      .slice(1)
      .join("=") as string;
    const accessClaims = await verifyAccess(decodeURIComponent(rawToken));
    expect(accessClaims?.userId).toBe("u-7");
    expect(accessClaims?.tier).toBe("PRO");
    expect(accessClaims?.ver).toBe(0);
  });

  it("⑥ POST logout → 双 Cookie Max-Age=0 清除头", async () => {
    mockCookieStore();
    const res = await logoutRoute.POST(
      new Request("http://localhost/api/v1/auth/logout", { method: "POST" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.ok).toBe(true);
    const setCookies = res.headers.getSetCookie();
    for (const name of [COOKIE_ACCESS, COOKIE_REFRESH]) {
      expect(setCookies.some((c) => c.startsWith(`${name}=`))).toBe(true);
      expect(setCookies.some((c) => c.startsWith(`${name}=`) && c.includes("Max-Age=0"))).toBe(true);
    }
  });

  it("⑦ GET me 已登录（prisma 回库）→ 200 UserProfile 形状", async () => {
    prismaState.user.findUnique.mockResolvedValueOnce({ status: "ACTIVE", deletedAt: null });
    prismaState.user.findUnique.mockResolvedValueOnce({
      id: "u-9",
      email: "me@b.co",
      nickname: null,
      tier: "MAX",
      status: "ACTIVE",
    });
    mockCookieStore();
    cookieStore.set(COOKIE_ACCESS, await signAccess({ id: "u-9", tier: "MAX", tokenVersion: 0 }));

    const res = await meRoute.GET(new Request("http://localhost/api/v1/auth/me"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.user).toEqual({ id: "u-9", email: "me@b.co", nickname: null, tier: "MAX" });
  });
});

// 防止 TS6133 未使用告警（registerRoute 静态引入仅用于模块注册时序保障）
void registerRoute;
