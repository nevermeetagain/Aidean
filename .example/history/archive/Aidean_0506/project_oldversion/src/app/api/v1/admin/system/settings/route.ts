import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin } from "@/lib/api/middleware/auth";

async function getHandler(request: NextRequest) {
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

    return NextResponse.json({
      configs,
      featureFlags,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    let result;

    if (type === "config") {
      // 创建/更新系统配置
      const { configKey, configValue, configGroup, description } = data;
      if (!configKey) {
        return NextResponse.json({ error: "configKey 不能为空" }, { status: 400 });
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
        return NextResponse.json({ error: "flagCode 和 name 不能为空" }, { status: 400 });
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
      return NextResponse.json({ error: "不支持的类型" }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
