/**
 * 导航菜单API
 * GET /api/v1/system/navigation - 返回导航菜单结构
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get("position") || "header"; // header|footer|sidebar
    const isActive = searchParams.get("isActive") !== "false";

    const where: any = {
      isVisible: true,
      position,
    };
    if (isActive) {
      where.isActive = true;
    }

    const menus = await prisma.navigationMenu.findMany({
      where,
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        name: true,
        nameEn: true,
        path: true,
        icon: true,
        level: true,
        parentId: true,
      },
    });

    // 构建树形结构
    const buildTree = (items: any[], parentId: string | null = null): any[] => {
      return items
        .filter((item) => item.parentId === parentId)
        .map((item) => ({
          ...item,
          children: buildTree(items, item.id),
        }));
    };

    const tree = buildTree(menus);

    return successResponse({
      items: tree,
      total: menus.length,
      position,
    });
  } catch (error) {
    console.error("[Navigation API Error]", error);
    return errorResponse("获取导航菜单失败");
  }
}
