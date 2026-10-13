/**
 * POST /api/v1/auth/register
 * 用户注册
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { register } from '@/lib/services/auth.service';
import { apiResponse, apiError } from '@/lib/api/response';
import { fromZodError } from '@/lib/api/errors';

// ============================================
// 请求验证
// ============================================

const registerSchema = z.object({
  email: z.string().email('邮箱格式错误'),
  password: z.string()
    .min(8, '密码至少需要8位')
    .regex(/[A-Z]/, '密码需要包含大写字母')
    .regex(/[a-z]/, '密码需要包含小写字母')
    .regex(/\d/, '密码需要包含数字'),
  nickname: z.string().max(50, '昵称不能超过50个字符').optional(),
});

// ============================================
// POST /api/v1/auth/register
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证请求数据
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      const error = fromZodError(result.error);
      return apiResponse.error(error);
    }

    // 执行注册
    const { user, tokens } = await register(result.data);

    // 构建响应
    const response = apiResponse.created({
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
      },
      tokens: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
        token_type: 'Bearer',
      },
    });

    // 设置Cookie
    response.cookies.set('aidean.token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expiresIn,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Register error:', error);
    return apiError.error(error);
  }
}
