/**
 * 内容管理服务 - 资讯/文档/公告/API文档
 */

import { prisma } from "@/lib/db/prisma";

export const contentService = {
  // 资讯管理
  async getNewsList(params?: { page?: number; limit?: number; source?: string }) {
    const { page = 1, limit = 20, source } = params || {};
    const skip = (page - 1) * limit;
    
    const where = source ? { source } : {};
    
    const [items, total] = await Promise.all([
      prisma.newsync.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.newsync.count({ where }),
    ]);
    
    return { items, total, page, limit };
  },

  // 帮助文档管理
  async getDocsList(params?: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      prisma.document.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.document.count(),
    ]);
    
    return { items, total, page, limit };
  },

  // 公告管理（使用SystemConfig存储公告配置）
  async getAnnouncements(params?: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;
    
    // 从SystemConfig获取公告配置
    const config = await prisma.systemConfig.findUnique({
      where: { configKey: "announcements" },
    });
    
    const items = config?.configValue ? JSON.parse(config.configValue as string) : [];
    const total = items.length;
    
    return { 
      items: items.slice(skip, skip + limit), 
      total, 
      page, 
      limit 
    };
  },
};
