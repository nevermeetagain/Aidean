// /admin/protocols —— 协议兼容性矩阵。
import { ProtocolMatrix } from "../../../../components/admin/ProtocolMatrix";

export const dynamic = "force-dynamic";

export default function AdminProtocolsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">协议兼容性矩阵</h1>
        <p className="mt-1 text-xs text-slate-500">
          各平台/模型对 OpenAI、Anthropic、Gemini 等协议的兼容性探测结果。
        </p>
      </div>
      <ProtocolMatrix />
    </div>
  );
}
