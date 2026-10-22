/**
 * 公告读模型（S7.4「公告消费闭环」）：仅服务端引用（prisma node-only）。
 *
 * 前台口径：仅展示「已发布 + 启用 + 未删除 + 未过期」的公告；
 * 排序 isPinned desc → priority desc → publishedAt desc（置顶/高优先恒在前）。
 * 与后台 /admin/announcements（全量含草稿/停用）刻意不同，避免未发布内容泄露到前台。
 * 失败口径（UX-03）：listActiveAnnouncements 不再吞错——DB 失败向上抛出，由 /announcements 页面
 * 区分「加载失败」与「确实无公告」；首页横幅 pickBannerAnnouncement 仍保持非侵入（失败 → null）。
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

/** 前台有效公告列表；DB 失败 → 抛错（调用方负责区分失败态与空态，失败永不伪装成空）。 */
export async function listActiveAnnouncements(now: Date = new Date()): Promise<ActiveAnnouncement[]> {
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
}

/** 页面读模型：成功（含空列表）与失败显式区分。 */
export type AnnouncementsLoadResult =
  | { ok: true; items: ActiveAnnouncement[] }
  | { ok: false; error: string };

export async function loadActiveAnnouncements(now: Date = new Date()): Promise<AnnouncementsLoadResult> {
  try {
    return { ok: true, items: await listActiveAnnouncements(now) };
  } catch (error) {
    console.error("[announcements] 公告读取失败：", error);
    return { ok: false, error: "公告加载失败，请稍后重试" };
  }
}

/** 首页横幅取首条有效公告（无则 null）；横幅为非侵入装饰位，读取失败同样回落 null，不阻断首页。 */
export async function pickBannerAnnouncement(now: Date = new Date()): Promise<ActiveAnnouncement | null> {
  const res = await loadActiveAnnouncements(now);
  return res.ok ? (res.items[0] ?? null) : null;
}
