// /admin/capabilities —— 能力矩阵。
import { CapabilityMatrix } from "../../../../components/admin/CapabilityMatrix";

export const dynamic = "force-dynamic";

export default function AdminCapabilitiesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">能力矩阵</h1>
        <p className="mt-1 text-xs text-slate-500">
          各模型的能力支持矩阵：function calling、vision、reasoning、structured output 等。
        </p>
      </div>
      <CapabilityMatrix />
    </div>
  );
}
