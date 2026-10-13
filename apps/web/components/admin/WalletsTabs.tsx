"use client";

/**
 * WalletsTabs — 钱包工作区页签容器（S5 / M6）。
 *
 * 「钱包列表」（WalletsManager：余额/状态/冻结/调账）与「在途冻结」（HoldsPanel：BalanceHold 只读分页）
 * 两视图共用一页；缺省落在钱包列表，保持原 /admin/wallets 行为不倒退。纯前端页签态，不改后端。
 */

import { useState } from "react";
import { Button } from "@aidean/ui";
import { WalletsManager } from "./WalletsManager";
import { HoldsPanel } from "./HoldsPanel";

type Tab = "wallets" | "holds";

const TABS: { value: Tab; label: string }[] = [
  { value: "wallets", label: "钱包列表" },
  { value: "holds", label: "在途冻结" },
];

export function WalletsTabs() {
  const [tab, setTab] = useState<Tab>("wallets");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {TABS.map((t) => (
          <Button
            key={t.value}
            variant={tab === t.value ? "primary" : "outline"}
            size="sm"
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      {tab === "wallets" ? <WalletsManager /> : <HoldsPanel />}
    </div>
  );
}
