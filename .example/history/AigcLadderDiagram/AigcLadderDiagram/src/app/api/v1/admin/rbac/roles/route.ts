import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getRoles } from "@/lib/services/rbac.service";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/rbac/roles
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const keyword = searchParams.get("keyword") || undefined;

    const result = await getRoles({ page, limit, keyword });
    return successResponse(result);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return errorResponse("获取角色列表失败");
  }
}

// POST /api/v1/admin/rbac/roles
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const role = await prisma.role.create({
      data: {
        name: body.name,
        code: body.code,
        description: body.description,
        status: body.status ?? 1,
        isSystem: body.isSystem ?? false,
      },
    });
    return successResponse(role);
  } catch (error) {
    console.error("Error creating role:", error);
    return errorResponse("创建角色失败");
  }
}
