import { AnnouncementManager } from "../../../../components/admin/AnnouncementManager";

export const dynamic = "force-dynamic";

export default function AdminAnnouncementsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">公告管理</h1>
        <p className="mt-1 text-xs text-slate-500">
          管理系统公告、维护通知、更新公告和推广信息。支持置顶、定时过期和定向角色推送。
        </p>
      </div>
      <AnnouncementManager />
    </div>
  );
}
