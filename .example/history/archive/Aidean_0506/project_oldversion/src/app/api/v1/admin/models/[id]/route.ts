import { NextRequest } from "next/server";
import { modelRepo } from "@/lib/repositories";
import { successResponse, notFound, badRequest } from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const model = await modelRepo.findWithDetails(params.id);
    if (!model) return notFound("模型");
    return successResponse(model);
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
    const model = await modelRepo.update(params.id, body);
    return successResponse(model, "更新成功");
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "更新失败");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const model = await modelRepo.softDelete(params.id);
    return successResponse(model, "删除成功");
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "删除失败");
  }
}
