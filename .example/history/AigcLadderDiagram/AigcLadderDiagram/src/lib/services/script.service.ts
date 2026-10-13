/**
 * 任务脚本服务 - 任务管理/脚本执行/数据库备份
 */

import { prisma } from "@/lib/db/prisma";

export const scriptService = {
  // 任务管理
  async getTaskList(params?: { page?: number; limit?: number; status?: number }) {
    const { page = 1, limit = 20, status } = params || {};
    const skip = (page - 1) * limit;
    
    const where = status !== undefined ? { status } : {};
    
    const [items, total] = await Promise.all([
      prisma.scheduledScript.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          executions: {
            orderBy: { startedAt: "desc" },
            take: 5,
          },
        },
      }),
      prisma.scheduledScript.count({ where }),
    ]);
    
    return { items, total, page, limit };
  },

  // 脚本执行日志
  async getExecutionLogs(scriptId: string, params?: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;
    
    const where = { scriptId };
    
    const [items, total] = await Promise.all([
      prisma.scriptExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startedAt: "desc" },
      }),
      prisma.scriptExecution.count({ where }),
    ]);
    
    return { items, total, page, limit };
  },

  // 数据库备份列表（模拟数据）
  async getBackupList() {
    // 实际实现需要集成备份系统
    return {
      items: [],
      total: 0,
      message: "数据库备份功能需集成备份系统",
    };
  },
};
