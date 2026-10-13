/**
 * POST /api/v1/auth/refresh
 * 刷新Access Token
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { success, error } from "@/lib/api/response";
import { AuthenticationError } from "@/lib/api/errors";
import { 
  getRefreshTokenFromCookie,
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
} from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  try {
    // 获取Refresh Token: 优先Cookie，其次body
    let refreshToken = await getRefreshTokenFromCookie();
    
    if (!refreshToken) {
      // 尝试从请求体获取
      try {
        const body = await req.json();
        refreshToken = body?.refreshToken || null;
      } catch { /* ignore parse error */ }
    }

    if (!refreshToken) {
      return error(new AuthenticationError("A3AU-009", "未提供Refresh Token"));
    }

    // 验证Refresh Token
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return error(new AuthenticationError("A3AU-010", "Refresh Token无效或已过期"));
    }

    // 查询用户
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return error(new AuthenticationError("A3AU-011", "用户不存在"));
    }

    // 检查用户状态
    if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
      return error(new AuthenticationError("A3AU-012", "账户已被禁用"));
    }

    // 生成新的双Token（Token轮换）
    const newAccessToken = await generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    
    const newRefreshToken = await generateRefreshToken({
      userId: user.id,
      version: payload.version + 1, // 递增版本号
    });

    // 设置新的Cookie
    await setTokenCookies(newAccessToken, newRefreshToken);

    // 返回新的Access Token
    return success({
      accessToken: newAccessToken,
      expiresIn: 900, // 15分钟
    });
  } catch (e) {
    console.error("Token刷新失败:", e);
    return error(new AuthenticationError("A3AU-013", "Token刷新失败"));
  }
}
