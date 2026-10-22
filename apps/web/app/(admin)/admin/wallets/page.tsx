// /admin/wallets —— 钱包工作区（R-10 修复：页面入口缺失；S5 增「在途冻结」只读页签）。
import { WalletsTabs } from "../../../../components/admin/WalletsTabs";

export const dynamic = "force-dynamic";

export default function AdminWalletsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">钱包管理</h1>
        <p className="mt-1 text-xs text-slate-500">
          「钱包列表」查看余额与状态、冻结/解冻及调账（调账写审计日志 + 幂等键）；「在途冻结」按状态分页只读查看预扣款（不含释放/捕获等资金写操作）。
        </p>
      </div>
      <WalletsTabs />
    </div>
  );
}
