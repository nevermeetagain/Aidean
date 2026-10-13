import type { PrismaClient } from "@prisma/client";
import { parseRoadmapMilestones, ROADMAP_MILESTONES_DEFAULT, type RoadmapMilestone } from "@aidean/shared";
import { prisma } from "../../db/prisma";

/**
 * roadmap 域 config（2026-09-28）：路线图里程碑的后台管理配置。
 * - 存储：system_configs 表 configKey = roadmap.milestones（config_group=roadmap，STRING 型 JSON 数组）；
 * - 读取：SSR 页面每渲染周期读一次，缺行/非法/DB 不可用一律回退 ROADMAP_MILESTONES_DEFAULT
 *   （页面永不因配置失败阻断；模式对齐 lib/features/ladder/config.ts）；
 * - 生效时机：后台 PUT /api/v1/admin/configs（roadmap 组）落库后 revalidatePath("/") + revalidatePath("/roadmap")，
 *   页面 ISR revalidate=300 兜底。
 */

export const ROADMAP_MILESTONES_KEY = "roadmap.milestones";

/** 读路线图里程碑；任何异常路径都收敛到默认文案 */
export async function getRoadmapMilestones(client: PrismaClient = prisma): Promise<RoadmapMilestone[]> {
  try {
    const row = await client.systemConfig.findUnique({
      where: { configKey: ROADMAP_MILESTONES_KEY },
      select: { configValue: true },
    });
    if (!row) return ROADMAP_MILESTONES_DEFAULT.map((m) => ({ ...m }));
    return parseRoadmapMilestones(row.configValue);
  } catch {
    return ROADMAP_MILESTONES_DEFAULT.map((m) => ({ ...m }));
  }
}
