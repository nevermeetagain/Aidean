import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTeams } from "@/lib/services/rbac.service";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/org/teams
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const departmentId = searchParams.get("departmentId") || undefined;

    const result = await getTeams({ page, limit, departmentId });
    return successResponse(result);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return errorResponse("获取团队列表失败");
  }
}

// POST /api/v1/admin/org/teams
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const team = await prisma.team.create({
      data: {
        name: body.name,
        description: body.description,
        departmentId: body.departmentId,
        leaderId: body.leaderId,
        maxMembers: body.maxMembers ?? 10,
        status: body.status ?? 1,
        isActive: body.isActive ?? true,
      },
    });
    return successResponse(team);
  } catch (error) {
    console.error("Error creating team:", error);
    return errorResponse("创建团队失败");
  }
}
