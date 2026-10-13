/**
 * 启动期环境变量 fail-fast 检查（Task A.1.1）。
 *
 * 用途：认证令牌签发前强制核验 JWT_SECRET 存在；缺失即抛出含修复指引的中文错误，
 * 避免密钥静默回落到不安全默认值。
 */
export function assertJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      "环境变量缺失：JWT_SECRET（用于签发会话令牌），请在 apps/web/.env 配置"
    );
  }
  return secret;
}
