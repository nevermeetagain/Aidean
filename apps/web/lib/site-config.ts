import { unstable_cache } from "next/cache";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "./db/prisma";

/**
 * S4「站点可见即可改」站名/SEO/品牌读服务（lib/site-config.ts）。
 * - 存储：system_configs 表 site.* 键（configGroup=general，白名单可编辑）；
 * - 读取：`unstable_cache` tag `site-branding`，供根 generateMetadata 与前台品牌位消费；
 * - 回退：任何键缺行 / DB 不可用一律回退默认值（页面永不因配置失败白屏，模式对齐
 *   lib/features/roadmap/config.ts）；后台 PUT general 组键时 revalidateTag('site-branding') 即时生效。
 */
export interface SiteBranding {
  name: string;
  title: string;
  description: string;
  keywords: string;
  logoUrl: string;
  faviconUrl: string;
}

const BRANDING_KEYS = [
  "site.name",
  "site.title",
  "site.description",
  "site.seo.keywords",
  "site.logoUrl",
  "site.faviconUrl",
] as const;

/** DB 不可用/缺行时的兜底品牌（与 seed 真源默认对齐） */
export const SITE_BRANDING_DEFAULT: SiteBranding = {
  name: "Aidean",
  title: "",
  description: "AI模型天梯图平台",
  keywords: "",
  logoUrl: "/images/icons/logo.svg",
  faviconUrl: "/images/icons/logo.svg",
};

export async function loadSiteBranding(client: PrismaClient = prisma): Promise<SiteBranding> {
  try {
    const rows = await client.systemConfig.findMany({
      where: { configKey: { in: [...BRANDING_KEYS] } },
      select: { configKey: true, configValue: true },
    });
    const map = new Map(rows.map((r) => [r.configKey, r.configValue]));
    const pick = (key: (typeof BRANDING_KEYS)[number]) => map.get(key)?.trim();
    return {
      name: pick("site.name") || SITE_BRANDING_DEFAULT.name,
      title: pick("site.title") ?? "",
      description: pick("site.description") || SITE_BRANDING_DEFAULT.description,
      keywords: pick("site.seo.keywords") ?? "",
      logoUrl: pick("site.logoUrl") || SITE_BRANDING_DEFAULT.logoUrl,
      faviconUrl: pick("site.faviconUrl") || SITE_BRANDING_DEFAULT.faviconUrl,
    };
  } catch {
    return { ...SITE_BRANDING_DEFAULT };
  }
}

/** 缓存版读取（tag site-branding，后台保存后失效） */
export const getSiteBranding = unstable_cache(loadSiteBranding, ["site-branding"], {
  tags: ["site-branding"],
  revalidate: 600,
});

/** 供 generateMetadata：浏览器标题 = site.title（空则「站点名 · 描述」） */
export function buildDocumentTitle(b: SiteBranding): string {
  return b.title.trim() || `${b.name} · ${b.description}`;
}
