import { NextRequest } from "next/server";
import { getTransactions } from "@/lib/services/finance.service";
import { errorResponse, getRequestIdFromRequest, successResponse } from "@/lib/api/response";
import { withAdmin } from "@/lib/api/middleware/auth";

async function getHandler(request: NextRequest) {
  const requestId = getRequestIdFromRequest(request);
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      keyword: searchParams.get("keyword") || undefined,
      type: searchParams.get("type") || undefined,
    };

    const result = await getTransactions(params);
    return successResponse(result, "获取交易记录成功", requestId);
  } catch (error) {
    return errorResponse("获取交易记录失败", 500, requestId);
  }
}

export const GET = withAdmin(getHandler);
