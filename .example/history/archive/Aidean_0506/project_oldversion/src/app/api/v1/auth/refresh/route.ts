import { NextRequest, NextResponse } from "next/server";
import { refreshToken } from "@/lib/services/auth.service";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "缺少Token" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const result = await refreshToken(token);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
