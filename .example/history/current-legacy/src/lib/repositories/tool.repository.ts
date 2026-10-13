/**
 * ToolRepository
 * Skills / MCP / Agents / APIStations 通用数据访问层 */

import { prisma } from "@/lib/db/prisma";
import { BaseRepository, FindManyOptions, FindManyResult } from "./base.repository";
import type { Skill, MCPServer, Agent, APIStation, Prisma } from "@prisma/client";

// Skill Repository
class SkillRepository extends BaseRepository<Skill> {
  protected model = prisma.skill;

  async search(keyword: string, options: FindManyOptions): Promise<FindManyResult<Skill>> {
    const where: Prisma.SkillWhereInput = {
      OR: [
        { name: { contains: keyword, mode: "insensitive" } },
        { nameCn: { contains: keyword, mode: "insensitive" } },
        { displayName: { contains: keyword, mode: "insensitive" } },
      ],
    };
    return this.findMany({
      ...options,
      where,
    });
  }
}

// MCP Server Repository
class McpServerRepository extends BaseRepository<MCPServer> {
  protected model = prisma.mCPServer;

  async search(keyword: string, options: FindManyOptions): Promise<FindManyResult<MCPServer>> {
    const where: Prisma.MCPServerWhereInput = {
      OR: [
        { name: { contains: keyword, mode: "insensitive" } },
        { nameCn: { contains: keyword, mode: "insensitive" } },
        { displayName: { contains: keyword, mode: "insensitive" } },
      ],
    };
    return this.findMany({
      ...options,
      where,
    });
  }
}

// Agent Repository
class AgentRepository extends BaseRepository<Agent> {
  protected model = prisma.agent;

  async search(keyword: string, options: FindManyOptions): Promise<FindManyResult<Agent>> {
    const where: Prisma.AgentWhereInput = {
      OR: [
        { name: { contains: keyword, mode: "insensitive" } },
        { nameCn: { contains: keyword, mode: "insensitive" } },
        { displayName: { contains: keyword, mode: "insensitive" } },
      ],
    };
    return this.findMany({
      ...options,
      where,
    });
  }
}

// API Station Repository
class ApiStationRepository extends BaseRepository<APIStation> {
  protected model = prisma.aPIStation;

  async search(keyword: string, options: FindManyOptions): Promise<FindManyResult<APIStation>> {
    const where: Prisma.APIStationWhereInput = {
      OR: [
        { name: { contains: keyword, mode: "insensitive" } },
        { nameCn: { contains: keyword, mode: "insensitive" } },
        { displayName: { contains: keyword, mode: "insensitive" } },
        { provider: { contains: keyword, mode: "insensitive" } },
      ],
    };
    return this.findMany({
      ...options,
      where,
    });
  }

  async findByProvider(provider: string, options: FindManyOptions): Promise<FindManyResult<APIStation>> {
    const where: Prisma.APIStationWhereInput = {
      provider: { contains: provider, mode: "insensitive" },
    };
    return this.findMany({
      ...options,
      where,
    });
  }
}

export const skillRepo = new SkillRepository();
export const mcpServerRepo = new McpServerRepository();
export const agentRepo = new AgentRepository();
export const apiStationRepo = new ApiStationRepository();

