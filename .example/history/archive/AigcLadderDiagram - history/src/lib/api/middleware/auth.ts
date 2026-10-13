/**
 * API认证中间件 - 统一代理层
 * 所有认证逻辑统一由 @/lib/auth/ 提供，避免JWT_SECRET等配置重复定义
 *
 * 认证核心: @/lib/auth/jwt.ts (Token生成/验证)
 * 权限核心: @/lib/auth/rbac.ts (RBAC权限)
 * 中间件核心: @/lib/auth/middleware.ts (withAuth/withAdmin/withOptionalAuth)
 */

export {
  withAuth,
  withOptionalAuth,
  withAdmin,
  withPermission,
  withOwnership,
  withTokenRefresh,
  withPublic,
  extractTokenFromRequest,
} from '@/lib/auth/middleware';

export type { UserRoleInfo } from '@/lib/auth/rbac';

export {
  verifyAccessToken,
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  getAccessTokenFromCookie,
  getRefreshTokenFromCookie,
  setTokenCookies,
  clearTokenCookies,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@/lib/auth/jwt';

export type { AccessTokenPayload, RefreshTokenPayload } from '@/lib/auth/jwt';

export {
  getUserPermissions,
  hasPermission as checkPermission,
  isAdmin,
  ROLE_PERMISSIONS,
} from '@/lib/auth/rbac';

export type { Resource, Action } from '@/lib/auth/rbac';

// auth单例和内部类型通过 @/lib/auth 直接导入
// 此代理层仅导出中间件和JWT工具函数
