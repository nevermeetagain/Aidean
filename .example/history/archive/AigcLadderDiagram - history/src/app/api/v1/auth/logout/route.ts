/**
 * POST /api/v1/auth/logout
 * 用户退出登录
 */

import { NextRequest } from "next/server";
import { success } from "@/lib/api/response";
import { clearTokenCookies } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  try {
    // 清除Token Cookie
    await clearTokenCookies();
    
    // TODO: 将Token加入Redis黑名单（可选）
    // await redis.sadd('token:blacklist', token);
    
    return success({ message: "退出登录成功" });
  } catch (e) {
    console.error("退出登录失败:", e);
    // 即使出错也返回成功，因为Cookie已经被清除
    return success({ message: "退出登录成功" });
  }
}
