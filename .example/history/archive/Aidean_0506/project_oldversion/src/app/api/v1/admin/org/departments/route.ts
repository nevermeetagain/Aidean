import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getDepartments } from "@/lib/services/rbac.service";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/org/departments
export async function GET() {
  try {
    const departments = await getDepartments();
    return successResponse({ items: departments, total: departments.length });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return errorResponse("获取部门列表失败");
  }
}

// POST /api/v1/admin/org/departments
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const dept = await prisma.department.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description,
        managerId: body.managerId,
        parentId: body.parentId,
        level: body.level ?? 1,
        status: body.status ?? 1,
        isActive: body.isActive ?? true,
      },
    });
    return successResponse(dept);
  } catch (error) {
    console.error("Error creating department:", error);
    return errorResponse("创建部门失败");
  }
}
