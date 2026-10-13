/**
 * 消息推送服务 - 通知管理/推送记录/用户订阅
 */

import { prisma } from "@/lib/db/prisma";

export const notificationService = {
  // 用户通知列表
  async getNotificationList(params?: { page?: number; limit?: number; userId?: string }) {
    const { page = 1, limit = 20, userId } = params || {};
    const skip = (page - 1) * limit;
    
    const where = userId ? { userId } : {};
    
    const [items, total] = await Promise.all([
      prisma.userNotification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.userNotification.count({ where }),
    ]);
    
    return { items, total, page, limit };
  },

  // 用户推送设置（按事件类型查询）
  async getUserNotificationSettings(userId: string, eventType: string = "task_completed") {
    const settings = await prisma.notificationSetting.findUnique({
      where: { 
        userId_eventType: { userId, eventType }
      },
    });
    
    return settings || {
      enabled: true,
      channels: ["web"],
    };
  },

  // 系统消息统计
  async getNotificationStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [total, unread, todayCount] = await Promise.all([
      prisma.userNotification.count(),
      prisma.userNotification.count({ where: { isRead: false } }),
      prisma.userNotification.count({
        where: {
          createdAt: { gte: today },
        },
      }),
    ]);
    
    return { total, unread, today: todayCount };
  },
};
