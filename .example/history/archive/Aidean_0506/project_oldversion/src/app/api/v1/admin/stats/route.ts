import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse } from "@/lib/api/response";

export async function GET() {
  try {
    // 获取总数统计
    const [userCount, modelCount, skillCount, mcpCount, agentCount, transactionCount, evaluationCount] = await Promise.all([
      prisma.user.count(),
      prisma.aiModel.count(),
      prisma.skill.count(),
      prisma.mCPServer.count(),
      prisma.agent.count(),
      prisma.transaction.count(),
      prisma.evaluation.count(),
    ]);

    // 获取最近7天的趋势数据（模拟或真实查询）
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    // 查询每日新增用户数
    const userTrends = await Promise.all(
      last7Days.map(async (date) => {
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        const count = await prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(date),
              lt: nextDate,
            },
          },
        });
        return count;
      })
    );

    // 从AuditLog表查询真实访问趋势（按日期分组统计操作次数）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    // 查询每天的审计日志数量作为访问趋势
    const auditLogs = await prisma.auditLog.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      _count: {
        id: true,
      },
    });
    
    // 格式化访问趋势数据
    const visitTrends = last7Days.map((dateStr) => {
      // 查找该日期的统计数据
      const dayLogs = auditLogs.filter(log => {
        const logDate = new Date(log.createdAt).toISOString().split('T')[0];
        return logDate === dateStr;
      });
      
      const count = dayLogs.reduce((sum, log) => sum + (log._count?.id || 0), 0);
      return count;
    });
    
    // 点击趋势：统计用户操作（UPDATE操作视为点击/交互）
    const clickLogs = await prisma.auditLog.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
        action: 2, // UPDATE操作
      },
      _count: {
        id: true,
      },
    });
    
    const clickTrends = last7Days.map((dateStr) => {
      const dayLogs = clickLogs.filter(log => {
        const logDate = new Date(log.createdAt).toISOString().split('T')[0];
        return logDate === dateStr;
      });
      
      const count = dayLogs.reduce((sum, log) => sum + (log._count?.id || 0), 0);
      return count;
    });

    return successResponse({
      users: { total: userCount, today: userTrends[6] },
      models: { total: modelCount },
      tools: {
        total: skillCount + mcpCount + agentCount,
        skills: skillCount,
        mcps: mcpCount,
        agents: agentCount,
      },
      transactions: { total: transactionCount },
      evaluations: { total: evaluationCount },
      trends: {
        dates: last7Days,
        visits: visitTrends,
        users: userTrends,
        clicks: clickTrends,
      },
    });
  } catch (error) {
    console.error("[Stats API Error]", error);
    return NextResponse.json(
      { success: false, message: "获取统计数据失败" },
      { status: 500 }
    );
  }
}
