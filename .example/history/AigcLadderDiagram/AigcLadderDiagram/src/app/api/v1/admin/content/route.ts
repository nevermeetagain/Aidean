import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/content - 内容管理仪表盘
export async function GET() {
  try {
    const [totalCount, publishedCount, draftCount] = await Promise.all([
      prisma.announcement.count(),
      prisma.announcement.count({ where: { isPublished: true } }),
      prisma.announcement.count({ where: { isPublished: false } }),
    ]);

    // 获取最近的公告
    const recentAnnouncements = await prisma.announcement.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    return successResponse({
      stats: {
        total: totalCount,
        published: publishedCount,
        draft: draftCount,
      },
      recentAnnouncements,
    });
  } catch (error) {
    console.error("Error fetching content dashboard:", error);
    return errorResponse("获取内容仪表盘失败");
  }
}
