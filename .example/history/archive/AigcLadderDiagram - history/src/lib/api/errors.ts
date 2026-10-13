/**
 * Aidean API Error System
 * 统一错误码体系 AABC-XXX
 * 参考: Stripe API Error Design
 */

// ============================================
// 错误类型枚举
// ============================================

export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE_ERROR',
}

// ============================================
// HTTP状态码映射
// ============================================

export const ErrorHttpStatus: Record<ErrorType, number> = {
  [ErrorType.AUTHENTICATION]: 401,
  [ErrorType.AUTHORIZATION]: 403,
  [ErrorType.VALIDATION]: 422,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.RATE_LIMIT]: 429,
  [ErrorType.CONFLICT]: 409,
  [ErrorType.INTERNAL]: 500,
  [ErrorType.SERVICE_UNAVAILABLE]: 503,
};

// ============================================
// 基础错误类
// ============================================

export class AideanError extends Error {
  public readonly code: string;
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly requestId?: string;

  constructor(
    code: string,
    message: string,
    type: ErrorType,
    details?: Record<string, unknown>,
    requestId?: string
  ) {
    super(message);
    this.name = 'AideanError';
    this.code = code;
    this.type = type;
    this.statusCode = ErrorHttpStatus[type];
    this.details = details;
    this.requestId = requestId;

    // 保持正确的堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        type: this.type,
        ...(this.details && { details: this.details }),
        ...(this.requestId && { request_id: this.requestId }),
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// ============================================
// 具体错误类
// ============================================

export class AuthenticationError extends AideanError {
  constructor(
    code: string = 'A3AU-001',
    message: string = '认证失败',
    details?: Record<string, unknown>
  ) {
    super(code, message, ErrorType.AUTHENTICATION, details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AideanError {
  constructor(
    code: string = 'A3AU-012',
    message: string = '权限不足',
    details?: Record<string, unknown>
  ) {
    super(code, message, ErrorType.AUTHORIZATION, details);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends AideanError {
  public readonly fields: ValidationField[];

  constructor(
    fields: ValidationField[],
    code: string = 'A3CM-012',
    message: string = '数据验证失败'
  ) {
    super(code, message, ErrorType.VALIDATION, { fields });
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

export interface ValidationField {
  field: string;
  message: string;
  code?: string;
  value?: unknown;
}

export class NotFoundError extends AideanError {
  constructor(
    resource: string,
    code: string = 'A3CM-004',
    message: string = `${resource}不存在`
  ) {
    super(code, message, ErrorType.NOT_FOUND, { resource });
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AideanError {
  public readonly retryAfter: number;

  constructor(
    retryAfter: number = 60,
    code: string = 'A3CM-013',
    message: string = '请求过于频繁，请稍后重试'
  ) {
    super(code, message, ErrorType.RATE_LIMIT, { retry_after: retryAfter });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ConflictError extends AideanError {
  constructor(
    code: string = 'A3CM-008',
    message: string = '资源冲突',
    details?: Record<string, unknown>
  ) {
    super(code, message, ErrorType.CONFLICT, details);
    this.name = 'ConflictError';
  }
}

export class InternalError extends AideanError {
  constructor(
    code: string = 'A4CM-001',
    message: string = '服务器内部错误',
    details?: Record<string, unknown>
  ) {
    super(code, message, ErrorType.INTERNAL, details);
    this.name = 'InternalError';
  }
}

export class ServiceUnavailableError extends AideanError {
  constructor(
    code: string = 'A4CM-003',
    message: string = '服务暂不可用',
    details?: Record<string, unknown>
  ) {
    super(code, message, ErrorType.SERVICE_UNAVAILABLE, details);
    this.name = 'ServiceUnavailableError';
  }
}

// ============================================
// 错误工厂函数
// ============================================

export const Errors = {
  // 认证错误
  invalidCredentials: () =>
    new AuthenticationError('A3AU-001', '用户名或密码错误'),
  
  tokenExpired: () =>
    new AuthenticationError('A3AU-002', 'Token已过期'),
  
  invalidToken: () =>
    new AuthenticationError('A3AU-003', '无效的Token'),
  
  refreshTokenExpired: () =>
    new AuthenticationError('A3AU-004', '刷新Token已过期'),
  
  accountLocked: (lockedUntil?: Date) =>
    new AuthenticationError('A3AU-005', '账号已被锁定', {
      locked_until: lockedUntil?.toISOString(),
    }),
  
  accountSuspended: () =>
    new AuthenticationError('A3AU-006', '账号已被禁用'),
  
  tooManyLoginAttempts: () =>
    new AuthenticationError('A3AU-008', '登录次数过多，请稍后重试'),
  
  invalidVerificationCode: () =>
    new AuthenticationError('A3AU-009', '验证码错误'),
  
  invalidApiKey: () =>
    new AuthenticationError('A3AU-010', 'API Key无效'),
  
  apiKeyExpired: () =>
    new AuthenticationError('A3AU-011', 'API Key已过期'),
  
  insufficientPermissions: (required?: string[]) =>
    new AuthorizationError('A3AU-012', '权限不足', { required }),
  
  // 用户错误
  userNotFound: () =>
    new NotFoundError('User', 'A3US-001'),
  
  emailAlreadyExists: () =>
    new ConflictError('A3AU-007', '邮箱已被注册'),
  
  invalidEmailFormat: () =>
    new ValidationError(
      [{ field: 'email', message: '邮箱格式错误', code: 'invalid_format' }],
      'A3US-002'
    ),
  
  invalidPasswordFormat: () =>
    new ValidationError(
      [{ field: 'password', message: '密码格式错误', code: 'invalid_format' }],
      'A3US-003'
    ),
  
  nicknameAlreadyTaken: () =>
    new ConflictError('A3US-005', '昵称已被使用'),
  
  // 模型错误
  modelNotFound: () =>
    new NotFoundError('Model', 'A3MD-001'),
  
  vendorNotFound: () =>
    new NotFoundError('Vendor', 'A3MD-004'),
  
  // 财务错误
  insufficientBalance: () =>
    new ValidationError(
      [{ field: 'amount', message: '余额不足', code: 'insufficient_balance' }],
      'A3FN-001'
    ),
  
  invalidAmount: () =>
    new ValidationError(
      [{ field: 'amount', message: '无效金额', code: 'invalid_amount' }],
      'A3FN-002'
    ),
  
  orderNotFound: () =>
    new NotFoundError('Order', 'A3FN-003'),
  
  orderAlreadyPaid: () =>
    new ConflictError('A3FN-004', '订单已支付'),
  
  paymentFailed: (reason?: string) =>
    new ValidationError(
      [{ field: 'payment', message: reason || '支付失败', code: 'payment_failed' }],
      'A3FN-005'
    ),
  
  // 通用错误
  badRequest: (message?: string) =>
    new ValidationError(
      [{ field: 'general', message: message || '请求参数错误', code: 'bad_request' }],
      'A3CM-001'
    ),
  
  unauthorized: () =>
    new AuthenticationError('A3CM-002', '未授权'),
  
  forbidden: () =>
    new AuthorizationError('A3CM-003', '禁止访问'),
  
  notFound: (resource: string) =>
    new NotFoundError(resource, 'A3CM-004'),
  
  methodNotAllowed: (method: string) =>
    new ValidationError(
      [{ field: 'method', message: `方法 ${method} 不允许`, code: 'method_not_allowed' }],
      'A3CM-005'
    ),
  
  conflict: (message?: string) =>
    new ConflictError('A3CM-008', message || '资源冲突'),
  
  rateLimit: (retryAfter?: number) =>
    new RateLimitError(retryAfter),
  
  internal: (message?: string) =>
    new InternalError('A4CM-001', message || '服务器内部错误'),
  
  serviceUnavailable: () =>
    new ServiceUnavailableError(),
};

// ============================================
// 错误处理工具
// ============================================

export function isAideanError(error: unknown): error is AideanError {
  return error instanceof AideanError;
}

export function handleUnknownError(error: unknown): AideanError {
  if (isAideanError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalError('A4CM-001', error.message);
  }

  return new InternalError('A4CM-001', '未知错误');
}

// ============================================
// Zod错误转换
// ============================================

import { ZodError } from 'zod';

export function fromZodError(error: ZodError): ValidationError {
  const fields: ValidationField[] = (error as any).issues.map((err: any) => ({
    field: err.path.join('.'),
    message: err.message,
    code: `invalid_${err.code}`,
    value: err.path.length > 0 ? undefined : undefined,
  }));

  return new ValidationError(fields, 'A3CM-012', '数据验证失败');
}
