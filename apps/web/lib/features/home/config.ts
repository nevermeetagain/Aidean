import { unstable_cache } from "next/cache";
import type { PrismaClient } from "@prisma/client";
import {
  parseHomeHero,
  parseHomeCards,
  parseMarqueeNames,
  parseAboutBody,
  HOME_HERO_DEFAULT,
  HOME_VALUE_POINTS_DEFAULT,
  HOME_MODEL_ENTRIES_DEFAULT,
  MARQUEE_NAMES_DEFAULT,
  ABOUT_BODY_DEFAULT,
  type HomeHero,
  type HomeCard,
} from "@aidean/shared";
import { prisma } from "../../db/prisma";

/**
 * S4 首页区块读服务（home.* 配置键）：首屏 Hero / 价值点 / 模型入口。
 * - 缺行/非法/DB 不可用一律回退 shared DEFAULT（与重构前硬编码逐字一致，页面不崩）；
 * - `unstable_cache` tag `site-home`，后台 PUT home 组键时 revalidateTag + revalidatePath("/") 即时生效。
 */
export interface HomeContent {
  hero: HomeHero;
  valuePoints: HomeCard[];
  modelEntries: HomeCard[];
  marquee: string[];
  aboutBody: string;
}

export async function loadHomeContent(client: PrismaClient = prisma): Promise<HomeContent> {
  try {
    const rows = await client.systemConfig.findMany({
      where: { configKey: { in: ["home.hero", "home.valuePoints", "home.modelEntries", "partners.marquee", "about.body"] } },
      select: { configKey: true, configValue: true },
    });
    const map = new Map(rows.map((r) => [r.configKey, r.configValue]));
    return {
      hero: parseHomeHero(map.get("home.hero")),
      valuePoints: parseHomeCards(map.get("home.valuePoints"), HOME_VALUE_POINTS_DEFAULT),
      modelEntries: parseHomeCards(map.get("home.modelEntries"), HOME_MODEL_ENTRIES_DEFAULT),
      marquee: parseMarqueeNames(map.get("partners.marquee")),
      aboutBody: parseAboutBody(map.get("about.body")),
    };
  } catch {
    return {
      hero: structuredClone(HOME_HERO_DEFAULT),
      valuePoints: HOME_VALUE_POINTS_DEFAULT.map((c) => ({ ...c })),
      modelEntries: HOME_MODEL_ENTRIES_DEFAULT.map((c) => ({ ...c })),
      marquee: MARQUEE_NAMES_DEFAULT.map((n) => n),
      aboutBody: ABOUT_BODY_DEFAULT,
    };
  }
}

export const getHomeContent = unstable_cache(loadHomeContent, ["site-home"], {
  tags: ["site-home"],
  revalidate: 600,
});
