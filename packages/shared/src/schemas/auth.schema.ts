import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // A.0.1：nickname 收敛为必填（1-32），由页面注册表单保证提供
  nickname: z.string().min(1).max(32),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const WechatLoginSchema = z.object({
  code: z.string().min(1),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

/** 邮箱验证码：发送入参（登录方案 M4 E-S2；通道承担注册+登录，未注册邮箱核验通过自动建号） */
export const EmailCodeRequestSchema = z.object({
  email: z.string().email(),
});

/** 邮箱验证码：核验入参（E-S3；6 位数字） */
export const EmailCodeVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "验证码为 6 位数字"),
});

/**
 * 用户公开字段(不含任何敏感列)。
 * A.0.1：结构性兼容 user.schema 的 UserProfile 形状——tier 为可选以保持
 * 既有信封向后兼容（旧载荷无 tier 仍通过；register/login/me 响应恒回 tier）。
 */
const PublicUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  nickname: z.string().nullable(),
  tier: z.enum(["NORMAL", "PRO", "MAX"]).optional(),
});

export const AuthResponseSchema = z.object({
  user: PublicUserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.string(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type WechatLoginInput = z.infer<typeof WechatLoginSchema>;
export type RefreshInput = z.infer<typeof RefreshSchema>;
export type EmailCodeRequestInput = z.infer<typeof EmailCodeRequestSchema>;
export type EmailCodeVerifyInput = z.infer<typeof EmailCodeVerifySchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
