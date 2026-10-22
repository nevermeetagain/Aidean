/**
 * B11-06 middleware 会话提示 Cookie 单测：只镜像令牌 Cookie 的「存在性」，状态一致时不写 Set-Cookie，
 * 且不改变放行/拦截判定（公开页仍 200 放行，守卫页无令牌仍 307）。
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

const { middleware } = await import("../../../../middleware");

function req(path: string, cookie?: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, { headers: cookie ? { cookie } : {} });
}
const hintSetCookie = (res: Response) =>
  (res.headers.get("set-cookie") ?? "").split(/,(?=\s*\w+=)/).find((c) => c.trim().startsWith("aidean_session_hint="));

describe("middleware × aidean_session_hint", () => {
  beforeEach(() => {
    // 守卫页验签会拉 JWKS：一律失败 → fail-closed（本文件不关心验签结果，只关心提示 Cookie）
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("游客访问公开页：无令牌无提示 → 不写任何提示 Set-Cookie（ISR 响应保持干净）", async () => {
    for (const p of ["/", "/models", "/pricing", "/ladder"]) {
      const res = await middleware(req(p));
      expect(res.headers.get("location")).toBeNull();
      expect(hintSetCookie(res)).toBeUndefined();
    }
  });

  it("有 access 或 refresh 令牌而缺提示 → 写提示（非 HttpOnly、Path=/）", async () => {
    for (const c of ["aidean_token=x", "aidean_refresh=y"]) {
      const sc = hintSetCookie(await middleware(req("/models", c)));
      expect(sc).toMatch(/^aidean_session_hint=1/);
      expect(sc).toMatch(/Path=\//i);
      expect(sc).not.toMatch(/HttpOnly/i);
    }
  });

  it("令牌已无而提示残留 → 清提示（Max-Age=0）", async () => {
    const sc = hintSetCookie(await middleware(req("/", "aidean_session_hint=1")));
    expect(sc).toMatch(/^aidean_session_hint=;/);
    expect(sc).toMatch(/Max-Age=0/i);
  });

  it("状态一致 → 不写 Set-Cookie", async () => {
    expect(hintSetCookie(await middleware(req("/", "aidean_token=x; aidean_session_hint=1")))).toBeUndefined();
  });

  it("守卫判定不变：/user/console 无有效令牌仍 307 → /login，并顺带同步提示", async () => {
    const res = await middleware(req("/user/console", "aidean_refresh=y"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?redirect=%2Fuser%2Fconsole");
    expect(hintSetCookie(res)).toMatch(/^aidean_session_hint=1/);
  });
});
