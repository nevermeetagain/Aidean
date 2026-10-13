import { NextRequest, NextResponse } from "next/server";
import type { FavoriteType } from "@prisma/client";
import { getFavorites, addFavorite, removeFavorite } from "@/lib/services/favorite.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "anonymous";
    const refTypeParam = searchParams.get("refType");
    const refType = refTypeParam ? refTypeParam as FavoriteType : undefined;
    const result = await getFavorites(userId, { refType });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, refType, refId, note } = body;
    if (!userId || !refType || !refId) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }
    const result = await addFavorite(userId, refType as FavoriteType, refId, note);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.message === "已收藏") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, refType, refId } = body;
    if (!userId || !refType || !refId) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }
    const result = await removeFavorite(userId, refType as FavoriteType, refId);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
