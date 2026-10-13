import { NextRequest, NextResponse } from "next/server";
import { getTransactions } from "@/lib/services/finance.service";
import { verifyToken } from "@/lib/services/auth.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    let userId: string | undefined;
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const user = await verifyToken(token);
      if (user) userId = user.id;
    }

    const params = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      type: searchParams.get("type") || undefined,
      userId,
    };

    const result = await getTransactions(params);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
