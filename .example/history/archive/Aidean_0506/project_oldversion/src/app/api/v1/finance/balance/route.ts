import { NextRequest, NextResponse } from "next/server";
import { getUserBalances } from "@/lib/services/finance.service";
import { verifyToken } from "@/lib/services/auth.service";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ balance: 0, currency: "CNY" });
    }

    const token = authHeader.split(" ")[1];
    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ balance: 0, currency: "CNY" });
    }

    return NextResponse.json({ balance: user.balance, currency: "CNY" });
  } catch {
    return NextResponse.json({ balance: 0, currency: "CNY" });
  }
}
