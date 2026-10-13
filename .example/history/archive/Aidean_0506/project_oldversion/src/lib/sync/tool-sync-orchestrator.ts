/**
 * 工具同步编排器 (Tool Sync Orchestrator)
 * 协调 Skills / MCP / Agent 的完整同步流程
 * 模式：多源采集 → 优先级去重 → Prisma upsert
 */

import { prisma } from '@/lib/db/prisma';
import { fetchFromSkillsmp, fetchFromSmithery as fetchSkillsFromSmithery, fetchFromSkillsSh } from './adapters/skill-adapters';
import { fetchMCPFromSmithery, fetchMCPFromGlama } from './adapters/mcp-adapters';
import { fetchFromAgentIndex, fetchFromAgentsSh } from './adapters/agent-adapters';
import { SOURCE_PRIORITY } from './types/tool-sync';
import type { ToolSyncConfig, ToolSyncResult, ToolSyncPhase, StandardizedSkill, StandardizedMCP, StandardizedAgent } from './types/tool-sync';

/**
 * 执行 Skills 同步
 */
export async function executeSkillsSync(config: ToolSyncConfig): Promise<ToolSyncResult> {
  const startTime = new Date();
  const phases: ToolSyncPhase[] = [];
  const errors: string[] = [];
  let totalFetched = 0, totalCreated = 0, totalUpdated = 0, totalSkipped = 0, totalFailed = 0;

  const sources = config.sources || ['skillsmp', 'smithery', 'skills_sh'];
  const allSkills: StandardizedSkill[] = [];

  // 按优先级顺序采集
  for (const source of sources) {
    const phaseStart = Date.now();
    const phase: ToolSyncPhase = { name: `skills-${source}`, status: 'running', startedAt: new Date() };

    try {
      let skills: StandardizedSkill[] = [];
      switch (source) {
        case 'skillsmp':
          skills = await fetchFromSkillsmp({ limit: config.limit, timeout: config.timeout, retryCount: config.retryCount });
          break;
        case 'smithery':
          skills = await fetchSkillsFromSmithery({ limit: config.limit, timeout: config.timeout, retryCount: config.retryCount });
          break;
        case 'skills_sh':
          skills = await fetchFromSkillsSh({ limit: config.limit, timeout: config.timeout, retryCount: config.retryCount });
          break;
        default:
          phase.status = 'failed';
          phase.errors = [`不支持的数据源: ${source}`];
          phases.push(phase);
          continue;
      }

      allSkills.push(...skills);
      totalFetched += skills.length;

      phase.status = 'completed';
      phase.stats = { fetched: skills.length, created: 0, updated: 0, skipped: 0, failed: 0 };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      phase.status = 'failed';
      phase.errors = [msg];
      errors.push(`[${source}] ${msg}`);
    }

    phase.completedAt = new Date();
    phases.push(phase);
  }

  // 优先级去重：相同 sourceId 只保留高优先级
  const dedupedSkills = deduplicateByPriority(allSkills, 'skill');

  // 写入数据库
  if (!config.dryRun) {
    const writePhase: ToolSyncPhase = { name: 'skills-write', status: 'running', startedAt: new Date() };

    try {
      for (const skill of dedupedSkills) {
        try {
          const existing = await prisma.skill.findFirst({
            where: { source: skill.source, sourceId: skill.sourceId, deletedAt: null },
          });

          if (existing) {
            // 检查优先级：只有更高优先级才能覆盖
            const existingPriority = SOURCE_PRIORITY.skill[existing.source || 'manual'] ?? 99;
            const newPriority = SOURCE_PRIORITY.skill[skill.source] ?? 99;

            if (newPriority <= existingPriority) {
              await prisma.skill.update({
                where: { id: existing.id },
                data: {
                  name: skill.name,
                  nameCn: skill.nameCn,
                  displayName: skill.displayName,
                  description: skill.description,
                  author: skill.author,
                  authorUrl: skill.authorUrl,
                  version: skill.version,
                  category: skill.category,
                  tags: skill.tags,
                  protocol: skill.protocol,
                  mcpServers: skill.mcpServers,
                  downloads: skill.downloads,
                  stars: skill.stars,
                  rating: skill.rating,
                  readmeUrl: skill.readmeUrl,
                  installCmd: skill.installCmd,
                  icon: skill.icon,
                  source: skill.source,
                  sourceId: skill.sourceId,
                  sourceUrl: skill.sourceUrl,
                  lastSyncedAt: new Date(),
                  lastUpdated: new Date(),
                },
              });
              totalUpdated++;
            } else {
              totalSkipped++;
            }
          } else {
            await prisma.skill.create({
              data: {
                name: skill.name,
                nameCn: skill.nameCn,
                displayName: skill.displayName,
                description: skill.description,
                author: skill.author,
                authorUrl: skill.authorUrl,
                version: skill.version,
                category: skill.category,
                tags: skill.tags,
                protocol: skill.protocol,
                mcpServers: skill.mcpServers,
                downloads: skill.downloads,
                stars: skill.stars,
                rating: skill.rating,
                readmeUrl: skill.readmeUrl,
                installCmd: skill.installCmd,
                icon: skill.icon,
                source: skill.source,
                sourceId: skill.sourceId,
                sourceUrl: skill.sourceUrl,
                lastSyncedAt: new Date(),
                lastUpdated: new Date(),
              },
            });
            totalCreated++;
          }
        } catch (itemError) {
          totalFailed++;
          errors.push(`[write] ${skill.name}: ${itemError instanceof Error ? itemError.message : String(itemError)}`);
        }
      }

      writePhase.status = 'completed';
      writePhase.stats = { fetched: dedupedSkills.length, created: totalCreated, updated: totalUpdated, skipped: totalSkipped, failed: totalFailed };
    } catch (error) {
      writePhase.status = 'failed';
      writePhase.errors = [error instanceof Error ? error.message : String(error)];
    }

    writePhase.completedAt = new Date();
    phases.push(writePhase);
  } else {
    console.log('[SkillsSync] Dry run 模式，跳过写入');
  }

  return {
    success: errors.length === 0 || totalCreated + totalUpdated > 0,
    entityType: 'skill',
    phases,
    stats: { totalFetched, totalCreated, totalUpdated, totalSkipped, totalFailed, duration: Date.now() - startTime.getTime() },
    errors,
    startedAt: startTime,
    completedAt: new Date(),
  };
}

/**
 * 执行 MCP 同步
 */
export async function executeMCPSync(config: ToolSyncConfig): Promise<ToolSyncResult> {
  const startTime = new Date();
  const phases: ToolSyncPhase[] = [];
  const errors: string[] = [];
  let totalFetched = 0, totalCreated = 0, totalUpdated = 0, totalSkipped = 0, totalFailed = 0;

  const sources = config.sources || ['smithery', 'glama'];
  const allMCPs: StandardizedMCP[] = [];

  for (const source of sources) {
    const phase: ToolSyncPhase = { name: `mcp-${source}`, status: 'running', startedAt: new Date() };

    try {
      let mcps: StandardizedMCP[] = [];
      switch (source) {
        case 'smithery':
          mcps = await fetchMCPFromSmithery({ limit: config.limit, timeout: config.timeout, retryCount: config.retryCount });
          break;
        case 'glama':
          mcps = await fetchMCPFromGlama({ limit: config.limit, timeout: config.timeout, retryCount: config.retryCount });
          break;
        default:
          phase.status = 'failed';
          phase.errors = [`不支持的数据源: ${source}`];
          phases.push(phase);
          continue;
      }

      allMCPs.push(...mcps);
      totalFetched += mcps.length;
      phase.status = 'completed';
      phase.stats = { fetched: mcps.length, created: 0, updated: 0, skipped: 0, failed: 0 };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      phase.status = 'failed';
      phase.errors = [msg];
      errors.push(`[${source}] ${msg}`);
    }

    phase.completedAt = new Date();
    phases.push(phase);
  }

  const dedupedMCPs = deduplicateByPriority(allMCPs, 'mcp');

  if (!config.dryRun) {
    const writePhase: ToolSyncPhase = { name: 'mcp-write', status: 'running', startedAt: new Date() };

    try {
      for (const mcp of dedupedMCPs) {
        try {
          const existing = await prisma.mCPServer.findFirst({
            where: { source: mcp.source, sourceId: mcp.sourceId, deletedAt: null },
          });

          if (existing) {
            const existingPriority = SOURCE_PRIORITY.mcp[existing.source || 'manual'] ?? 99;
            const newPriority = SOURCE_PRIORITY.mcp[mcp.source] ?? 99;

            if (newPriority <= existingPriority) {
              await prisma.mCPServer.update({
                where: { id: existing.id },
                data: {
                  name: mcp.name,
                  nameCn: mcp.nameCn,
                  displayName: mcp.displayName,
                  description: mcp.description,
                  author: mcp.author,
                  authorUrl: mcp.authorUrl,
                  version: mcp.version,
                  category: mcp.category,
                  tags: mcp.tags,
                  protocolType: mcp.protocolType,
                  command: mcp.command,
                  args: mcp.args,
                  env: mcp.env ? JSON.stringify(mcp.env) : undefined,
                  npmPackage: mcp.npmPackage,
                  homepage: mcp.homepage,
                  repository: mcp.repository,
                  downloads: mcp.downloads,
                  stars: mcp.stars,
                  rating: mcp.rating,
                  icon: mcp.icon,
                  source: mcp.source,
                  sourceId: mcp.sourceId,
                  sourceUrl: mcp.sourceUrl,
                  lastSyncedAt: new Date(),
                  lastUpdated: new Date(),
                },
              });
              totalUpdated++;
            } else {
              totalSkipped++;
            }
          } else {
            await prisma.mCPServer.create({
              data: {
                name: mcp.name,
                nameCn: mcp.nameCn,
                displayName: mcp.displayName,
                description: mcp.description,
                author: mcp.author,
                authorUrl: mcp.authorUrl,
                version: mcp.version,
                category: mcp.category,
                tags: mcp.tags,
                protocolType: mcp.protocolType,
                command: mcp.command,
                args: mcp.args,
                env: mcp.env || undefined,
                npmPackage: mcp.npmPackage,
                homepage: mcp.homepage,
                repository: mcp.repository,
                downloads: mcp.downloads,
                stars: mcp.stars,
                rating: mcp.rating,
                icon: mcp.icon,
                source: mcp.source,
                sourceId: mcp.sourceId,
                sourceUrl: mcp.sourceUrl,
                lastSyncedAt: new Date(),
                lastUpdated: new Date(),
              },
            });
            totalCreated++;
          }
        } catch (itemError) {
          totalFailed++;
          errors.push(`[write] ${mcp.name}: ${itemError instanceof Error ? itemError.message : String(itemError)}`);
        }
      }

      writePhase.status = 'completed';
      writePhase.stats = { fetched: dedupedMCPs.length, created: totalCreated, updated: totalUpdated, skipped: totalSkipped, failed: totalFailed };
    } catch (error) {
      writePhase.status = 'failed';
      writePhase.errors = [error instanceof Error ? error.message : String(error)];
    }

    writePhase.completedAt = new Date();
    phases.push(writePhase);
  }

  return {
    success: errors.length === 0 || totalCreated + totalUpdated > 0,
    entityType: 'mcp',
    phases,
    stats: { totalFetched, totalCreated, totalUpdated, totalSkipped, totalFailed, duration: Date.now() - startTime.getTime() },
    errors,
    startedAt: startTime,
    completedAt: new Date(),
  };
}

/**
 * 执行 Agent 同步
 */
export async function executeAgentSync(config: ToolSyncConfig): Promise<ToolSyncResult> {
  const startTime = new Date();
  const phases: ToolSyncPhase[] = [];
  const errors: string[] = [];
  let totalFetched = 0, totalCreated = 0, totalUpdated = 0, totalSkipped = 0, totalFailed = 0;

  const sources = config.sources || ['agentindex', 'agents_sh'];
  const allAgents: StandardizedAgent[] = [];

  for (const source of sources) {
    const phase: ToolSyncPhase = { name: `agent-${source}`, status: 'running', startedAt: new Date() };

    try {
      let agents: StandardizedAgent[] = [];
      switch (source) {
        case 'agentindex':
          agents = await fetchFromAgentIndex({ limit: config.limit, timeout: config.timeout, retryCount: config.retryCount });
          break;
        case 'agents_sh':
          agents = await fetchFromAgentsSh({ limit: config.limit, timeout: config.timeout, retryCount: config.retryCount });
          break;
        default:
          phase.status = 'failed';
          phase.errors = [`不支持的数据源: ${source}`];
          phases.push(phase);
          continue;
      }

      allAgents.push(...agents);
      totalFetched += agents.length;
      phase.status = 'completed';
      phase.stats = { fetched: agents.length, created: 0, updated: 0, skipped: 0, failed: 0 };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      phase.status = 'failed';
      phase.errors = [msg];
      errors.push(`[${source}] ${msg}`);
    }

    phase.completedAt = new Date();
    phases.push(phase);
  }

  const dedupedAgents = deduplicateByPriority(allAgents, 'agent');

  if (!config.dryRun) {
    const writePhase: ToolSyncPhase = { name: 'agent-write', status: 'running', startedAt: new Date() };

    try {
      for (const agent of dedupedAgents) {
        try {
          const existing = await prisma.agent.findFirst({
            where: { source: agent.source, sourceId: agent.sourceId, deletedAt: null },
          });

          if (existing) {
            const existingPriority = SOURCE_PRIORITY.agent[existing.source || 'manual'] ?? 99;
            const newPriority = SOURCE_PRIORITY.agent[agent.source] ?? 99;

            if (newPriority <= existingPriority) {
              await prisma.agent.update({
                where: { id: existing.id },
                data: {
                  name: agent.name,
                  nameCn: agent.nameCn,
                  displayName: agent.displayName,
                  description: agent.description,
                  author: agent.author,
                  authorUrl: agent.authorUrl,
                  version: agent.version,
                  category: agent.category,
                  tags: agent.tags,
                  capabilities: agent.capabilities,
                  modelSupport: agent.modelSupport,
                  pricing: agent.pricing || undefined,
                  activeUsers: agent.activeUsers,
                  taskCompleteRate: agent.taskCompleteRate,
                  avgRating: agent.avgRating,
                  icon: agent.icon,
                  website: agent.website,
                  source: agent.source,
                  sourceId: agent.sourceId,
                  sourceUrl: agent.sourceUrl,
                  lastSyncedAt: new Date(),
                  lastUpdated: new Date(),
                },
              });
              totalUpdated++;
            } else {
              totalSkipped++;
            }
          } else {
            await prisma.agent.create({
              data: {
                name: agent.name,
                nameCn: agent.nameCn,
                displayName: agent.displayName,
                description: agent.description,
                author: agent.author,
                authorUrl: agent.authorUrl,
                version: agent.version,
                category: agent.category,
                tags: agent.tags,
                capabilities: agent.capabilities,
                modelSupport: agent.modelSupport,
                pricing: agent.pricing || undefined,
                activeUsers: agent.activeUsers,
                taskCompleteRate: agent.taskCompleteRate,
                avgRating: agent.avgRating,
                icon: agent.icon,
                website: agent.website,
                source: agent.source,
                sourceId: agent.sourceId,
                sourceUrl: agent.sourceUrl,
                lastSyncedAt: new Date(),
                lastUpdated: new Date(),
              },
            });
            totalCreated++;
          }
        } catch (itemError) {
          totalFailed++;
          errors.push(`[write] ${agent.name}: ${itemError instanceof Error ? itemError.message : String(itemError)}`);
        }
      }

      writePhase.status = 'completed';
      writePhase.stats = { fetched: dedupedAgents.length, created: totalCreated, updated: totalUpdated, skipped: totalSkipped, failed: totalFailed };
    } catch (error) {
      writePhase.status = 'failed';
      writePhase.errors = [error instanceof Error ? error.message : String(error)];
    }

    writePhase.completedAt = new Date();
    phases.push(writePhase);
  }

  return {
    success: errors.length === 0 || totalCreated + totalUpdated > 0,
    entityType: 'agent',
    phases,
    stats: { totalFetched, totalCreated, totalUpdated, totalSkipped, totalFailed, duration: Date.now() - startTime.getTime() },
    errors,
    startedAt: startTime,
    completedAt: new Date(),
  };
}

/**
 * 按 sourceId 去重，保留高优先级数据
 */
function deduplicateByPriority<T extends { source: string; sourceId: string }>(
  items: T[],
  entityType: 'skill' | 'mcp' | 'agent'
): T[] {
  const priorityMap = SOURCE_PRIORITY[entityType];
  const seen = new Map<string, T>();

  for (const item of items) {
    const key = `${item.source}:${item.sourceId}`;
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, item);
    } else {
      const existingPriority = priorityMap[existing.source] ?? 99;
      const newPriority = priorityMap[item.source] ?? 99;

      if (newPriority < existingPriority) {
        seen.set(key, item);
      }
    }
  }

  return Array.from(seen.values());
}
