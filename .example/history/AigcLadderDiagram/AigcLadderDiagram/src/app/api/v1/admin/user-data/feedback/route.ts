import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/user-data/feedback
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const keyword = searchParams.get("keyword") || undefined;
    const type = searchParams.get("type") || undefined;
    const status = searchParams.get("status") || undefined;

    const where: any = {};
    if (keyword) {
      where.content = { contains: keyword, mode: "insensitive" };
    }
    if (type) where.type = type;
    if (status) where.status = parseInt(status);

    const [items, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.feedback.count({ where }),
    ]);

    return successResponse({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return errorResponse("获取反馈列表失败");
  }
}

// POST /api/v1/admin/user-data/feedback
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.userId) {
      return errorResponse("userId 是必填字段");
    }
    const feedback = await prisma.feedback.create({
      data: {
        user: { connect: { id: body.userId } },
        type: body.type || "GENERAL",
        subject: body.subject || body.content?.substring(0, 50) || "",
        content: body.content,
        priority: body.priority || "normal",
        status: body.status || "PENDING",
      },
    });
    return successResponse(feedback);
  } catch (error) {
    console.error("Error creating feedback:", error);
    return errorResponse("创建反馈失败");
  }
}
