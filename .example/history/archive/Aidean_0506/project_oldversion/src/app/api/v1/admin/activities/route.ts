import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse } from "@/lib/api/response";

// 审计日志操作类型映射
const ACTION_TYPE_MAP: Record<number, { type: string; action: string }> = {
  1: { type: "user", action: "新用户注册" },
  2: { type: "user", action: "用户信息更新" },
  3: { type: "model", action: "模型创建" },
  4: { type: "model", action: "模型更新" },
  5: { type: "model", action: "模型删除" },
  6: { type: "tool", action: "工具发布" },
  7: { type: "tool", action: "工具更新" },
  8: { type: "system", action: "系统配置更新" },
  9: { type: "system", action: "系统备份" },
};

export async function GET() {
  try {
    // 从审计日志表获取最近的活动
    const auditLogs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, email: true, nickname: true },
        },
      },
    });

    // 格式化为活动列表
    const activities = auditLogs.map((log) => {
      const actionInfo = ACTION_TYPE_MAP[log.action] || { type: "system", action: "系统操作" };
      
      return {
        id: log.id,
        type: actionInfo.type as "user" | "model" | "tool" | "system" | "transaction",
        action: actionInfo.action,
        description: log.newData ? JSON.stringify(log.newData).slice(0, 100) : "执行了系统操作",
        user: log.user?.nickname || log.user?.email || "系统",
        timestamp: log.createdAt.toISOString(),
      };
    });

    return successResponse(activities);
  } catch (error) {
    console.error("[Activities API Error]", error);
    return NextResponse.json(
      { success: false, message: "获取活动记录失败" },
      { status: 500 }
    );
  }
}
