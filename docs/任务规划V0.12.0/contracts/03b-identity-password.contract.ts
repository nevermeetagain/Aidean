// V0.12.0 · Identity 增量（REQ-N-012 / REQ-NF-011）。落地：packages/shared/src/schemas/auth.schema.ts
import { z } from "zod";

/** 密码强度：8–72 字节（bcrypt 上限），至少含字母与数字各一。与注册口径一致（复用同一 schema）。 */
export const PasswordStrength = z.string().min(8).max(72).regex(/[A-Za-z]/).regex(/\d/);

/** POST /api/v1/auth/password —— 鉴权：已登录用户（普通用户与管理员同路径；管理员不得借此改他人密码）。
 *  效果（同一事务）：更新哈希 → users.token_version += 1 → 吊销该用户全部 refresh → 为当前设备签发新令牌对（Set-Cookie）。
 *  幂等：非幂等；重复提交第二次旧密不再匹配 → 10003。审计 action=password.change。 */
export const ChangePasswordRequest = z.object({ currentPassword: z.string().min(1), newPassword: PasswordStrength })
  .refine((v) => v.currentPassword !== v.newPassword, { path: ["newPassword"], message: "新密码不能与旧密码相同" });
export const ChangePasswordResponse = z.object({ changed: z.literal(true) });

/** POST /api/v1/auth/password/reset/code —— 匿名。恒返回 {sent:true}（不暴露邮箱是否注册）。
 *  验证码键空间：email-code purpose=reset，与 login 隔离；6 位数字，10 分钟有效，一次性。 */
export const ResetCodeRequest = z.object({ email: z.string().email().max(254) });
export const ResetCodeResponse = z.object({ sent: z.literal(true) });

/** POST /api/v1/auth/password/reset —— 匿名。成功后 token_version += 1 并吊销全部 refresh；不自动登录。
 *  功能开关 auth.password_reset（缺省 off，生产配置 SMTP 后由运营打开）。审计 action=password.reset。 */
export const ResetPasswordRequest = z.object({ email: z.string().email().max(254), code: z.string().regex(/^\d{6}$/), newPassword: PasswordStrength });
export const ResetPasswordResponse = z.object({ reset: z.literal(true) });

/** 会话校验口径（requireUserApi / requireAdminApi）：claims.ver !== users.token_version → UNAUTHENTICATED(10004/401)。
 *  实现：在既有回库查询中追加 tokenVersion 投影（不新增往返）；可选 Redis user:ver:{userId}（60s），启用时 token_version 自增处（封禁、改密、重置）必须同步 DEL。
 *  权限边界不变：管理端 = isStaff + 权限码；用户端端点不接受管理员代操作他人账户。 */
export const SessionVersionRule = z.object({ claimVer: z.number().int().nonnegative(), dbVer: z.number().int().nonnegative() })
  .refine((v) => v.claimVer === v.dbVer, { message: "token version mismatch" });
