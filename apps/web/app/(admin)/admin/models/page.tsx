// /admin/models —— 模型管理（SubTask 2.2.2）。
// 首屏性能：服务端预取当前页（与分页 API 共用 listAdminModels 真源），透传给 ModelsTable，
// 消除「RSC 空壳到手 → 客户端再发一次列表 API」的第二段往返。预取失败则降级为无 initialData，
// ModelsTable 自动回退到原客户端拉取路径（不因预取异常而白屏）。鉴权由 middleware + (admin)/layout 保障。
// UX-23：?page= / ?q= 由此解析为初值（预取与客户端初态同参），客户端翻页/搜索再回写 URL，刷新保持。
import { ModelsTable } from "../../../../components/admin/ModelsTable";
import { parsePageParam, pickParam } from "../../../../components/admin/url-query";
import { listAdminModels, type AdminModelListResult } from "../../../../lib/features/admin/model-list";

export const dynamic = "force-dynamic";

export default async function AdminModelsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const page = parsePageParam(pickParam(sp, "page"));
  const q = pickParam(sp, "q").trim().slice(0, 100);
  let initialData: AdminModelListResult | undefined;
  try {
    // 参数需与 ModelsTable 初始态一致（page / pageSize=20 / q），否则首屏会闪烁或触发多余重拉。
    initialData = await listAdminModels({ page, pageSize: 20, ...(q ? { q } : {}) });
  } catch (err) {
    console.warn("[admin/models] 首屏预取失败，回退客户端拉取：", err);
  }
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">模型管理</h1>
        <p className="mt-1 text-xs text-slate-500">
          「上架」开关即时影响前台模型库；「可见性」控制谁能看到该模型；「推荐」与「排序」影响前台推荐位与排列顺序。
        </p>
      </div>
      <ModelsTable initialData={initialData} initialPage={page} initialQuery={q} />
    </div>
  );
}
