import { prisma } from "@/lib/db/prisma";
import { BaseRepository } from "./base.repository";
import type { UserNotification } from "@prisma/client";

// 用户通知Repository
export class UserNotificationRepository extends BaseRepository<UserNotification> {
  protected model = prisma.userNotification;

  async findByUserId(userId: string) {
    return this.model.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findUnreadByUserId(userId: string) {
    return this.model.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: "desc" },
    });
  }

  async markAsRead(id: string) {
    return this.model.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }
}

