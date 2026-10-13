/**
 * 系统Service
 * 系统管理业务逻辑层 - 健康检查、公告、配置
 */

import { prisma } from '@/lib/db/prisma';
import redis from '@/lib/redis';

class SystemService {
  /**
   * 健康检查
   */
  async healthCheck() {
    const checks: Record<string, string> = {};

    // 数据库检查
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    // Redis检查
    try {
      if (redis) {
        await (redis as any).ping();
        checks.redis = 'ok';
      } else {
        checks.redis = 'unavailable';
      }
    } catch {
      checks.redis = 'error';
    }

    const allOk = Object.values(checks).every(v => v === 'ok' || v === 'unavailable');

    return {
      status: allOk ? 'healthy' : 'degraded',
      version: process.env.npm_package_version || '0.1.0',
      uptime: process.uptime(),
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取系统统计
   */
  async getStats() {
    const [userCount, modelCount, vendorCount] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.aiModel.count({ where: { deletedAt: null } }),
      prisma.vendor.count({ where: { deletedAt: null } }),
    ]);

    return {
      users: userCount,
      models: modelCount,
      vendors: vendorCount,
    };
  }

  /**
   * 获取公告列表
   */
  async getAnnouncements(options: { limit?: number } = {}) {
    const { limit = 10 } = options;
    const news = await prisma.newsync.findMany({
      where: { source: 'announcement' },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
    return news;
  }

  /**
   * 获取公开系统配置（平台名、描述等）
   */
  async getPublicConfig(group?: string) {
    const where: any = { isPublic: true };
    if (group) where.configGroup = group;

    const configs = await (prisma as any).systemConfig.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      select: {
        configKey: true,
        configGroup: true,
        configValue: true,
        configValueEn: true,
        configType: true,
        description: true,
      },
    });

    const map: Record<string, { value: string; valueEn?: string; type: string; description?: string }> = {};
    for (const c of configs) {
      map[c.configKey] = {
        value: c.configValue,
        valueEn: c.configValueEn ?? undefined,
        type: c.configType,
        description: c.description ?? undefined,
      };
    }
    return map;
  }
}

export const systemService = new SystemService();
