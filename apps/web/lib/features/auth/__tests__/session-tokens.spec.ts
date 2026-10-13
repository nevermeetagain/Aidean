/**
 * session/tokens 单测（Task A.1.3 / M-SSO P0.1~P0.2 重写；≥6 用例）。
 *
 * 策略：真实 jose + keys.ts（无 REDIS_URL → 进程内存自生成 RS256 对）；
 * Cookie 经 vi.mock('next/headers') 内存 Map 模拟。
 * 持久化刷新链注记：refresh 的落库/轮换检测/整链撤销编排在 repository+route 层
 * （routes-auth.spec 覆盖），本组断言**纯 JWT 语义**（签发/验签/混用拒绝/篡改/iss/aud）。
 */
import { SignJWT, jwtVerify } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { cookies } from "next/headers";

import { ApiError } from "../../../../app/api/v1/_lib/errors";
import { AUTH_AUDIENCE_SELF, AUTH_ISSUER, AUTH_ISSUER_CONTAINER } from "../constants";
import { getCurrentKid, getSigningKey, getVerificationKey } from "../keys";
import { getSession, requireUserApi } from "../session";
import { signAccess, signRefresh, signTokenPair, verifyAccess, verifyRefresh } from "../tokens";

const cookieStore = new Map<string, string>();

function mockCookieStore() {
  const store = cookieStore;
  vi.mocked(cookies).mockReturnValue({
    get: (name: string) => (store.has(name) ? { value: store.get(name) as string, name } : undefined),
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

describe("双令牌签发与验签（RS256）", () => {
  it("① signAccess 载荷含 tier/ver/jti 且 sub=userId，RS256 + iss/aud 可验回", async () => {
    const token = await signAccess({ id: "u-9", tier: "MAX", tokenVersion: 3 });
    const { payload, protectedHeader } = await jwtVerify(token, await getVerificationKey(), {
      issuer: AUTH_ISSUER,
      audience: AUTH_AUDIENCE_SELF,
    });
    expect(protectedHeader.alg).toBe("RS256");
    expect(payload.sub).toBe("u-9");
    expect(payload.tier).toBe("MAX");
    expect(payload.ver).toBe(3);
    expect(typeof payload.jti).toBe("string");
    // 15m 过期语义：exp - iat === 900
    expect(Number(payload.exp) - Number(payload.iat)).toBe(900);
  });

  it("② 过期 access 验签失败 → verifyAccess 返回 null", async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const expired = await new SignJWT({ tier: "NORMAL", ver: 0, jti: "j-exp" })
      .setProtectedHeader({ alg: "RS256" })
      .setSubject("u-1")
      .setIssuedAt(nowSec - 3600)
      .setExpirationTime(nowSec - 1800)
      .setIssuer(AUTH_ISSUER)
      .setAudience(AUTH_AUDIENCE_SELF)
      .sign(await getSigningKey());
    expect(await verifyAccess(expired)).toBeNull();
  });

  it("③ refresh 含 typ:'refresh'/jti/ver，7d TTL", async () => {
    const issuance = await signRefresh("u-3", 0);
    const claims = await verifyRefresh(issuance.token);
    expect(claims).not.toBeNull();
    expect(claims?.userId).toBe("u-3");
    expect(claims?.jti).toBe(issuance.jti); // 签发返回的落库锚点与令牌内 jti 一致
    expect(claims?.ver).toBe(0);
    expect(issuance.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);
    const { payload } = await jwtVerify(issuance.token, await getVerificationKey(), {
      issuer: AUTH_ISSUER,
      audience: AUTH_AUDIENCE_SELF,
    });
    expect(Number(payload.exp) - Number(payload.iat)).toBe(7 * 24 * 60 * 60);
  });

  it("④ access 令牌混入 refresh 位（无 typ/jti 形态）→ verifyRefresh null；篡改签名 → null", async () => {
    const access = await signAccess({ id: "u-5", tier: "NORMAL", tokenVersion: 0 });
    expect(await verifyRefresh(access)).toBeNull(); // typ 缺失被拒
    const tampered = (await signRefresh("u-5", 0)).token.slice(0, -3) + "abc";
    expect(await verifyRefresh(tampered)).toBeNull();
  });

  it("⑤ 签发对可互相验回：pair 的 access/refresh 同 sub 且 refresh jti 唯一锚点回传", async () => {
    const pair = await signTokenPair({ id: "u-6", tier: "PRO", tokenVersion: 2 });
    const access = await verifyAccess(pair.accessToken);
    expect(access?.userId).toBe("u-6");
    expect(access?.tier).toBe("PRO");
    expect(access?.ver).toBe(2);
    const refresh = await verifyRefresh(pair.refreshToken);
    expect(refresh?.jti).toBe(pair.refreshJti);
    expect(refresh?.userId).toBe("u-6");
  });

  it("⑥ 篡改 access 签名 → verifyAccess null（RS256 非对称：无私钥不可伪造）", async () => {
    const token = await signAccess({ id: "u-8", tier: "PRO", tokenVersion: 0 });
    const tampered = token.slice(0, -3) + "abc";
    expect(await verifyAccess(tampered)).toBeNull();
  });
});

describe("A-T21 验签 iss 双值对齐（浏览器 + 容器口径均过，伪造拒）", () => {
  /** 手工签一枚指定 iss 的 access/refresh，绕开签发侧单值限制，专测验签集合 */
  async function signWithIssuer(iss: string, typ: "access" | "refresh") {
    const claims =
      typ === "access"
        ? { tier: "PRO", ver: 0, jti: `j-a-${iss}` }
        : { typ: "refresh", ver: 0, jti: `j-r-${iss}` };
    return new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: await getCurrentKid() })
      .setSubject("u-iss")
      .setIssuer(iss)
      .setAudience(AUTH_AUDIENCE_SELF)
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(await getSigningKey());
  }

  it("⑪ 浏览器 iss（AUTH_ISSUER）access → verifyAccess 通过", async () => {
    const claims = await verifyAccess(await signWithIssuer(AUTH_ISSUER, "access"));
    expect(claims).toMatchObject({ userId: "u-iss", tier: "PRO" });
  });

  it("⑫ 容器 iss（host.docker.internal）access → verifyAccess 通过（A-T20 双值对齐点）", async () => {
    const claims = await verifyAccess(await signWithIssuer(AUTH_ISSUER_CONTAINER, "access"));
    expect(claims).toMatchObject({ userId: "u-iss", tier: "PRO" });
  });

  it("⑬ 伪造 iss access → verifyAccess null", async () => {
    expect(await verifyAccess(await signWithIssuer("http://evil.example.com", "access"))).toBeNull();
  });

  it("⑭ 容器 iss refresh → verifyRefresh 通过；伪造 iss → null", async () => {
    const ok = await verifyRefresh(await signWithIssuer(AUTH_ISSUER_CONTAINER, "refresh"));
    expect(ok).toMatchObject({ userId: "u-iss", jti: `j-r-${AUTH_ISSUER_CONTAINER}` });
    expect(await verifyRefresh(await signWithIssuer("http://evil.example.com", "refresh"))).toBeNull();
  });
});

describe("getSession / requireUserApi", () => {
  it("⑦ 无 Cookie → getSession null", async () => {
    mockCookieStore();
    expect(await getSession()).toBeNull();
  });

  it("⑧ 有有效 access Cookie → 解析出 {userId,tier}", async () => {
    mockCookieStore();
    cookieStore.set("aidean_token", await signAccess({ id: "u-7", tier: "PRO", tokenVersion: 0 }));
    const session = await getSession();
    expect(session).toEqual({ userId: "u-7", tier: "PRO" });
  });

  it("⑨ 会话无效（过期 access）→ requireUserApi 抛 10004", async () => {
    mockCookieStore();
    const nowSec = Math.floor(Date.now() / 1000);
    const expired = await new SignJWT({ tier: "PRO", ver: 0, jti: "j-exp-2" })
      .setProtectedHeader({ alg: "RS256" })
      .setSubject("u-7")
      .setIssuedAt(nowSec - 3600)
      .setExpirationTime(nowSec - 60)
      .setIssuer(AUTH_ISSUER)
      .setAudience(AUTH_AUDIENCE_SELF)
      .sign(await getSigningKey());
    cookieStore.set("aidean_token", expired);

    try {
      await requireUserApi();
      expect.unreachable("should have thrown ApiError");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe(10004);
      expect((err as ApiError).message).toBe("请先登录");
    }
  });

  it("⑩ assertJwtSecret fail-fast：缺失 JWT_SECRET 时抛含指引的中文错误", async () => {
    const { assertJwtSecret } = await import("../../../env-check");
    const prev = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      expect(() => assertJwtSecret()).toThrow(/JWT_SECRET.*apps\/web\/\.env/s);
    } finally {
      process.env.JWT_SECRET = prev;
    }
  });
});
