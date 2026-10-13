import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ message: "脚本已加入执行队列", executionId: "1" });
}
