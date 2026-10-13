import { NextRequest } from "next/server";
import { modelRepo } from "@/lib/repositories";
import { paginated, created, badRequest } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;
    const keyword = searchParams.get("keyword") || "";
    const modelType = searchParams.get("modelType") || undefined;
    const status = searchParams.get("status") || undefined;

    const where: Record<string, unknown> = { deletedAt: null };
    if (modelType) where.modelType = modelType;
    if (status) where.status = status;
    if (keyword) {
      where.OR = [
        { nameDisplay: { contains: keyword, mode: "insensitive" } },
        { nameCn: { contains: keyword, mode: "insensitive" } },
        { modelCode: { contains: keyword, mode: "insensitive" } },
      ];
    }

    const result = await modelRepo.findMany({
      page,
      limit,
      where,
      include: { vendor: { select: { id: true, name: true } } },
    });

    return paginated(result.data, result.total, result.page, result.limit);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "查询失败");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const model = await modelRepo.create(body);
    return created(model);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "创建失败");
  }
}
