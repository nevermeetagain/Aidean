/**
 * OAuth 重定向 origin Contract 路由测（AUTH-01 / RC-02）。
 *
 * Contract：未登录访问 /oauth/authorize、/oauth/consent 时，302/307 的
 * Location origin 恒为公开基址 AUTH_ISSUER（构建期 NEXT_PUBLIC_SITE_URL），
 * 不随请求 Host 头（standalone HOSTNAME=0.0.0.0 / 伪造 Host）变化；
 * 回跳参数 redirect 为站内相对路径，闭环不丢参。
 *
 * 样本 redirect_uri 取子平台在 seed 中的真实回调（seed.ts:365 wechat-rag → localhost:3200）：
 * 承 P-1/P-2=A「旧子平台端口不保留」，T120-03 清掉已退役端口字面量，语义不变（白名单由 mock 放开）。
 *
 * 策略：vi.mock prisma/session/clients/codes 四依赖（route 层无 DB/Redis），
 * 用伪造 Host 的 Request 断言 Location 与回跳参数还原。
 */
import { describe, expect, it, vi } from "vitest";

const getSession = vi.fn();

vi.mock("../../../db/prisma", () => ({
  prisma: { oidcUserConsent: { findUnique: vi.fn(async () => null) } },
}));
vi.mock("../../../features/auth/session", () => ({
  getSession: (...args: unknown[]) => getSession(...args),
}));
vi.mock("../../../features/oauth/clients", () => ({
  oidcClientService: {
    getActiveClient: vi.fn(async () => ({
      clientId: "wechat-rag",
      name: "WechatRAG",
      firstParty: true,
      pkceRequired: false,
    })),
    isRedirectUriAllowed: vi.fn(() => true),
    resolveScopes: vi.fn(() => ["openid"]),
  },
}));
vi.mock("../../../features/oauth/codes", () => ({
  issueAuthorizationCode: vi.fn(),
}));

const { GET: authorizeGET } = await import("../../../../app/oauth/authorize/route");
const { GET: consentGET } = await import("../../../../app/oauth/consent/route");

describe("RC-02：OAuth 未登录重定向 Location origin Contract", () => {
  it("未登录 authorize → 307 login，Location origin == AUTH_ISSUER（伪造 Host 不泄漏）", async () => {
    getSession.mockResolvedValueOnce(null);
    const req = new Request(
      "http://0.0.0.0:3000/oauth/authorize?response_type=code&client_id=wechat-rag&redirect_uri=http%3A%2F%2Flocalhost%3A3200%2Fauth%2Faidean%2Fcallback&scope=openid&state=s1"
    );
    const res = await authorizeGET(req);
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc.startsWith("http://localhost:3000/login?redirect=")).toBe(true);
    expect(loc).not.toContain("0.0.0.0");

    // 回跳闭环：登录页解码 redirect 后还原 authorize 完整参数（不丢参）
    const back = new URL(loc).searchParams.get("redirect") ?? "";
    expect(back.startsWith("/oauth/authorize?")).toBe(true);
    const restored = new URLSearchParams(back.split("?")[1] ?? "");
    expect(restored.get("client_id")).toBe("wechat-rag");
    expect(restored.get("state")).toBe("s1");
    expect(restored.get("redirect_uri")).toBe("http://localhost:3200/auth/aidean/callback");
  });

  it("未登录 consent → 307 login，回跳指向 authorize 且 origin == AUTH_ISSUER", async () => {
    getSession.mockResolvedValueOnce(null);
    const req = new Request(
      "http://0.0.0.0:3000/oauth/consent?client_id=wechat-rag&redirect_uri=http%3A%2F%2Flocalhost%3A3200%2Fcallback&scope=openid&state=s2"
    );
    const res = await consentGET(req);
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc.startsWith("http://localhost:3000/login?redirect=%2Foauth%2Fauthorize")).toBe(true);
    expect(loc).not.toContain("0.0.0.0");
  });

  it("redirect_uri 不在白名单 → 400 文本页（不重定向，防开放重定向）", async () => {
    const { oidcClientService } = await import("../../../features/oauth/clients");
    (oidcClientService.isRedirectUriAllowed as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    const req = new Request(
      "http://0.0.0.0:3000/oauth/authorize?response_type=code&client_id=wechat-rag&redirect_uri=http%3A%2F%2Fevil.example%2Fcb&scope=openid&state=s3"
    );
    const res = await authorizeGET(req);
    expect(res.status).toBe(400);
    expect(res.headers.get("location")).toBeNull();
  });
});
