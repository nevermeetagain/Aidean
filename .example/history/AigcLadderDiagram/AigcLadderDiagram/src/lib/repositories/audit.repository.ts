import { prisma } from "@/lib/db/prisma";
import { BaseRepository } from "./base.repository";
import type { AuditLog } from "@prisma/client";

export class AuditLogRepository extends BaseRepository<AuditLog> {
  protected model = prisma.auditLog;

  async findByUser(userId: string): Promise<AuditLog[]> {
    return this.model.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findRecent(days: number = 7): Promise<AuditLog[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return this.model.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: "desc" },
    });
  }

  async countByAction(days: number = 30): Promise<{ action: unknown; count: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const result = await this.model.groupBy({
      by: ["action"],
      where: { createdAt: { gte: startDate } },
      _count: { id: true },
    });
    return result.map((r) => ({ action: r.action, count: r._count.id }));
  }

  async cleanupBefore(date: Date): Promise<number> {
    const result = await this.model.deleteMany({
      where: { createdAt: { lt: date } },
    });
    return result.count;
  }
}

export const auditLogRepository = new AuditLogRepository();

