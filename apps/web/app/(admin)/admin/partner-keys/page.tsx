import { PartnerKeysManager } from "@/components/admin/PartnerKeysManager";

export const dynamic = "force-dynamic";

export default function PartnerKeysPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-xl font-semibold text-slate-800">卡商密钥</h1>
      <PartnerKeysManager />
    </div>
  );
}
