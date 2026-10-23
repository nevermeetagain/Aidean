/**
 * 站内回跳参数安全校验单测（AUTH-01 / RC-02 重定向 origin 一致性体系）。
 *
 * 覆盖：isSafeInternalRedirect 全边界 + authorize→login 回跳参数
 * 「一次编码→登录页解码→还原授权参数」端到端往返（authorize/route.ts
 * back 构造逻辑的真实模拟，含内层 redirect_uri 双层编码保留）。
 */
import { describe, expect, it } from "vitest";

import { isSafeInternalRedirect } from "../redirect";

const AUTH_ISSUER = "http://localhost:3000";

describe("isSafeInternalRedirect 开放重定向防线", () => {
  it.each([
    ["/user/console", true],
    ["/oauth/authorize?client_id=wechat-rag&state=s1", true],
    ["/", true],
    ["/admin/users?tab=all", true],
    [null, false],
    [undefined, false],
    ["", false],
    ["//evil.com", false],
    ["/\\evil.com", false],
    ["http://evil.com", false],
    ["https://evil.com/x", false],
    ["javascript:alert(1)", false],
    ["user/console", false],
    [" /user/console", false],
  ])("%j → %j", (input, expected) => {
    expect(isSafeInternalRedirect(input)).toBe(expected);
  });
});

describe("authorize→login 回跳参数编码往返", () => {
  it("一次编码后经 URLSearchParams 解码可完整还原授权参数（内层 redirect_uri 编码保留）", () => {
    // 模拟 authorize/route.ts 未登录分支：back 构造 + encodeURIComponent 一次编码
    const originalRedirectUri = "http://localhost:3200/auth/aidean/callback";
    const back = new URL("/oauth/authorize", AUTH_ISSUER);
    back.searchParams.set("client_id", "wechat-rag");
    back.searchParams.set("redirect_uri", originalRedirectUri);
    back.searchParams.set("scope", "openid");
    back.searchParams.set("state", "s1");

    const loginUrl = new URL(
      `/login?redirect=${encodeURIComponent(back.pathname + back.search)}`,
      AUTH_ISSUER
    );

    // 登录页消费端：searchParams.get 自带一次解码
    const decoded = loginUrl.searchParams.get("redirect");
    expect(decoded).not.toBeNull();
    // 回跳值必须是站内相对路径（安全校验通过，登录后才导航）
    expect(isSafeInternalRedirect(decoded)).toBe(true);
    expect(decoded).toBe(
      "/oauth/authorize?client_id=wechat-rag&redirect_uri=" +
        encodeURIComponent(originalRedirectUri) +
        "&scope=openid&state=s1"
    );

    // 登录后回跳 authorize：参数还原为原始值（无二次编码破坏）
    const restored = new URL(decoded as string, AUTH_ISSUER);
    expect(restored.searchParams.get("redirect_uri")).toBe(originalRedirectUri);
    expect(restored.searchParams.get("client_id")).toBe("wechat-rag");
    expect(restored.searchParams.get("state")).toBe("s1");
    expect(restored.searchParams.get("scope")).toBe("openid");
  });
});
