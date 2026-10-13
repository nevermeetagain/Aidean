/**
 * 工具同步调度器 (Tool Sync Scheduler)
 * 管理 Skills/MCP/Agent 的定时同步任务
 * 
 * 功能：
 * 1. 注册三类同步脚本到 ScheduledScript 表
 * 2. 基于 setInterval 实现定时轮询（无需 node-cron 依赖）
 * 3. 支持手动触发、启停控制
 * 4. 防止重复执行（锁机制）
 * 5. 记录执行结果到 ScriptExecution 表
 */

import { prisma } from "@/lib/db/prisma";
import { executeSkillsSync, executeMCPSync, executeAgentSync } from "./tool-sync-orchestrator";

// 同步任务类型
type ToolEntityType = "skill" | "mcp" | "agent";

// 同步任务配置
interface ToolSyncJobConfig {
  entityType: ToolEntityType;
  name: string;
  scriptPath: string;
  cronExpression: string;
  description: string;
  defaultSources: string[];
}

// 预定义的同步任务
const TOOL_SYNC_JOBS: ToolSyncJobConfig[] = [
  {
    entityType: "skill",
    name: "Skills 每日同步",
    scriptPath: "scripts/crawl/crawl_skills.ts",
    cronExpression: "0 2 * * *", // 每天凌晨2点
    description: "从 SkillsMP/Smithery/Skills.sh 同步 Skills 数据",
    defaultSources: ["skillsmp", "smithery", "skills_sh"],
  },
  {
    entityType: "mcp",
    name: "MCP 每日同步",
    scriptPath: "scripts/crawl/crawl_mcp.ts",
    cronExpression: "30 2 * * *", // 每天凌晨2:30
    description: "从 Smithery/Glama 同步 MCP Server 数据",
    defaultSources: ["smithery", "glama"],
  },
  {
    entityType: "agent",
    name: "Agent 每日同步",
    scriptPath: "scripts/crawl/crawl_agents.ts",
    cronExpression: "0 3 * * *", // 每天凌晨3点
    description: "从 AgentIndex/Agents.sh 同步 Agent 数据",
    defaultSources: ["agentindex", "agents_sh"],
  },
];

// 调度器状态
interface ToolSchedulerState {
  isRunning: boolean;
  runningJobs: Set<ToolEntityType>;
  timers: Map<ToolEntityType, NodeJS.Timeout>;
  lastRunAt: Map<ToolEntityType, Date>;
}

const state: ToolSchedulerState = {
  isRunning: false,
  runningJobs: new Set(),
  timers: new Map(),
  lastRunAt: new Map(),
};

/**
 * 注册同步脚本到 ScheduledScript 表
 * 如果已存在则跳过
 */
export async function registerToolSyncScripts(): Promise<void> {
  for (const job of TOOL_SYNC_JOBS) {
    const existing = await prisma.scheduledScript.findFirst({
      where: { name: job.name },
    });

    if (!existing) {
      await prisma.scheduledScript.create({
        data: {
          name: job.name,
          scriptPath: job.scriptPath,
          params: { entityType: job.entityType, sources: job.defaultSources },
          cronExpression: job.cronExpression,
          status: 1,
          isActive: true,
        },
      });
      console.log(`[ToolScheduler] Registered: ${job.name}`);
    } else {
      console.log(`[ToolScheduler] Already registered: ${job.name}`);
    }
  }
}

/**
 * 执行单个同步任务
 */
async function runToolSync(
  entityType: ToolEntityType,
  sources?: string[]
): Promise<void> {
  if (state.runningJobs.has(entityType)) {
    console.log(`[ToolScheduler] ${entityType} sync already running, skipping`);
    return;
  }

  const jobConfig = TOOL_SYNC_JOBS.find((j) => j.entityType === entityType);
  if (!jobConfig) return;

  state.runningJobs.add(entityType);
  const startedAt = new Date();

  // 查找对应的 ScheduledScript 记录
  const scriptRecord = await prisma.scheduledScript.findFirst({
    where: { name: jobConfig.name },
  });

  // 创建执行记录
  const execution = scriptRecord
    ? await prisma.scriptExecution.create({
        data: {
          scriptId: scriptRecord.id,
          status: 0, // 0:执行中
          startedAt,
        },
      })
    : null;

  console.log(`[ToolScheduler] Starting ${entityType} sync...`);

  try {
    const targetSources = sources || jobConfig.defaultSources;
    let result;

    switch (entityType) {
      case "skill":
        result = await executeSkillsSync({ entityType: 'skill', sources: targetSources });
        break;
      case "mcp":
        result = await executeMCPSync({ entityType: 'mcp', sources: targetSources });
        break;
      case "agent":
        result = await executeAgentSync({ entityType: 'agent', sources: targetSources });
        break;
    }

    const completedAt = new Date();

    // 更新执行记录
    if (execution) {
      await prisma.scriptExecution.update({
        where: { id: execution.id },
        data: {
          status: result.success ? 1 : 2, // 1=成功, 2=失败
          finishedAt: completedAt,
          durationMs: completedAt.getTime() - startedAt.getTime(),
          output: JSON.stringify(result),
          errorMsg: result.success ? null : (result.errors || []).join("; "),
        },
      });
    }

    state.lastRunAt.set(entityType, startedAt);
    console.log(
      `[ToolScheduler] ${entityType} sync ${result.success ? "completed" : "failed"} in ${completedAt.getTime() - startedAt.getTime()}ms`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ToolScheduler] ${entityType} sync error:`, errorMessage);

    if (execution) {
      await prisma.scriptExecution.update({
        where: { id: execution.id },
        data: {
          status: 2, // 失败
          finishedAt: new Date(),
          durationMs: new Date().getTime() - startedAt.getTime(),
          errorMsg: errorMessage,
        },
      });
    }
  } finally {
    state.runningJobs.delete(entityType);
  }
}

/**
 * 手动触发同步
 */
export async function triggerToolSync(
  entityType: ToolEntityType,
  sources?: string[]
): Promise<{ success: boolean; message: string }> {
  if (state.runningJobs.has(entityType)) {
    return { success: false, message: `${entityType} 同步正在运行中` };
  }

  // 异步执行，不阻塞调用者
  runToolSync(entityType, sources).catch((err) => {
    console.error(`[ToolScheduler] triggerToolSync error:`, err);
  });

  return { success: true, message: `${entityType} 同步已触发` };
}

/**
 * 启动定时轮询调度器
 * 使用 setInterval 模拟 cron（每60秒检查一次）
 */
export function startToolScheduler(): void {
  if (state.isRunning) {
    console.log("[ToolScheduler] Already running");
    return;
  }

  state.isRunning = true;
  console.log("[ToolScheduler] Started - checking every 60s");

  const timer = setInterval(async () => {
    await checkAndRunScheduledScripts();
  }, 60 * 1000); // 60秒检查一次

  // 存储全局定时器
  state.timers.set("_checkInterval" as ToolEntityType, timer);
}

/**
 * 停止调度器
 */
export function stopToolScheduler(): void {
  state.isRunning = false;
  for (const timer of state.timers.values()) {
    clearInterval(timer);
  }
  state.timers.clear();
  console.log("[ToolScheduler] Stopped");
}

/**
 * 检查并执行到期的定时脚本
 */
async function checkAndRunScheduledScripts(): Promise<void> {
  const now = new Date();
  const activeScripts = await prisma.scheduledScript.findMany({
    where: { isActive: true, status: 1 },
  });

  for (const script of activeScripts) {
    const params = script.params as any;
    const entityType = params?.entityType as ToolEntityType | undefined;
    if (!entityType) continue;

    // 检查是否在运行中
    if (state.runningJobs.has(entityType)) continue;

    // 检查上次执行时间
    const lastExecution = await prisma.scriptExecution.findFirst({
      where: { scriptId: script.id, status: { in: [2, 3] } },
      orderBy: { startedAt: "desc" },
    });

    if (lastExecution) {
      const lastRun = new Date(lastExecution.startedAt);
      const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);

      // 简单规则：距上次运行超过24小时才执行
      if (hoursSinceLastRun < 24) continue;
    }

    // 执行同步
    console.log(`[ToolScheduler] Running scheduled: ${script.name}`);
    runToolSync(entityType, params?.sources).catch((err) => {
      console.error(`[ToolScheduler] Scheduled run error:`, err);
    });
  }
}

/**
 * 获取调度器状态
 */
export function getToolSchedulerStatus() {
  return {
    isRunning: state.isRunning,
    runningJobs: Array.from(state.runningJobs),
    lastRunAt: Object.fromEntries(state.lastRunAt),
  };
}

export default {
  register: registerToolSyncScripts,
  start: startToolScheduler,
  stop: stopToolScheduler,
  trigger: triggerToolSync,
  getStatus: getToolSchedulerStatus,
};
