import { describe, expect, it } from "vitest";
import { AuthResponseSchema, EmailCodeRequestSchema, EmailCodeVerifySchema, LoginSchema, RefreshSchema, RegisterSchema, WechatLoginSchema } from "../schemas/auth.schema";

describe("auth 域契约", () => {
  it("注册:密码不足 8 位拒绝,合法通过", () => {
    expect(RegisterSchema.safeParse({ email: "a@b.co", password: "1234567", nickname: "阿典" }).success).toBe(false);
    expect(RegisterSchema.safeParse({ email: "a@b.co", password: "longenough1", nickname: "阿典" }).success).toBe(true);
  });
  it("登录/微信/刷新入参最小可用", () => {
    expect(LoginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(WechatLoginSchema.safeParse({ code: "wx-code" }).success).toBe(true);
    expect(RefreshSchema.safeParse({ refreshToken: "r" }).success).toBe(true);
  });
  it("AuthResponse 仅含用户公开字段与 tokens", () => {
    const r = AuthResponseSchema.safeParse({
      user: { id: "u1", email: "a@b.co", nickname: null },
      accessToken: "at", refreshToken: "rt", expiresAt: "2026-01-01T00:00:00Z",
    });
    expect(r.success).toBe(true);
  });
  it("邮箱验证码：发送入参仅 email；核验入参限 6 位数字（登录方案 M4）", () => {
    expect(EmailCodeRequestSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
    expect(EmailCodeRequestSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(EmailCodeVerifySchema.safeParse({ email: "a@b.co", code: "123456" }).success).toBe(true);
    expect(EmailCodeVerifySchema.safeParse({ email: "a@b.co", code: "12345" }).success).toBe(false);
    expect(EmailCodeVerifySchema.safeParse({ email: "a@b.co", code: "abcdef" }).success).toBe(false);
  });
});