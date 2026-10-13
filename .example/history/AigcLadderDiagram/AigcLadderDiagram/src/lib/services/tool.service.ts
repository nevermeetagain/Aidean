import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export type ToolListParams = {
  page?: number;
  limit?: number;
  keyword?: string;
  category?: string;
  toolType?: "skill" | "mcp" | "agent" | "api_station";
};

async function getToolsByType(toolType: string, params: ToolListParams = {}) {
  const { page = 1, limit = 20, keyword, category } = params;
  const where: any = {};

  if (keyword) {
    where.OR = [
      { name: { contains: keyword, mode: "insensitive" } },
      { displayName: { contains: keyword, mode: "insensitive" } },
      { description: { contains: keyword, mode: "insensitive" } },
    ];
  }
  if (category) {
    where.category = category;
  }

  let items: any[], total: number;

  switch (toolType) {
    case "skill":
      [items, total] = await Promise.all([
        prisma.skill.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { downloads: "desc" as const } }),
        prisma.skill.count({ where }),
      ]);
      break;
    case "mcp":
      [items, total] = await Promise.all([
        prisma.mCPServer.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { downloads: "desc" as const } }),
        prisma.mCPServer.count({ where }),
      ]);
      break;
    case "agent":
      [items, total] = await Promise.all([
        prisma.agent.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { activeUsers: "desc" as const } }),
        prisma.agent.count({ where }),
      ]);
      break;
    case "api_station":
      [items, total] = await Promise.all([
        prisma.aPIStation.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { activeUsers: "desc" as const } }),
        prisma.aPIStation.count({ where }),
      ]);
      break;
    default:
      throw new Error(`Unknown tool type: ${toolType}`);
  }

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getSkills(params: ToolListParams = {}) {
  return getToolsByType("skill", params);
}

export async function getMCPServers(params: ToolListParams = {}) {
  return getToolsByType("mcp", params);
}

export async function getAgents(params: ToolListParams = {}) {
  return getToolsByType("agent", params);
}

export async function getAPIStations(params: ToolListParams = {}) {
  return getToolsByType("api_station", params);
}

export async function getSkillById(id: string) {
  return prisma.skill.findUnique({ where: { id } });
}

export async function getMCPServerById(id: string) {
  return prisma.mCPServer.findUnique({ where: { id } });
}

export async function getAgentById(id: string) {
  return prisma.agent.findUnique({ where: { id } });
}

export async function getAPIStationById(id: string) {
  return prisma.aPIStation.findUnique({ where: { id } });
}

export async function listTools() {
  return prisma.skill.findMany({ take: 100, orderBy: { downloads: "desc" } });
}

export async function getToolById(id: string) {
  const skill = await prisma.skill.findUnique({ where: { id } });
  if (skill) return skill;
  const mcp = await prisma.mCPServer.findUnique({ where: { id } });
  if (mcp) return mcp;
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (agent) return agent;
  return null;
}

export const toolService = {
  getSkills,
  getMCPServers,
  getAgents,
  getAPIStations,
  list: listTools,
  getById: getToolById,
};
