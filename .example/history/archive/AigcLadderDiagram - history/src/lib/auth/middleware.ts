/**
 * API认证和授权中间件
 * 用于Next.js API Routes的JWT验证和RBAC权限检查
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  verifyAccessToken, 
  getAccessTokenFromCookie,
  verifyRefreshToken,
  getRefreshTokenFromCookie,
  generateAccessToken,
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_EXPIRY,
} from './jwt';
import { getUserPermissions, hasPermission, Resource, Action, UserRoleInfo } from './rbac';
import { error, unauthorized, forbidden } from '@/lib/api/response';
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors';

// 扩展NextRequest类型
declare module 'next/server' {
  interface NextRequest {
    user?: UserRoleInfo;
  }
}

/**
 * 从请求中提取Token
 * 优先级: 1. Cookie 2. Authorization Header
 */
export async function extractTokenFromRequest(request: NextRequest): Promise<string | null> {
  // 1. 尝试从Cookie获取
  const cookieToken = await getAccessTokenFromCookie();
  if (cookieToken) return cookieToken;
  
  // 2. 尝试从Authorization Header获取
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

/**
 * JWT认证中间件
 * 验证Access Token并附加用户信息到请求
 */
export async function withAuth(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const token = await extractTokenFromRequest(request);
    
    if (!token) {
      return unauthorized('未提供认证Token');
    }
    
    // 验证Token
    const payload = await verifyAccessToken(token);
    if (!payload) {
      return unauthorized('Token无效或已过期');
    }
    
    // 获取用户权限信息
    const userPermissions = await getUserPermissions(payload.userId);
    if (!userPermissions) {
      return unauthorized('用户不存在或已被禁用');
    }
    
    // 附加用户信息到请求
    (request as any).user = {
      ...userPermissions,
      email: payload.email,
    };
    
    return await handler(request);
  } catch (err) {
    console.error('认证中间件错误:', err);
    return error(new AuthenticationError('A3AU-003', '认证处理失败'));
  }
}

/**
 * 可选认证中间件
 * 验证Token但不强制要求，用于需要区分登录/未登录用户的场景
 */
export async function withOptionalAuth(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const token = await extractTokenFromRequest(request);
    
    if (token) {
      const payload = await verifyAccessToken(token);
      if (payload) {
        const userPermissions = await getUserPermissions(payload.userId);
        if (userPermissions) {
          (request as any).user = {
            ...userPermissions,
            email: payload.email,
          };
        }
      }
    }
    
    return await handler(request);
  } catch (err) {
    console.error('可选认证中间件错误:', err);
    return await handler(request);
  }
}

/**
 * RBAC权限检查中间件
 * 在认证基础上检查特定权限
 */
export function withPermission(resource: Resource, action: Action) {
  return async function (
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return withAuth(request, async (req) => {
      const user = (req as any).user as UserRoleInfo;
      
      if (!user) {
        return unauthorized('未授权访问');
      }
      
      // 检查权限
      if (!hasPermission(user.permissions, resource, action)) {
        return forbidden(`无权执行此操作，需要权限: ${resource}:${action}`);
      }
      
      return await handler(req);
    });
  };
}

/**
 * 管理员权限检查中间件
 */
export async function withAdmin(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, async (req) => {
    const user = (req as any).user as UserRoleInfo;
    
    if (!user || !user.isAdmin) {
      return forbidden('需要管理员权限');
    }
    
    return await handler(req);
  });
}

/**
 * 资源所有权检查中间件
 * 用于检查用户是否拥有特定资源
 */
export function withOwnership(
  resource: Resource,
  getResourceId: (req: NextRequest) => string
) {
  return async function (
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return withAuth(request, async (req) => {
      const user = (req as any).user as UserRoleInfo;
      const resourceId = getResourceId(req);
      
      // 管理员拥有所有资源权限
      if (user.isAdmin) {
        return await handler(req);
      }
      
      // 检查是否是用户自己的资源
      if (resource === 'user' && resourceId === user.userId) {
        return await handler(req);
      }
      
      // TODO: 实现其他资源的所有权检查
      // const isOwner = await checkResourceOwnership(resource, resourceId, user.userId);
      // if (!isOwner) {
      //   return forbidden('无权访问此资源');
      // }
      
      return await handler(req);
    });
  };
}

/**
 * 刷新Token中间件
 * 自动刷新即将过期的Access Token
 */
export async function withTokenRefresh(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const response = await handler(request);
  
  try {
    const token = await extractTokenFromRequest(request);
    if (token) {
      const payload = await verifyAccessToken(token);
      if (payload) {
        // 如果Token将在5分钟内过期，自动刷新
        const expTime = payload.exp || 0;
        const now = Math.floor(Date.now() / 1000);
        if (expTime - now < 300) {
          // 获取Refresh Token
          const refreshToken = await getRefreshTokenFromCookie();
          if (refreshToken) {
            const refreshPayload = await verifyRefreshToken(refreshToken);
            if (refreshPayload && refreshPayload.userId === payload.userId) {
              // 生成新的Access Token
              const newToken = await generateAccessToken({
                userId: payload.userId,
                email: payload.email,
                role: payload.role,
              });
              
              // 设置新的Cookie
              response.cookies.set(ACCESS_TOKEN_COOKIE, newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: ACCESS_TOKEN_EXPIRY,
                path: '/',
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Token刷新错误:', err);
  }
  
  return response;
}

/**
 * 公开路由处理器（无需认证）
 */
export async function withPublic(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return await handler(request);
}
