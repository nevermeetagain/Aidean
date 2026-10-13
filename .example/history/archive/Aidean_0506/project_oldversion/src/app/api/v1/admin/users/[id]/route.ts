import { NextRequest } from "next/server";
import { userRepo } from "@/lib/repositories";
import { successResponse, notFound, badRequest } from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await userRepo.findWithProfile(params.id);
    if (!user) return notFound("用户");
    return successResponse(user);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "查询失败");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const user = await userRepo.update(params.id, body);
    return successResponse(user, "更新成功");
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "更新失败");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await userRepo.softDelete(params.id);
    return successResponse(user, "删除成功");
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "删除失败");
  }
}
