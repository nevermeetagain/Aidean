// /admin/models —— 模型管理（SubTask 2.2.2）。
// 首屏性能：服务端预取第一页（与分页 API 共用 listAdminModels 真源），透传给 ModelsTable，
// 消除「RSC 空壳到手 → 客户端再发一次列表 API」的第二段往返。预取失败则降级为无 initialData，
// ModelsTable 自动回退到原客户端拉取路径（不因预取异常而白屏）。鉴权由 middleware + (admin)/layout 保障。
import { ModelsTable } from "../../../../components/admin/ModelsTable";
import { listAdminModels, type AdminModelListResult } from "../../../../lib/features/admin/model-list";

export const dynamic = "force-dynamic";

export default async function AdminModelsPage() {
  let initialData: AdminModelListResult | undefined;
  try {
    // 参数需与 ModelsTable 初始态一致（page=1 / pageSize=20 / 无搜索），否则首屏会闪烁或触发多余重拉。
    initialData = await listAdminModels({ page: 1, pageSize: 20 });
  } catch (err) {
    console.warn("[admin/models] 首屏预取失败，回退客户端拉取：", err);
  }
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">模型管理</h1>
        <p className="mt-1 text-xs text-slate-500">
          上下架（isActive）即时影响前台 /models；visibility 控制可见层级；isFeatured 与 sortOrder 影响推荐与排序。
        </p>
      </div>
      <ModelsTable initialData={initialData} />
    </div>
  );
}
