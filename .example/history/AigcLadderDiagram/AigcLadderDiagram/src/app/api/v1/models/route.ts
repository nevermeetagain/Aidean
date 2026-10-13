import { NextRequest, NextResponse } from "next/server";
import { getModels, getModelById } from "@/lib/services/model.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      keyword: searchParams.get("keyword") || undefined,
      vendorId: searchParams.get("vendorId") || undefined,
      modelType: searchParams.get("modelType") || undefined,
      isOpenSource: searchParams.get("isOpenSource") === "true" ? true : undefined,
    };
    const result = await getModels(params);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "获取模型列表失败" }, { status: 500 });
  }
}
