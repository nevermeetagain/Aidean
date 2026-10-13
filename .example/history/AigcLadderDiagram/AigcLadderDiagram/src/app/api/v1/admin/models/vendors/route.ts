import { NextResponse } from "next/server";
import { getVendors, getVendorById } from "@/lib/services/vendor.service";
import { withAdmin } from "@/lib/auth/middleware";

// GET /api/v1/admin/models/vendors
export async function GET(request: Request) {
  const handler = withAdmin(async (req) => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const keyword = searchParams.get("keyword") || undefined;
    const tier = searchParams.get("tier") || undefined;

    const result = await getVendors({ page, limit, keyword, tier });
    return NextResponse.json(result);
  });
  return handler(request as any);
}

// POST /api/v1/admin/models/vendors
export async function POST(request: Request) {
  const handler = withAdmin(async (req) => {
    const body = await req.json();
    // 创建厂商逻辑暂简化
    return NextResponse.json({ id: "1", ...body, createdAt: new Date() });
  });
  return handler(request as any);
}
