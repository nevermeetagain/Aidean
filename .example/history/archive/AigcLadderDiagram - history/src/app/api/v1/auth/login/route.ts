/**
 * POST /api/v1/auth/login
 * 用户登录
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { login } from '@/lib/services/auth.service';
import { apiResponse, apiError } from '@/lib/api/response';
import { fromZodError } from '@/lib/api/errors';

// ============================================
// 请求验证
// ============================================

const loginSchema = z.object({
  email: z.string().email('邮箱格式错误'),
  password: z.string().min(1, '密码不能为空'),
  remember: z.boolean().optional().default(false),
});

// ============================================
// POST /api/v1/auth/login
// ============================================

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();

    // 验证请求数据
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      const error = fromZodError(result.error);
      return apiResponse.error(error);
    }

    // 执行登录
    const { user, tokens } = await login(result.data);

    // 构建响应
    const response = apiResponse.success({
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        avatar: user.avatar,
      },
      tokens: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
        token_type: 'Bearer',
      },
    });

    // 设置Cookie（可选）
    response.cookies.set('aidean.token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expiresIn,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return apiError.error(error);
  }
}
