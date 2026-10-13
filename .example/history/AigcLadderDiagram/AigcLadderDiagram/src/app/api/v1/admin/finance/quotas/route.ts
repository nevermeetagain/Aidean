import { NextRequest } from "next/server";
import { getUserQuotas } from "@/lib/services/finance.service";
import { errorResponse, getRequestIdFromRequest, successResponse } from "@/lib/api/response";
import { withAdmin } from "@/lib/api/middleware/auth";

async function getHandler(request: NextRequest) {
  const requestId = getRequestIdFromRequest(request);
  try {
    const { searchParams } = new URL(request.url);
    const result = await getUserQuotas({
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      keyword: searchParams.get("keyword") || undefined,
    });

    return successResponse(result, "获取配额数据成功", requestId);
  } catch {
    return errorResponse("获取配额数据失败", 500, requestId);
  }
}

export const GET = withAdmin(getHandler);
