import { NextRequest } from "next/server";
import { userRepo } from "@/lib/repositories";
import { paginated, created, badRequest } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;
    const keyword = searchParams.get("keyword") || "";
    const role = searchParams.get("role") || undefined;
    const status = searchParams.get("status") || undefined;

    const where: Record<string, unknown> = { deletedAt: null };
    if (role) where.role = role;
    if (status) where.status = status;

    if (keyword) {
      const result = await userRepo.search(keyword, { page, limit });
      return paginated(result.data, result.total, result.page, result.limit);
    }

    const result = await userRepo.findMany({ page, limit, where });
    return paginated(result.data, result.total, result.page, result.limit);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "查询失败");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await userRepo.create(body);
    return created(user);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "创建失败");
  }
}
