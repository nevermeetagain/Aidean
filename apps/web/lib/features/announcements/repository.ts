/**
 * 公告读模型（S7.4「公告消费闭环」）：仅服务端引用（prisma node-only）。
 *
 * 前台口径：仅展示「已发布 + 启用 + 未删除 + 未过期」的公告；
 * 排序 isPinned desc → priority desc → publishedAt desc（置顶/高优先恒在前）。
 * 与后台 /admin/announcements（全量含草稿/停用）刻意不同，避免未发布内容泄露到前台。
 * DB 不可用时静默返回空数组，不阻断页面渲染（非侵入）。
 */
export interface ActiveAnnouncement {
  id: string;
  title: string;
  content: string;
  type: string;
  isPinned: boolean;
  date: string;
}

/** 是否仍在有效期（无过期时间视为长期有效；过期时间已过视为失效）。 */
export function isStillActive(expiredAt: Date | null, now: Date): boolean {
  return !expiredAt || expiredAt.getTime() > now.getTime();
}

function toCard(r: {
  id: string;
  title: string;
  content: string;
  type: string;
  isPinned: boolean;
  publishedAt: Date | null;
  createdAt: Date;
}): ActiveAnnouncement {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    type: r.type,
    isPinned: r.isPinned,
    date: (r.publishedAt ?? r.createdAt).toISOString().slice(0, 10),
  };
}

/** 前台有效公告列表；DB 失败 → 空数组（不阻断渲染）。 */
export async function listActiveAnnouncements(now: Date = new Date()): Promise<ActiveAnnouncement[]> {
  try {
    const { prisma } = await import("../../db/prisma");
    const rows = await prisma.announcement.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
        isActive: true,
        OR: [{ expiredAt: null }, { expiredAt: { gt: now } }],
      },
      orderBy: [{ isPinned: "desc" }, { priority: "desc" }, { publishedAt: "desc" }],
    });
    return rows.map(toCard);
  } catch {
    return [];
  }
}

/** 首页横幅取首条有效公告（无则 null）。 */
export async function pickBannerAnnouncement(now: Date = new Date()): Promise<ActiveAnnouncement | null> {
  const list = await listActiveAnnouncements(now);
  return list[0] ?? null;
}
