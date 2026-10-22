// /admin/capabilities —— 兼容矩阵（UX-26 裁定 8：能力矩阵 + 协议矩阵合并为一页两 Tab）。
// ?tab=capability（默认）| protocol 深链；旧路由 /admin/protocols 保留为重定向到 ?tab=protocol。
import { AdminPageTabs, resolveAdminTab } from "../../../../components/admin/AdminPageTabs";
import { CapabilityMatrix } from "../../../../components/admin/CapabilityMatrix";
import { ProtocolMatrix } from "../../../../components/admin/ProtocolMatrix";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "capability", label: "能力矩阵" },
  { key: "protocol", label: "协议矩阵" },
] as const;

const INTRO: Record<string, string> = {
  capability: "各模型的能力支持情况：函数调用、视觉理解、推理、结构化输出等。",
  protocol: "各平台 / 模型对 OpenAI、Anthropic、Gemini 等协议的兼容性探测结果。",
};

export default async function AdminCompatMatrixPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const tab = resolveAdminTab(sp.tab, TABS);
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">兼容矩阵</h1>
        <p className="mt-1 text-xs text-slate-500">{INTRO[tab]}</p>
      </div>
      <AdminPageTabs basePath="/admin/capabilities" tabs={TABS} current={tab} label="兼容矩阵" testId="admin-compat-tabs" />
      {tab === "protocol" ? <ProtocolMatrix /> : <CapabilityMatrix />}
    </div>
  );
}
