import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/content/documents
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const keyword = searchParams.get("keyword") || undefined;
    const docType = searchParams.get("docType") || undefined;
    const status = searchParams.get("status") || undefined;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
      ];
    }
    if (docType) where.category = docType;
    if (status) where.isActive = status === "1" || status === "true";

    const [items, total] = await Promise.all([
      prisma.apiDocument.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.apiDocument.count({ where }),
    ]);

    return successResponse({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return errorResponse("获取文档列表失败");
  }
}

// POST /api/v1/admin/content/documents
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const doc = await prisma.apiDocument.create({
      data: {
        title: body.title,
        code: body.code || `doc_${Date.now()}`,
        description: body.description,
        category: body.category || "api",
        version: body.version || "v1",
        content: body.content || {},
        isPublic: body.isPublic ?? true,
      },
    });
    return successResponse(doc);
  } catch (error) {
    console.error("Error creating document:", error);
    return errorResponse("创建文档失败");
  }
}
