/**
 * Aidean 认证系统
 * 支持：JWT Token + API Key 双重认证
 * 
 * 功能：
 * 1. JWT Token生成与验证
 * 2. Refresh Token机制
 * 3. API Key认证
 * 4. 登录加密（bcrypt）
 * 5. 过期时间管理
 * 6. 权限控制（RBAC）
 */

import { SignJWT, jwtVerify, JWTVerifyResult } from 'jose';
import { compare, hash } from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { redis, RedisKeys, RedisTTL } from '@/lib/redis';

// ============================================
// 类型定义
// ============================================

export enum UserRole {
  GUEST = 0,        // 游客
  USER = 1,         // 普通用户
  VIP = 2,          // VIP用户
  PREMIUM = 3,      // 高级会员
  MODERATOR = 10,   // 版主
  ADMIN = 99,       // 管理员
  SUPER_ADMIN = 100,// 超级管理员
}

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  API_KEY = 'api_key',
}

export interface JWTPayload {
  sub: string;           // user ID
  email: string;         // 用户邮箱
  role: UserRole;        // 用户角色
  type: TokenType;       // Token类型
  iat: number;           // 签发时间
  exp: number;           // 过期时间
  jti: string;           // Token唯一标识
  iss: string;           // 签发者
  aud: string;           // 受众
}

export interface UserSession {
  userId: string;
  email: string;
  nickname: string;
  avatar?: string;
  role: UserRole;
  balance: number;
  expiresAt: number;
}

export interface APIKeyConfig {
  keyId: string;
  userId: string;
  name: string;
  permissions: string[];
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  expiresAt?: number;
  lastUsedAt?: number;
  createdAt: number;
}

export interface AuthConfig {
  jwtSecret: string;
  accessTokenExpiry: number;  // 秒
  refreshTokenExpiry: number; // 秒
  apiKeyExpiry: number;       // 秒，0表示永久
  bcryptRounds: number;
  issuer: string;
  audience: string;
}

// ============================================
// 默认配置
// ============================================

const DEFAULT_AUTH_CONFIG: AuthConfig = {
  jwtSecret: process.env.JWT_SECRET || 'aidean-dev-secret-key-min-32-chars-long',
  accessTokenExpiry: 7200,      // 2小时
  refreshTokenExpiry: 604800,   // 7天
  apiKeyExpiry: 0,              // 永久（需手动撤销）
  bcryptRounds: 12,
  issuer: 'aidean',
  audience: 'aidean-users',
};

// ============================================
// 认证错误类
// ============================================

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ============================================
// 认证服务类
// ============================================

class AuthService {
  private config: AuthConfig;
  private secretKey: Uint8Array;

  constructor(config: Partial<AuthConfig> = {}) {
    this.config = { ...DEFAULT_AUTH_CONFIG, ...config };
    this.secretKey = new TextEncoder().encode(this.config.jwtSecret);
  }

  // ============================================
  // JWT Token 操作
  // ============================================

  /**
   * 生成Access Token
   */
  async generateAccessToken(
    userId: string,
    email: string,
    role: UserRole,
    additionalClaims: Record<string, unknown> = {}
  ): Promise<string> {
    const jti = this.generateTokenId();
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.config.accessTokenExpiry;

    const token = await new SignJWT({
      sub: userId,
      email,
      role,
      type: TokenType.ACCESS,
      jti,
      ...additionalClaims,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .sign(this.secretKey);

    // 存储Token元数据到Redis（用于吊销检查）
    const sessionKey = RedisKeys.user.session(token);
    await redis.hset(sessionKey, {
      userId,
      email,
      role,
      jti,
      createdAt: now,
      expiresAt: exp,
    });
    await redis.expire(sessionKey, this.config.accessTokenExpiry);

    return token;
  }

  /**
   * 生成Refresh Token
   */
  async generateRefreshToken(userId: string): Promise<string> {
    const jti = this.generateTokenId();
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.config.refreshTokenExpiry;

    const token = await new SignJWT({
      sub: userId,
      type: TokenType.REFRESH,
      jti,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .sign(this.secretKey);

    // 存储Refresh Token到Redis
    const refreshKey = RedisKeys.user.refreshToken(userId);
    await redis.set(refreshKey, JSON.stringify({
      token,
      jti,
      createdAt: now,
      expiresAt: exp,
    }), { ttl: this.config.refreshTokenExpiry });

    return token;
  }

  /**
   * 验证JWT Token
   */
  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const result = await jwtVerify(token, this.secretKey, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      }) as JWTVerifyResult & { payload: JWTPayload };

      const payload = result.payload;

      // 检查Token是否被吊销
      const sessionKey = RedisKeys.user.session(token);
      const exists = await redis.exists(sessionKey);
      if (!exists && payload.type === TokenType.ACCESS) {
        throw new AuthError('Token has been revoked', 'TOKEN_REVOKED', 401);
      }

      return payload;
    } catch (error) {
      if (error instanceof AuthError) throw error;
      
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          throw new AuthError('Token has expired', 'TOKEN_EXPIRED', 401);
        }
        throw new AuthError('Invalid token', 'TOKEN_INVALID', 401);
      }
      
      throw new AuthError('Token verification failed', 'TOKEN_VERIFICATION_FAILED', 401);
    }
  }

  /**
   * 刷新Access Token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  }> {
    // 1. 验证Refresh Token
    const payload = await this.verifyToken(refreshToken);
    
    if (payload.type !== TokenType.REFRESH) {
      throw new AuthError('Invalid token type', 'INVALID_TOKEN_TYPE', 401);
    }

    const userId = payload.sub;

    // 2. 检查Redis中的Refresh Token是否匹配
    const refreshKey = RedisKeys.user.refreshToken(userId);
    const stored = await redis.get<{ token: string; jti: string }>(refreshKey);
    
    if (!stored || stored.token !== refreshToken) {
      throw new AuthError('Refresh token has been revoked', 'REFRESH_TOKEN_REVOKED', 401);
    }

    // 3. 吊销旧的Token
    await this.revokeRefreshToken(userId);

    // 4. 获取用户信息（从缓存或数据库）
    const userKey = RedisKeys.user.profile(userId);
    const userData = await redis.hgetall<{
      email: string;
      nickname: string;
      role: number;
    }>(userKey);

    if (!userData) {
      throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
    }

    // 5. 生成新的Token对
    const newAccessToken = await this.generateAccessToken(
      userId,
      userData.email,
      userData.role as UserRole
    );
    const newRefreshToken = await this.generateRefreshToken(userId);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + this.config.accessTokenExpiry,
    };
  }

  /**
   * 吊销Access Token
   */
  async revokeAccessToken(token: string): Promise<void> {
    const sessionKey = RedisKeys.user.session(token);
    await redis.del(sessionKey);
  }

  /**
   * 吊销Refresh Token
   */
  async revokeRefreshToken(userId: string): Promise<void> {
    const refreshKey = RedisKeys.user.refreshToken(userId);
    await redis.del(refreshKey);
  }

  /**
   * 吊销用户所有Token
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    // 吊销Refresh Token
    await this.revokeRefreshToken(userId);
    
    // 吊销所有Access Token（通过扫描匹配模式）
    const pattern = `aidean:user:session:*`;
    const keys = await redis.scan(pattern);
    
    for (const key of keys) {
      const session = await redis.hgetall<{ userId: string }>(key);
      if (session && session.userId === userId) {
        await redis.del(key);
      }
    }
  }

  // ============================================
  // 密码加密
  // ============================================

  /**
   * 哈希密码
   */
  async hashPassword(password: string): Promise<string> {
    return await hash(password, this.config.bcryptRounds);
  }

  /**
   * 验证密码
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await compare(password, hashedPassword);
  }

  // ============================================
  // API Key 管理
  // ============================================

  /**
   * 生成API Key
   */
  async generateAPIKey(
    userId: string,
    name: string,
    permissions: string[] = [],
    expiresDays?: number
  ): Promise<{ keyId: string; apiKey: string; config: APIKeyConfig }> {
    const keyId = this.generateTokenId();
    const secretPart = randomBytes(32).toString('base64url');
    const apiKey = `aid_${keyId}_${secretPart}`;

    const now = Math.floor(Date.now() / 1000);
    const config: APIKeyConfig = {
      keyId,
      userId,
      name,
      permissions,
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerDay: 10000,
      },
      expiresAt: expiresDays ? now + expiresDays * 86400 : undefined,
      createdAt: now,
    };

    // 存储API Key配置
    const apiKeyHash = this.hashAPIKey(apiKey);
    const apiKeyKey = RedisKeys.user.apiKey(apiKeyHash);
    
    const ttl = expiresDays ? expiresDays * 86400 : undefined;
    await redis.set(apiKeyKey, config, { ttl });

    return { keyId, apiKey, config };
  }

  /**
   * 验证API Key
   */
  async verifyAPIKey(apiKey: string): Promise<APIKeyConfig | null> {
    const apiKeyHash = this.hashAPIKey(apiKey);
    const apiKeyKey = RedisKeys.user.apiKey(apiKeyHash);
    
    const config = await redis.get<APIKeyConfig>(apiKeyKey);
    if (!config) return null;

    // 检查是否过期
    if (config.expiresAt && config.expiresAt < Math.floor(Date.now() / 1000)) {
      await redis.del(apiKeyKey);
      return null;
    }

    // 更新最后使用时间
    config.lastUsedAt = Math.floor(Date.now() / 1000);
    const ttl = await redis.ttl(apiKeyKey);
    await redis.set(apiKeyKey, config, { ttl: ttl > 0 ? ttl : undefined });

    return config;
  }

  /**
   * 吊销API Key
   */
  async revokeAPIKey(apiKey: string): Promise<void> {
    const apiKeyHash = this.hashAPIKey(apiKey);
    const apiKeyKey = RedisKeys.user.apiKey(apiKeyHash);
    await redis.del(apiKeyKey);
  }

  /**
   * 获取用户的所有API Keys
   */
  async getUserAPIKeys(userId: string): Promise<APIKeyConfig[]> {
    const pattern = `aidean:user:apikey:*`;
    const keys = await redis.scan(pattern);
    const configs: APIKeyConfig[] = [];

    for (const key of keys) {
      const config = await redis.get<APIKeyConfig>(key);
      if (config && config.userId === userId) {
        configs.push(config);
      }
    }

    return configs;
  }

  /**
   * 检查API Key权限
   */
  checkAPIKeyPermission(config: APIKeyConfig, requiredPermission: string): boolean {
    // 超级权限
    if (config.permissions.includes('*')) return true;
    
    // 精确匹配
    if (config.permissions.includes(requiredPermission)) return true;
    
    // 通配符匹配（如 "models:*" 匹配 "models:read"）
    return config.permissions.some(permission => {
      if (permission.endsWith(':*')) {
        const prefix = permission.slice(0, -1);
        return requiredPermission.startsWith(prefix);
      }
      return false;
    });
  }

  // ============================================
  // 辅助方法
  // ============================================

  private generateTokenId(): string {
    return createHash('sha256')
      .update(`${Date.now()}-${randomBytes(16).toString('hex')}`)
      .digest('hex')
      .substring(0, 16);
  }

  private hashAPIKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
  }

  /**
   * 获取Token剩余有效期
   */
  getTokenRemainingTime(payload: JWTPayload): number {
    return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
  }

  /**
   * 检查Token是否需要刷新
   */
  shouldRefreshToken(payload: JWTPayload, thresholdSeconds: number = 300): boolean {
    const remaining = this.getTokenRemainingTime(payload);
    return remaining < thresholdSeconds;
  }
}

// ============================================
// 权限检查工具
// ============================================

export class PermissionChecker {
  /**
   * 检查用户是否有指定角色
   */
  static hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
    return userRole >= requiredRole;
  }

  /**
   * 检查用户是否有任意一个指定角色
   */
  static hasAnyRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
    return requiredRoles.some(role => userRole >= role);
  }

  /**
   * 角色层级映射
   */
  static readonly ROLE_HIERARCHY: Record<UserRole, string> = {
    [UserRole.GUEST]: 'guest',
    [UserRole.USER]: 'user',
    [UserRole.VIP]: 'vip',
    [UserRole.PREMIUM]: 'premium',
    [UserRole.MODERATOR]: 'moderator',
    [UserRole.ADMIN]: 'admin',
    [UserRole.SUPER_ADMIN]: 'super_admin',
  };

  /**
   * 获取角色名称
   */
  static getRoleName(role: UserRole): string {
    return this.ROLE_HIERARCHY[role] || 'unknown';
  }
}

// ============================================
// 导出单例
// ============================================

export const auth = new AuthService();

// 默认导出
export default auth;
