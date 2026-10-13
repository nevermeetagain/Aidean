import { PrismaClient } from "@prisma/client";

/**
 * 最简 Prisma 单例：dev 热重载复用全局实例，避免连接数膨胀。
 *
 * 导航性能优化（2026-09-28）：
 * 显式传入 connect_timeout=3 与 pool_timeout=3，避免 DB 不可用时
 * Prisma 默认 10s 超时拖慢页面渲染（虽本地 Connection refused 为即时失败，
 * 但生产环境 DB 响应慢时 3s 超时能快速降级到 fallback 数据）。
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prismaOptions = {
  datasources: {
    db: {
      // connect_timeout 单位为秒；pool_timeout 同理。
      // 仅在 DATABASE_URL 未自带参数时追加，避免覆盖用户自定义参数。
      url:
        process.env.DATABASE_URL?.includes("?")
          ? process.env.DATABASE_URL
          : `${process.env.DATABASE_URL}?connect_timeout=3&pool_timeout=3`,
    },
  },
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
