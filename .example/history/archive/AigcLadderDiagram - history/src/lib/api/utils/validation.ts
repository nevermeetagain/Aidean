/**
 * 请求验证工具
 * 统一Zod schema验证和错误格式化
 */

import { ZodSchema, ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { error } from '@/lib/api/response';
import { ValidationError, ValidationField } from '@/lib/api/errors';

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

/**
 * 将ZodError转换为ValidationField[]
 */
function zodErrorToFields(err: ZodError): ValidationField[] {
  return err.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * 验证请求体
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data };
  } catch (err) {
    if (err instanceof ZodError) {
      const fields = zodErrorToFields(err);
      return {
        success: false,
        response: error(new ValidationError(fields, 'A1VL-001')),
      };
    }
    return {
      success: false,
      response: error(new ValidationError([{ field: 'body', message: '请求体格式错误' }], 'A1VL-002')),
    };
  }
}

/**
 * 验证查询参数
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const { searchParams } = new URL(request.url);
    const queryObj: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });
    const data = schema.parse(queryObj);
    return { success: true, data };
  } catch (err) {
    if (err instanceof ZodError) {
      const fields = zodErrorToFields(err);
      return {
        success: false,
        response: error(new ValidationError(fields, 'A1VL-003')),
      };
    }
    return {
      success: false,
      response: error(new ValidationError([{ field: 'query', message: '查询参数格式错误' }], 'A1VL-004')),
    };
  }
}
