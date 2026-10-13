/**
 * middleware 登录守卫单测（rebuild-admin-console-and-harden-auth Phase 0）。
 *
 * 覆盖七态：有效 RS256 放行 / 过期拒绝 / 伪造 kid 拒绝 / refresh 混入 access 位拒绝 /
 * /admin 前缀 307 → /admin/login / /admin/login 自身放行 / JWKS 拉取失败 fail-closed。
 *
 * 策略：内存 RSA 密钥对 + mock global fetch 充当 /.well-known/jwks.json，
 * 令牌用 SignJWT 签发（与生产签发路径同库同语义）。middleware 模块级常量
 * （AUTH_ISSUER/JWKS URL）在 import 时固化，故先设 env 再动态 import。
 */
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { NextRequest } from "next/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

const KID = "test-kid-0001";
const ISSUER = "http://localhost:3000";
const JWKS_URL = `${ISSUER}/.well-known/jwks.json`;

const { publicKey, privateKey } = await generateKeyPair("RS256", { modulusLength: 2048 });
const publicJwk = {
  ...(await exportJWK(publicKey)),
  kid: KID,
  alg: "RS256",
  use: "sig",
};

const { middleware } = await import("../../../../middleware");

function makeRequest(path: string, token?: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: token ? { cookie: `aidean_token=${token}` } : {},
  });
}

async function signAccess(claims: Record<string, unknown>, kid = KID): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid })
    .setSubject("user-1")
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience("aidean-web")
    .setExpirationTime("15m")
    .sign(privateKey);
}

const VALID_CLAIMS = { tier: "PRO", ver: 1, jti: "jti-1" };

describe("middleware RS256/JWKS 守卫", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        if (String(input) === JWKS_URL) {
          return new Response(JSON.stringify({ keys: [publicJwk] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response("not found", { status: 404 });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeAll(() => {});

  it("有效 RS256 access → 放行（200，无重定向）", async () => {
    const token = await signAccess(VALID_CLAIMS);
    const res = await middleware(makeRequest("/user/balance", token));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("过期 access → 307 /login?redirect=…", async () => {
    const token = await new SignJWT(VALID_CLAIMS)
      .setProtectedHeader({ alg: "RS256", kid: KID })
      .setSubject("user-1")
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience("aidean-web")
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(privateKey);
    const res = await middleware(makeRequest("/user/balance", token));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?redirect=%2Fuser%2Fbalance"
    );
  });

  it("kid 不在 JWKS（伪造/跨环境令牌）→ 307", async () => {
    // 用同一 JWKS 内不含的 kid 签发：createRemoteJWKSet 选钥即抛 → fail-closed
    const token = await signAccess(VALID_CLAIMS, "forged-kid");
    const res = await middleware(makeRequest("/user/balance", token));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?redirect=");
  });

  it("refresh 令牌混入 access 位（缺 tier/ver claims）→ 307", async () => {
    const token = await new SignJWT({ typ: "refresh", ver: 1 })
      .setProtectedHeader({ alg: "RS256", kid: KID })
      .setSubject("user-1")
      .setJti("jti-refresh")
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience("aidean-web")
      .setExpirationTime("7d")
      .sign(privateKey);
    const res = await middleware(makeRequest("/user/balance", token));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?redirect=");
  });

  it("匿名访问 /admin/* → 307 /admin/login?redirect=…（而非 /login）", async () => {
    const res = await middleware(makeRequest("/admin/users"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/admin/login?redirect=%2Fadmin%2Fusers"
    );
  });

  it("匿名访问 /admin/login 自身放行（防重定向环）", async () => {
    const res = await middleware(makeRequest("/admin/login"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("JWKS 拉取失败且无缓存公钥 → fail-closed 307（不 crash）", async () => {
    // jose 有 stale-if-error 缓存：已有缓存公钥时 JWKS 故障仍可验签（高可用语义）。
    // fail-closed 分支须在缓存为空的全新模块单例下验证 → resetModules 重取单例。
    vi.resetModules();
    const fresh = await import("../../../../middleware");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 500 }))
    );
    const token = await signAccess(VALID_CLAIMS);
    const res = await fresh.middleware(makeRequest("/user/console", token));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?redirect=");
  });

  it("匿名访问 /user/* → 307 /login（原语义保持）", async () => {
    const res = await middleware(makeRequest("/user/console"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?redirect=%2Fuser%2Fconsole");
  });

  it("RC-02：伪造 Host（0.0.0.0）→ /user/* Location origin 恒为 AUTH_ISSUER", async () => {
    const req = new NextRequest("http://0.0.0.0:3000/user/console");
    const res = await middleware(req);
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toBe("http://localhost:3000/login?redirect=%2Fuser%2Fconsole");
    expect(loc).not.toContain("0.0.0.0");
  });

  it("RC-02：伪造 Host（0.0.0.0）+ /admin 分流 → /admin/login origin 恒为 AUTH_ISSUER", async () => {
    const req = new NextRequest("http://0.0.0.0:3000/admin/users");
    const res = await middleware(req);
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toBe("http://localhost:3000/admin/login?redirect=%2Fadmin%2Fusers");
    expect(loc).not.toContain("0.0.0.0");
  });
});
