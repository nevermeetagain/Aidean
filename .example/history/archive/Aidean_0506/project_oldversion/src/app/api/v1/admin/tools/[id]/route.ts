import { NextRequest } from "next/server";
import { skillRepo, mcpServerRepo, agentRepo } from "@/lib/repositories";
import { successResponse, notFound, badRequest } from "@/lib/api/response";

const REPO_MAP: Record<string, any> = {
  skill: skillRepo,
  mcp: mcpServerRepo,
  agent: agentRepo,
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "skill";
    const repo = REPO_MAP[type];
    if (!repo) return badRequest(`不支持的工具类型: ${type}`);

    const item = await repo.findById(params.id);
    if (!item) return notFound(type);
    return successResponse(item);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "查询失败");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "skill";
    const repo = REPO_MAP[type];
    if (!repo) return badRequest(`不支持的工具类型: ${type}`);

    const body = await request.json();
    const item = await repo.update(params.id, body);
    return successResponse(item, "更新成功");
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "更新失败");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "skill";
    const repo = REPO_MAP[type];
    if (!repo) return badRequest(`不支持的工具类型: ${type}`);

    const item = await repo.delete(params.id);
    return successResponse(item, "删除成功");
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "删除失败");
  }
}
