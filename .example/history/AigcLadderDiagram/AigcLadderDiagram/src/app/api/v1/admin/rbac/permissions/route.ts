import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPermissions } from "@/lib/services/rbac.service";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/rbac/permissions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const resourceType = searchParams.get("resourceType") || undefined;

    const result = await getPermissions({ page, limit, resourceType });
    return successResponse(result);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return errorResponse("获取权限列表失败");
  }
}

// POST /api/v1/admin/rbac/permissions
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const permission = await prisma.permission.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description,
        resource: body.resource,
        action: body.action,
        status: body.status ?? 1,
      },
    });
    return successResponse(permission);
  } catch (error) {
    console.error("Error creating permission:", error);
    return errorResponse("创建权限失败");
  }
}
