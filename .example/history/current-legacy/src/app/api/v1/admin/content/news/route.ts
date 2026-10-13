import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/content/news
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const keyword = searchParams.get("keyword") || undefined;
    const isPublished = searchParams.get("isPublished") || undefined;

    const where: any = { type: "news" };
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: "insensitive" } },
        { content: { contains: keyword, mode: "insensitive" } },
      ];
    }
    if (isPublished !== undefined) where.isPublished = isPublished === "true";

    const [items, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.announcement.count({ where }),
    ]);

    return successResponse({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    return errorResponse("获取新闻列表失败");
  }
}

// POST /api/v1/admin/content/news
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const news = await prisma.announcement.create({
      data: {
        title: body.title,
        content: body.content,
        type: "news",
        isPublished: body.isPublished ?? false,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
      },
    });
    return successResponse(news);
  } catch (error) {
    console.error("Error creating news:", error);
    return errorResponse("创建新闻失败");
  }
}
