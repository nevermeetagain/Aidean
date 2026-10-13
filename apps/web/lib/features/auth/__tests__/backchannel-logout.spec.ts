/**
 * back-channel logout 单测（ADR-0003 L4.1 / M-SSO-FOLLOWUP B2）。
 *
 * 覆盖：
 * ① 主站自身链登出（clientId=null）→ 撤链 + 向该用户全部活跃 SSO 产品链广播 logout_token；
 * ② 同一 client 多链去重（一个产品只通知一次）；
 * ③ 未注册 logoutUri 的 client 跳过；已停用 client 跳过；
 * ④ SSO 产品链登出（clientId≠null）→ 仅通知该链属产品；
 * ⑤ 广播失败不影响登出主流程（Cookie 清理头照常返回）。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.JWT_SECRET = process.env.JWT_SECRET ?? "unit-test-secret-aidean";

const cookieStore = new Map<string, string>();

const prismaState = vi.hoisted(() => ({
  refreshToken: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(async () => ({ count: 1 })),
  },
}));

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

vi.mock("../../../db/prisma", () => ({
  prisma: { refreshToken: prismaState.refreshToken },
}));

const fetchSpy = vi.hoisted(() => vi.fn(async () => ({ ok: true } as Response)));
vi.mock("../../oauth/backchannel", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../oauth/backchannel")>();
  return {
    ...mod,
    sendBackChannelLogout: (...args: Parameters<typeof mod.sendBackChannelLogout>) => {
      void fetchSpy;
      return mod.sendBackChannelLogout(...args);
    },
  };
});

import { cookies } from "next/headers";

import { COOKIE_ACCESS, COOKIE_REFRESH } from "../constants";
import { signRefresh } from "../tokens";

const logoutRoute = await import("../../../../app/api/v1/auth/logout/route");

function mockCookieStore() {
  vi.mocked(cookies).mockReturnValue({
    get: (name: string) =>
      cookieStore.has(name) ? { value: cookieStore.get(name) as string, name } : undefined,
    getAll: () => [...cookieStore.entries()].map(([name, value]) => ({ name, value })),
    has: (name: string) => cookieStore.has(name),
    set: (name: string, value: string) => void cookieStore.set(name, value),
    delete: (name: string) => void cookieStore.delete(name),
  } as unknown as ReturnType<typeof cookies>);
}

// 拦截真实网络：sendBackChannelLogout 内部 fetch 全部 mock 成功
vi.stubGlobal("fetch", fetchSpy);

// oidcClientService mock：两个活跃 client，wiki 无 logoutUri
const clientsState = vi.hoisted(() => ({
  getActiveClient: vi.fn(async (clientId: string) => {
    if (clientId === "aidean-bot") {
      return { clientId, logoutUri: "https://bot.example.com/auth/backchannel-logout" };
    }
    if (clientId === "aidean-wiki") {
      return { clientId, logoutUri: null };
    }
    return null;
  }),
}));
vi.mock("../../oauth/clients", () => ({ oidcClientService: clientsState }));

beforeEach(() => {
  vi.clearAllMocks();
  cookieStore.clear();
  fetchSpy.mockClear();
  fetchSpy.mockResolvedValue({ ok: true } as Response);
});

async function postLogout(): Promise<Response> {
  return logoutRoute.POST(
    new Request("http://localhost/api/v1/auth/logout", { method: "POST" })
  );
}

describe("back-channel logout（ADR-0003 L4.1）", () => {
  it("① 主站自身链登出（clientId=null）→ 撤链 + 向该用户全部活跃 SSO 产品广播", async () => {
    prismaState.refreshToken.findUnique.mockResolvedValueOnce({
      jti: "jti-self",
      userId: "u-1",
      clientId: null,
      chainId: "chain-self",
    });
    prismaState.refreshToken.findMany.mockResolvedValueOnce([
      { chainId: "chain-bot", clientId: "aidean-bot", userId: "u-1" },
      { chainId: "chain-wiki", clientId: "aidean-wiki", userId: "u-1" },
    ]);
    mockCookieStore();
    cookieStore.set(COOKIE_REFRESH, (await signRefresh("u-1", 0)).token);

    const res = await postLogout();
    expect(res.status).toBe(200);
    // 撤链发生（updateMany 按 chainId 撤销整链）
    expect(prismaState.refreshToken.updateMany).toHaveBeenCalled();
    // 广播：仅 aidean-bot 有 logoutUri；aidean-wiki 未注册 → 跳过
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://bot.example.com/auth/backchannel-logout");
    expect(init.method).toBe("POST");
    const body = String(init.body);
    expect(body).toContain("logout_token=");
  });

  it("② 同一 client 多条活跃链 → 去重，仅通知一次", async () => {
    prismaState.refreshToken.findUnique.mockResolvedValueOnce({
      jti: "jti-self",
      userId: "u-2",
      clientId: null,
      chainId: "chain-self",
    });
    prismaState.refreshToken.findMany.mockResolvedValueOnce([
      { chainId: "chain-bot-a", clientId: "aidean-bot", userId: "u-2" },
      { chainId: "chain-bot-b", clientId: "aidean-bot", userId: "u-2" },
    ]);
    mockCookieStore();
    cookieStore.set(COOKIE_REFRESH, (await signRefresh("u-2", 0)).token);

    await postLogout();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("③ SSO 产品链登出（clientId≠null）→ 仅通知该链属产品，不广播其他产品", async () => {
    prismaState.refreshToken.findUnique.mockResolvedValueOnce({
      jti: "jti-bot",
      userId: "u-3",
      clientId: "aidean-bot",
      chainId: "chain-bot",
    });
    mockCookieStore();
    cookieStore.set(COOKIE_REFRESH, (await signRefresh("u-3", 0)).token);

    await postLogout();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect((fetchSpy.mock.calls[0] as unknown as [string])[0]).toBe(
      "https://bot.example.com/auth/backchannel-logout"
    );
    // 不应查询用户全部活跃链（广播路径未触发）
    expect(prismaState.refreshToken.findMany).not.toHaveBeenCalled();
  });

  it("④ 广播目标不可达 → 登出主流程不受影响，Cookie 清理头照常返回", async () => {
    fetchSpy.mockRejectedValue(new Error("network down"));
    prismaState.refreshToken.findUnique.mockResolvedValueOnce({
      jti: "jti-self",
      userId: "u-4",
      clientId: null,
      chainId: "chain-self",
    });
    prismaState.refreshToken.findMany.mockResolvedValueOnce([
      { chainId: "chain-bot", clientId: "aidean-bot", userId: "u-4" },
    ]);
    mockCookieStore();
    cookieStore.set(COOKIE_REFRESH, (await signRefresh("u-4", 0)).token);

    const res = await postLogout();
    expect(res.status).toBe(200);
    const setCookies = res.headers.getSetCookie();
    expect(setCookies.some((c) => c.startsWith(`${COOKIE_ACCESS}=`) && c.includes("Max-Age=0"))).toBe(true);
    expect(setCookies.some((c) => c.startsWith(`${COOKIE_REFRESH}=`) && c.includes("Max-Age=0"))).toBe(true);
  });

  it("⑤ 无 refresh Cookie → 直接清理，无任何广播", async () => {
    mockCookieStore();
    const res = await postLogout();
    expect(res.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(prismaState.refreshToken.findUnique).not.toHaveBeenCalled();
  });
});
