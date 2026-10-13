// /admin/tier-mappings —— 用户模型等级映射管理（#18 L4）。
import { TierMappingsManager } from "../../../../components/admin/TierMappingsManager";

export const dynamic = "force-dynamic";

export default function AdminTierMappingsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">等级映射</h1>
        <p className="mt-1 text-xs text-slate-500">
          用户模型四档绑定（OPUS/SONNET/FABLE/HAIKU）；网关按此映射决定路由优先级。
        </p>
      </div>
      <TierMappingsManager />
    </div>
  );
}
