import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/middleware/auth";
import {
  badRequest,
  created,
  getRequestIdFromRequest,
  internalError,
  successResponse,
} from "@/lib/api/response";

async function getHandler(request: NextRequest) {
  const requestId = getRequestIdFromRequest(request);
  try {
    const { searchParams } = new URL(request.url);
    const group = searchParams.get("group") || undefined;

    const where: any = {};
    if (group) {
      where.configGroup = group;
    }

    // 获取系统配置
    const [configs, featureFlags] = await Promise.all([
      prisma.systemConfig.findMany({
        where,
        orderBy: { configGroup: "asc" },
      }),
      prisma.featureFlag.findMany({
        orderBy: { flagCode: "asc" },
      }),
    ]);

    return successResponse({ configs, featureFlags }, "获取系统设置成功", requestId);
  } catch (error) {
    return internalError(error instanceof Error ? error.message : "获取系统设置失败", requestId);
  }
}

async function postHandler(request: NextRequest) {
  const requestId = getRequestIdFromRequest(request);
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return badRequest("缺少必要参数", requestId);
    }

    let result;

    if (type === "config") {
      // 创建/更新系统配置
      const { configKey, configValue, configGroup, description } = data;
      if (!configKey) {
        return badRequest("configKey 不能为空", requestId);
      }

      result = await prisma.systemConfig.upsert({
        where: { configKey },
        update: {
          configValue,
          configGroup,
          description,
        },
        create: {
          configKey,
          configValue: configValue || "",
          configGroup: configGroup || "general",
          description: description || "",
        },
      });
    } else if (type === "featureFlag") {
      // 创建/更新功能开关
      const { flagCode, name, nameCn, isEnabled, description, category } = data;
      if (!flagCode || !name) {
        return badRequest("flagCode 和 name 不能为空", requestId);
      }

      result = await prisma.featureFlag.upsert({
        where: { flagCode },
        update: {
          name,
          nameCn,
          isEnabled: isEnabled !== false,
          description,
          category,
        },
        create: {
          flagCode,
          name,
          nameCn: nameCn || "",
          isEnabled: isEnabled !== false,
          description: description || "",
          category: category || "",
        },
      });
    } else {
      return badRequest("不支持的类型", requestId);
    }

    return created(result, requestId);
  } catch (error) {
    return internalError(error instanceof Error ? error.message : "保存系统设置失败", requestId);
  }
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
