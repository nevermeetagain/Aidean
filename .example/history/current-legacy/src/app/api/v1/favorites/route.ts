import { NextRequest } from "next/server";
import type { FavoriteType } from "@prisma/client";
import { getFavorites, addFavorite, removeFavorite } from "@/lib/services/favorite.service";
import { errorResponse, getRequestIdFromRequest, successResponse, unauthorized, badRequest } from "@/lib/api/response";
import { withAuth, extractTokenFromRequest } from "@/lib/api/middleware/auth";
import { verifyToken } from "@/lib/services/auth.service";

async function getAuthUser(request: NextRequest) {
  const token = extractTokenFromRequest(request);
  if (!token) {
    return null;
  }

  return verifyToken(token);
}

async function getHandler(request: NextRequest) {
  const requestId = getRequestIdFromRequest(request);
  try {
    const { searchParams } = new URL(request.url);
    const refTypeParam = searchParams.get("refType");
    const refType = refTypeParam ? (refTypeParam as FavoriteType) : undefined;
    const user = await getAuthUser(request);

    if (!user) {
      return unauthorized("未登录", requestId);
    }

    const result = await getFavorites(user.id, { refType });
    return successResponse(result, "获取收藏列表成功", requestId);
  } catch (error) {
    return errorResponse("获取收藏列表失败", 500, requestId);
  }
}

async function postHandler(request: NextRequest) {
  const requestId = getRequestIdFromRequest(request);
  try {
    const body = await request.json();
    const { refType, refId, note } = body;
    const user = await getAuthUser(request);

    if (!user) {
      return unauthorized("未登录", requestId);
    }

    if (!refType || !refId) {
      return badRequest("缺少必要参数", requestId);
    }

    const result = await addFavorite(user.id, refType as FavoriteType, refId, note);
    return successResponse(result, "收藏成功", requestId, 201);
  } catch (error: any) {
    if (error.message === "已收藏") {
      return errorResponse({ code: "A3CM-014", message: "已收藏" }, 409, requestId);
    }
    return errorResponse("添加收藏失败", 500, requestId);
  }
}

async function deleteHandler(request: NextRequest) {
  const requestId = getRequestIdFromRequest(request);
  try {
    const body = await request.json();
    const { refType, refId } = body;
    const user = await getAuthUser(request);

    if (!user) {
      return unauthorized("未登录", requestId);
    }

    if (!refType || !refId) {
      return badRequest("缺少必要参数", requestId);
    }

    const result = await removeFavorite(user.id, refType as FavoriteType, refId);
    return successResponse(result, "取消收藏成功", requestId);
  } catch (error) {
    return errorResponse("取消收藏失败", 500, requestId);
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
export const DELETE = withAuth(deleteHandler);
