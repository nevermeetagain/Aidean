import { prisma } from "@/lib/db/prisma";

export async function getSystemStats() {
  const [userCount, modelCount, skillCount, mcpCount, agentCount] = await Promise.all([
    prisma.user.count(),
    prisma.aiModel.count(),
    prisma.skill.count(),
    prisma.mCPServer.count(),
    prisma.agent.count(),
  ]);

  return {
    models: { total: modelCount, active: modelCount },
    users: { total: userCount },
    tools: {
      total: skillCount + mcpCount + agentCount,
      skills: skillCount,
      mcps: mcpCount,
      agents: agentCount,
    },
  };
}

export async function getSiteConfig() {
  const configs = await prisma.systemConfig.findMany({
    where: { isPublic: true },
    select: { configKey: true, configValue: true, configValueEn: true },
  });

  const map: Record<string, string> = {};
  for (const c of configs) {
    map[c.configKey] = c.configValue;
  }

  return {
    siteName: map["site.name"] || "Aidean",
    siteDesc: map["site.description"] || "AI模型天梯图平台",
    logoUrl: map["site.logoUrl"] || "/images/icons/logo.svg",
    siteTitle: map["site.title"] || "",
    faviconUrl: map["site.faviconUrl"] || "/images/icons/logo.svg",
  };
}

export async function getAnnouncements({ limit }: { limit: number }) {
  return { items: [], total: 0, limit };
}

export const systemService = {
  getStats: getSystemStats,
  getSiteConfig,
  getAnnouncements,
};
