import { NextRequest } from "next/server";
import { skillRepo, mcpServerRepo, agentRepo } from "@/lib/repositories";
import { paginated, created, badRequest } from "@/lib/api/response";

const REPO_MAP: Record<string, any> = {
  skill: skillRepo,
  mcp: mcpServerRepo,
  agent: agentRepo,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "skill";
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;
    const keyword = searchParams.get("keyword") || "";

    const repo = REPO_MAP[type];
    if (!repo) return badRequest(`不支持的工具类型: ${type}`);

    if (keyword) {
      const result = await repo.search(keyword, { page, limit });
      return paginated(result.data, result.total, result.page, result.limit);
    }

    const result = await repo.findMany({ page, limit });
    return paginated(result.data, result.total, result.page, result.limit);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "查询失败");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "skill";
    const repo = REPO_MAP[type];
    if (!repo) return badRequest(`不支持的工具类型: ${type}`);

    const body = await request.json();
    const item = await repo.create(body);
    return created(item);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "创建失败");
  }
}
