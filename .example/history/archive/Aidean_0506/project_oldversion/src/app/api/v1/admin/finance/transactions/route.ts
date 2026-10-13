import { NextRequest, NextResponse } from "next/server";
import { getTransactions } from "@/lib/services/finance.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      keyword: searchParams.get("keyword") || undefined,
      type: searchParams.get("type") || undefined,
    };

    const result = await getTransactions(params);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "获取交易记录失败" },
      { status: 500 }
    );
  }
}
