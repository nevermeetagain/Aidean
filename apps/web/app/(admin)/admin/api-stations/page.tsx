import { ApiStationManager } from "../../../../components/admin/ApiStationManager";

export const dynamic = "force-dynamic";

export default function AdminApiStationsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">API 站点管理</h1>
        <p className="mt-1 text-xs text-slate-500">
          管理模型 API 站点、平台 Key 池、计费规则。Key 值加密存储，列表仅显示脱敏版本。
        </p>
      </div>
      <ApiStationManager />
    </div>
  );
}
