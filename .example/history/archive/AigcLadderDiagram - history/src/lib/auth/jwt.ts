/**
 * JWT Authentication System
 * Access Token + Refresh Token 双Token机制
 * Access Token: 15分钟有效期，存储于内存
 * Refresh Token: 7天有效期，存储于HttpOnly Cookie
 */

import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

// Token配置
export const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15分钟（秒）
export const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7天（秒）
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'aidean-dev-secret-key-at-least-32-characters'
);

// Token Payload类型
export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access';
  exp?: number;
  iat?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
  version: number; // 用于Token吊销
}

// Cookie名称
export const ACCESS_TOKEN_COOKIE = 'aidean_access_token';
export const REFRESH_TOKEN_COOKIE = 'aidean_refresh_token';

/**
 * 生成Access Token
 */
export async function generateAccessToken(payload: Omit<AccessTokenPayload, 'type'>): Promise<string> {
  return await new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_EXPIRY}s`)
    .sign(JWT_SECRET);
}

/**
 * 生成Refresh Token
 */
export async function generateRefreshToken(payload: Omit<RefreshTokenPayload, 'type'>): Promise<string> {
  return await new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_EXPIRY}s`)
    .sign(JWT_SECRET);
}

/**
 * 验证Access Token
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== 'access') return null;
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
      type: 'access',
    };
  } catch {
    return null;
  }
}

/**
 * 验证Refresh Token
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== 'refresh') return null;
    return {
      userId: payload.userId as string,
      type: 'refresh',
      version: payload.version as number,
    };
  } catch {
    return null;
  }
}

/**
 * 从Cookie获取Access Token
 */
export async function getAccessTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE);
  return token?.value || null;
}

/**
 * 从Cookie获取Refresh Token
 */
export async function getRefreshTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(REFRESH_TOKEN_COOKIE);
  return token?.value || null;
}

/**
 * 设置Token Cookie
 */
export async function setTokenCookies(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const cookieStore = await cookies();
  
  // Access Token Cookie
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: ACCESS_TOKEN_EXPIRY,
    path: '/',
  });
  
  // Refresh Token Cookie
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_EXPIRY,
    path: '/api/v1/auth/refresh', // 仅用于刷新端点
  });
}

/**
 * 清除Token Cookie
 */
export async function clearTokenCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

/**
 * 获取Token剩余有效时间（秒）
 */
export async function getTokenExpiry(token: string): Promise<number> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const exp = payload.exp;
    if (!exp) return 0;
    return Math.max(0, exp - Math.floor(Date.now() / 1000));
  } catch {
    return 0;
  }
}
