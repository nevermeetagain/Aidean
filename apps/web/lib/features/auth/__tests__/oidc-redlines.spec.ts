/**
 * TASK-077 · OIDC 安全红线回归测试（REQ-F-056 / FIX-06 / 子平台SSO接入指南 §6-§7）。
 *
 * 三条红线各一个「失败路径」用例（红不成立 = 安全缺陷，须停机上报）：
 *   R1 PKCE 仅 S256：authorize 端点 `code_challenge_method≠S256`（含 plain）→ 回跳携带 error=invalid_request，绝不签发 code。
 *   R2 refresh 重放：同一 refresh 复用 → 第二次 `invalid_grant`，且整条链撤销（合法轮换代 gen1 亦失效）。
 *   R3 host-only Cookie：登录种下的 Set-Cookie 不含 `Domain=`（HttpOnly + SameSite=lax），禁父域扩散共享登录态。
 *
 * 策略（沿用同域既有测试风格）：
 *   - R1 仿 oauth-redirect-origin.spec：vi.mock session/clients/codes，真调 authorize GET。
 *   - R2 仿 refresh-replay-alert.spec：真 tokens(RS256 离线密钥) + 真 repository + 内存 prisma，真调 /oauth/token POST。
 *   - R3 仿 routes-auth.spec：doMock service/rate-limit，真调 login POST，断言序列化后的 Set-Cookie 头。
 *
 * 禁止修改 auth 源码（只读）；本文件为唯一新增交付物。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.JWT_SECRET = process.env.JWT_SECRET ?? "unit-test-secret-aidean";

// —— 内存 Prisma（R2 真 repository 的数据底座；vi.hoisted 保证跨 resetModules 同源）——
const h = vi.hoisted(() => {
  const users: Record<string, Record<string, unknown>> = {
    "u-1": { id: "u-1", email: "a@b.co", nickname: "阿典", tier: "PRO", status: "ACTIVE", tokenVersion: 0 },
  };
  const refreshStore = new Map<string, Record<string, unknown>>();
  const prismaMock = {
    user: {
      findUnique: async ({ where }: { where: { id?: string; email?: string } }) => {
        if (where.id) return users[where.id] ?? null;
        if (where.email) return Object.values(users).find((u) => u.email === where.email) ?? null;
        return null;
      },
      update: async () => ({}),
    },
    refreshToken: {
      findUnique: async ({ where }: { where: { jti: string } }) => refreshStore.get(where.jti) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        refreshStore.set(String(data.jti), { rotatedAt: null, revokedAt: null, ...data });
      },
      update: async ({ where, data }: { where: { jti: string }; data: Record<string, unknown> }) => {
        const r = refreshStore.get(where.jti);
        if (r) Object.assign(r, data);
        return r;
      },
      updateMany: async ({ where, data }: { where: { chainId?: string; revokedAt?: null }; data: Record<string, unknown> }) => {
        let count = 0;
        for (const r of refreshStore.values()) {
          const matchChain = where.chainId === undefined || r.chainId === where.chainId;
          const matchRevoked = where.revokedAt === undefined || r.revokedAt === where.revokedAt;
          if (matchChain && matchRevoked) {
            Object.assign(r, data);
            count += 1;
          }
        }
        return { count };
      },
    },
    // TTL getter（constants 动态 import）读不到行 → 走默认值（900/604800）
    systemConfig: { findUnique: async () => null },
    oidcUserConsent: { findUnique: async () => null },
  };
  return { users, refreshStore, prismaMock };
});

vi.mock("../../../db/prisma", () => ({ prisma: h.prismaMock }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: () => undefined })) }));

// —— clients（R1 authorize + R2 token 共用）——
const CLIENT = {
  clientId: "aidean-bot",
  name: "AideanBot",
  firstParty: true,
  pkceRequired: false,
  scopes: ["openid", "profile"],
};
const clientsMock = {
  getActiveClient: vi.fn(async () => CLIENT),
  verifyClientSecret: vi.fn(() => true),
  isRedirectUriAllowed: vi.fn(() => true),
  resolveScopes: vi.fn(() => ["openid"]),
};
vi.mock("../../../features/oauth/clients", () => ({ oidcClientService: clientsMock }));

// —— session（R1 authorize 登录态）——
const sessionMock = { getSession: vi.fn() };
vi.mock("../../../features/auth/session", () => ({ getSession: (...a: unknown[]) => sessionMock.getSession(...a) }));

// —— codes：保留真实模块（真验 verifyPkce/s256Challenge），仅桩 issueAuthorizationCode（authorize 签发用）——
vi.mock("../../../features/oauth/codes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../features/oauth/codes")>();
  return {
    ...actual,
    issueAuthorizationCode: vi.fn(async () => ({ code: "CODE-OK-1", expiresInSeconds: 60 })),
  };
});

// —— 被测路由（vitest include 仅 lib/**，故相对路径直调 route handler）——
const { GET: authorizeGET } = await import("../../../../app/oauth/authorize/route");
const { POST: tokenPOST } = await import("../../../../app/oauth/token/route");

// R2/R3 需要的真实原语（真 repository/tokens，绑定内存 prisma / 离线 RS256 密钥）
import { authRepository } from "../repository";
import { signRefresh } from "../tokens";
import { baseCookieOptions, COOKIE_ACCESS, COOKIE_REFRESH } from "../constants";
// codes 模块经 importOriginal 保留真实实现，故此处 import 到的是真 verifyPkce/s256Challenge
import { verifyPkce, s256Challenge } from "../../oauth/codes";

const REDIRECT_URI = "http://localhost:3200/auth/aidean/callback";

function authorizeUrl(params: Record<string, string>): string {
  const u = new URL("http://localhost:3000/oauth/authorize");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

function tokenRequest(body: Record<string, string>): Request {
  const basic = Buffer.from(`${CLIENT.clientId}:secret-x`).toString("base64");
  return new Request("http://localhost:3000/oauth/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams(body).toString(),
  });
}

beforeEach(() => {
  h.refreshStore.clear();
  vi.clearAllMocks();
  clientsMock.getActiveClient.mockReset(); // 清 Once 队列，防跨用例串味（clearAllMocks 不清 Once）
  clientsMock.getActiveClient.mockResolvedValue(CLIENT as never);
  clientsMock.verifyClientSecret.mockReturnValue(true);
  clientsMock.isRedirectUriAllowed.mockReturnValue(true);
  clientsMock.resolveScopes.mockReturnValue(["openid"] as never);
});

// ============================ R1：PKCE 仅 S256 ============================
describe("R1 PKCE：plain 必须被拒（仅 S256），失败路径回跳 invalid_request", () => {
  const base = {
    response_type: "code",
    client_id: CLIENT.clientId,
    redirect_uri: REDIRECT_URI,
    scope: "openid",
    state: "st-1",
  };

  it("带 code_challenge 但 method=plain → 回跳携带 error=invalid_request，且绝不签发 code", async () => {
    sessionMock.getSession.mockResolvedValue({ userId: "u-1", tier: "PRO" });
    const res = await authorizeGET(
      new Request(authorizeUrl({ ...base, code_challenge: "plainchallenge", code_challenge_method: "plain" }))
    );
    // authorize 是浏览器交互流：错误经 redirect_uri 回传（NextResponse.redirect 默认 307，非 400 文本页）
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    const q = new URL(loc).searchParams;
    expect(q.get("error")).toBe("invalid_request");
    expect(q.get("error_description")).toMatch(/S256/i);
    expect(q.get("state")).toBe("st-1"); // 携 state 防 CSRF 关联丢失
    expect(q.get("code")).toBeNull(); // 未签发授权码
  });

  it("对照组：method=S256 → 通过 PKCE 方法门禁，正常签发 code（证明被拒源于方法而非 challenge 缺失）", async () => {
    sessionMock.getSession.mockResolvedValue({ userId: "u-1", tier: "PRO" });
    const res = await authorizeGET(
      new Request(authorizeUrl({ ...base, code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM", code_challenge_method: "S256" }))
    );
    expect(res.status).toBe(307);
    const q = new URL(res.headers.get("location") ?? "").searchParams;
    expect(q.get("error")).toBeNull();
    expect(q.get("code")).toBe("CODE-OK-1");
  });

  it("缺 method（默认空串≠S256）且带 challenge → 同样 invalid_request（仅严格 S256 放行）", async () => {
    sessionMock.getSession.mockResolvedValue({ userId: "u-1", tier: "PRO" });
    const res = await authorizeGET(new Request(authorizeUrl({ ...base, code_challenge: "abc" })));
    const q = new URL(res.headers.get("location") ?? "").searchParams;
    expect(q.get("error")).toBe("invalid_request");
    expect(q.get("state")).toBe("st-1"); // 携 state 防 CSRF 关联丢失
    expect(q.get("code")).toBeNull(); // 未签发授权码
  });

  it("pkceRequired 客户端缺 code_challenge → invalid_request（公共客户端强制 PKCE，检查先于登录态）", async () => {
    clientsMock.getActiveClient.mockResolvedValueOnce({ ...CLIENT, pkceRequired: true } as never);
    sessionMock.getSession.mockResolvedValue({ userId: "u-1", tier: "PRO" });
    const res = await authorizeGET(new Request(authorizeUrl({ ...base }))); // 无 code_challenge
    const q = new URL(res.headers.get("location") ?? "").searchParams;
    expect(q.get("error")).toBe("invalid_request");
    expect(q.get("error_description")).toMatch(/required/i); // "code_challenge required"
    expect(q.get("state")).toBe("st-1");
    expect(q.get("code")).toBeNull();
    // 锁死顺序：PKCE 门禁（route L68-71）早于登录态查询（route L82），故 getSession 不应被调用
    expect(sessionMock.getSession).not.toHaveBeenCalled();
  });
});

// ============================ R1 机制层：verifyPkce 只认 S256 ============================
describe("R1 补充 verifyPkce 机制层：S256 匹配通过；plain 兜底与长度不合规必拒（codes.ts L77 真实实现）", () => {
  const verifier = "a".repeat(48); // 48 字符，落在 RFC 7636 §4.1 [43,128] 区间

  it("verifier 与 s256Challenge(verifier) 一致 → true（S256 正确路径）", () => {
    expect(verifyPkce(verifier, s256Challenge(verifier))).toBe(true);
  });

  it("plain 兜底（challenge 直接等于 verifier）→ false：S256-only 校验拒绝明文比对", () => {
    expect(verifyPkce(verifier, verifier)).toBe(false);
  });

  it("verifier 长度 < 43（下限门）→ false，即便 challenge=其 s256 也不放行", () => {
    const short = "tooshort";
    expect(verifyPkce(short, s256Challenge(short))).toBe(false);
  });

  it("verifier 长度 > 128（上限门）→ false", () => {
    const long = "a".repeat(129);
    expect(verifyPkce(long, s256Challenge(long))).toBe(false);
  });
});

// ============================ R2：refresh 重放 → 整链失效 ============================
describe("R2 refresh 重放：旧值复用 → invalid_grant + 整链撤销（合法代亦失效）", () => {
  async function seedFirstGen(): Promise<{ token: string; jti: string }> {
    // 真签发 refresh（aud/clientId = CLIENT），首代落库 chainId=jti（真 repository）
    const gen0 = await signRefresh("u-1", 0, { audience: CLIENT.clientId, clientId: CLIENT.clientId });
    await authRepository.createRefreshTokenRecord({
      jti: gen0.jti,
      userId: "u-1",
      clientId: CLIENT.clientId,
      chainId: gen0.jti,
      rotatedFrom: null,
      expiresAt: gen0.expiresAt,
      userAgent: null,
      ip: null,
    });
    return { token: gen0.token, jti: gen0.jti };
  }

  it("gen0 正常刷新成功 → gen0 重放 invalid_grant → gen1（同链合法代）亦被撤销", async () => {
    const gen0 = await seedFirstGen();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      // ① 首次消费 gen0 → 200，轮换出 gen1
      const r1 = await tokenPOST(tokenRequest({ grant_type: "refresh_token", refresh_token: gen0.token }));
      expect(r1.status).toBe(200);
      const body1 = (await r1.json()) as { refresh_token?: string; error?: string };
      expect(typeof body1.refresh_token).toBe("string");
      const gen1Token = body1.refresh_token as string;

      // gen0 已标记 rotatedAt
      const row0 = h.refreshStore.get(gen0.jti) as { rotatedAt: unknown };
      expect(row0.rotatedAt).not.toBeNull();

      // ② 重放 gen0 → 400 invalid_grant（consumeRefreshToken 命中 replayed → 整链撤销）
      const r2 = await tokenPOST(tokenRequest({ grant_type: "refresh_token", refresh_token: gen0.token }));
      expect(r2.status).toBe(400);
      const body2 = (await r2.json()) as { error?: string };
      expect(body2.error).toBe("invalid_grant");

      // 红线②伴生：重放须触发 auth-security/refresh_replay 结构化告警（chainId 锚定 gen0 链）
      const replayAlerts = errSpy.mock.calls
        .map((args) => String(args[0]))
        .filter((s) => s.startsWith('{"tag":"auth-security"') && s.includes('"event":"refresh_replay"'))
        .map((s) => JSON.parse(s) as { tag: string; event: string; chainId: string });
      expect(
        replayAlerts.some((p) => p.tag === "auth-security" && p.event === "refresh_replay" && p.chainId === gen0.jti)
      ).toBe(true);

      // ③ 整链失效验证：合法轮换代 gen1 此时也被撤销 → 再刷 invalid_grant
      const r3 = await tokenPOST(tokenRequest({ grant_type: "refresh_token", refresh_token: gen1Token }));
      expect(r3.status).toBe(400);
      expect(((await r3.json()) as { error?: string }).error).toBe("invalid_grant");
    } finally {
      errSpy.mockRestore();
    }
  });

  it("非 ok 消费统一 invalid_grant：未知/伪造 refresh 令牌 → 400 invalid_grant（不签发）", async () => {
    const res = await tokenPOST(tokenRequest({ grant_type: "refresh_token", refresh_token: "not-a-valid-jwt" }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error?: string }).error).toBe("invalid_grant");
  });
});

// ============================ R3：host-only Cookie（无 Domain） ============================
describe("R3 host-only Cookie：登录种下的 Set-Cookie 不含 Domain=（禁父域共享登录态）", () => {
  it("baseCookieOptions() 不含 domain 键（机制层）", () => {
    const opts = baseCookieOptions() as Record<string, unknown>;
    expect("domain" in opts).toBe(false);
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
  });

  it("真 login 路由成功 → 序列化 Set-Cookie 无 `Domain=`，且 HttpOnly + SameSite=lax（效果层）", async () => {
    // 仅本用例需要：service/限流 打桩，其余（repository/tokens/keys）保持真实
    vi.doMock("../../../features/auth/service", () => ({
      authService: {
        login: vi.fn(async () => ({ id: "u-1", email: "a@b.co", nickname: "阿典", tier: "PRO", tokenVersion: 0 })),
      },
    }));
    vi.doMock("../../../rate-limit", () => ({
      checkFixedWindow: vi.fn(async () => ({ allowed: true, remaining: 19 })),
      clientIpFrom: vi.fn(() => "127.0.0.1"),
    }));

    const { POST: loginPOST } = await import("../../../../app/api/v1/auth/login/route");
    const req = new Request("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.co", password: "longenough1" }),
    });
    const res = await loginPOST(req);
    expect(res.status).toBe(200);

    const setCookies = res.headers.getSetCookie();
    expect(setCookies.length).toBeGreaterThan(0);
    // 两种会话 Cookie 均种下
    expect(setCookies.some((c) => c.startsWith(`${COOKIE_ACCESS}=`))).toBe(true);
    expect(setCookies.some((c) => c.startsWith(`${COOKIE_REFRESH}=`))).toBe(true);
    // 红线：任何一条 Set-Cookie 都不得带 Domain=（host-only）
    for (const c of setCookies) {
      expect(/;\s*Domain=/i.test(c)).toBe(false);
      expect(/HttpOnly/i.test(c)).toBe(true);
      expect(/SameSite=lax/i.test(c)).toBe(true);
    }

    vi.doUnmock("../../../features/auth/service");
    vi.doUnmock("../../../rate-limit");
  });
});
